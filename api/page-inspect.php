<?php
require __DIR__.'/common.php';

const SWU_PAGE_FETCH_LIMIT = 1048576;
const SWU_PAGE_REDIRECT_LIMIT = 3;
const SWU_OG_IMAGE_FETCH_LIMIT = 524288;

rate_limit('page-inspect', 20, 60);
$url=normalize_url($_GET['url'] ?? '');
$mode=$_GET['mode'] ?? 'meta';
if(!in_array($mode,['meta','og'],true)) out(['error'=>'Unsupported inspection mode.'],400);

function first_text(DOMXPath $x,string $q): ?string {
  $n=$x->query($q)->item(0);
  return $n ? trim((string)$n->nodeValue) : null;
}
function node_values(DOMXPath $x,string $q): array {
  $values=[];
  foreach($x->query($q) ?: [] as $n) $values[]=trim((string)$n->nodeValue);
  return $values;
}
function meta_contents(DOMXPath $x,string $attr,string $value,bool $headOnly=false): array {
  $root=$headOnly?'//head/':'//';
  $q=$root.'meta[translate(@'.$attr.',"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="'.strtolower($value).'"]/@content';
  return node_values($x,$q);
}
function meta_content(DOMXPath $x,string $attr,string $value,bool $headOnly=false): ?string {
  $values=meta_contents($x,$attr,$value,$headOnly);
  return $values[0] ?? null;
}
function text_length(?string $value): ?int {
  if($value===null) return null;
  return function_exists('mb_strlen') ? mb_strlen($value,'UTF-8') : strlen($value);
}
function directive_has_noindex(?string $value): bool {
  if($value===null || trim($value)==='') return false;
  $tokens=preg_split('/[\s,]+/',strtolower(trim($value))) ?: [];
  return in_array('noindex',$tokens,true) || in_array('none',$tokens,true);
}
function fetch_with_redirects(string $url,int $maxBytes=SWU_PAGE_FETCH_LIMIT,int $limit=SWU_PAGE_REDIRECT_LIMIT,string $label='Page'): array {
  $current=normalize_url($url);
  $redirects=[];
  for($hop=0;$hop<=$limit;$hop++){
    $response=curl_body($current,$maxBytes);
    $status=(int)$response['status'];
    if($status>=300 && $status<400){
      $location=trim((string)($response['headers']['location'] ?? ''));
      if($location==='') out(['error'=>$label.' redirect did not include a Location header.'],502);
      if($hop>=$limit) out(['error'=>$label.' exceeded the '.$limit.'-redirect safety limit.'],502);
      // Revalidate every redirect destination through the existing public-target SSRF gate.
      $next=normalize_url(absolute_url($current,$location));
      $redirects[]=['status'=>$status,'from'=>$current,'to'=>$next];
      $current=$next;
      continue;
    }
    $response['final_url']=$current;
    $response['redirects']=$redirects;
    return $response;
  }
  out(['error'=>$label.' redirect limit exceeded.'],502);
}
function absolute_http_url(?string $value): bool {
  if($value===null || trim($value)==='') return false;
  $p=parse_url(trim($value));
  if(!$p || empty($p['scheme']) || empty($p['host'])) return false;
  return in_array(strtolower((string)$p['scheme']),['http','https'],true);
}
function soft_public_target(string $raw): array {
  $raw=trim($raw);
  if(!absolute_http_url($raw)) return ['ok'=>false,'error'=>'URL is not an absolute HTTP(S) URL.'];
  $p=parse_url($raw);
  if(!$p || !isset($p['host'])) return ['ok'=>false,'error'=>'URL could not be parsed.'];
  if(isset($p['user']) || isset($p['pass'])) return ['ok'=>false,'error'=>'URLs with embedded credentials are not allowed.'];
  $scheme=strtolower((string)($p['scheme'] ?? ''));
  $port=(int)($p['port'] ?? ($scheme==='https'?443:80));
  if(!in_array($port,[80,443,8080,8443],true)) return ['ok'=>false,'error'=>'Only common web ports are allowed.'];

  $host=strtolower(rtrim(trim((string)$p['host']),'.'));
  if($host==='' || strlen($host)>253) return ['ok'=>false,'error'=>'Invalid hostname.'];
  $ips=[];
  if(filter_var($host,FILTER_VALIDATE_IP)){
    if(!public_ip($host)) return ['ok'=>false,'error'=>'Private or reserved image destinations are not allowed.'];
    $ips=[$host];
  } else {
    if(!preg_match('/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/i',$host)) return ['ok'=>false,'error'=>'Invalid public hostname.'];
    $records=@dns_get_record($host,DNS_A|DNS_AAAA) ?: [];
    foreach($records as $record){
      $ip=$record['ip'] ?? $record['ipv6'] ?? null;
      if($ip && public_ip($ip)) $ips[]=$ip;
    }
    $ips=array_values(array_unique($ips));
    if(!$ips) return ['ok'=>false,'error'=>'Hostname did not resolve to a public IP address.'];
  }
  return ['ok'=>true,'url'=>$raw,'host'=>$host,'ip'=>$ips[0],'port'=>$port];
}
function soft_fetch_body_once(string $url,int $maxBytes): array {
  $target=soft_public_target($url);
  if(empty($target['ok'])) return $target;

  $headers=[]; $body=''; $truncated=false;
  $ch=curl_init($target['url']);
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>false,
    CURLOPT_FOLLOWLOCATION=>false,
    CURLOPT_CONNECTTIMEOUT=>6,
    CURLOPT_TIMEOUT=>12,
    CURLOPT_USERAGENT=>'SmartWebUtility/1.0 (+https://smartwebutility.com/)',
    CURLOPT_SSL_VERIFYPEER=>true,
    CURLOPT_SSL_VERIFYHOST=>2,
    CURLOPT_RESOLVE=>[$target['host'].':'.$target['port'].':'.$target['ip']],
    CURLOPT_HEADERFUNCTION=>function($ch,$line) use (&$headers){
      $len=strlen($line); $line=trim($line);
      if($line!=='' && str_contains($line,':')){[$k,$v]=array_map('trim',explode(':',$line,2));$headers[strtolower($k)]=$v;}
      return $len;
    },
    CURLOPT_WRITEFUNCTION=>function($ch,$chunk) use (&$body,&$truncated,$maxBytes){
      $remaining=$maxBytes-strlen($body);
      if($remaining<=0){$truncated=true;return 0;}
      if(strlen($chunk)>$remaining){
        $body.=substr($chunk,0,$remaining);
        $truncated=true;
        return 0;
      }
      $body.=$chunk;
      return strlen($chunk);
    }
  ]);
  $ok=curl_exec($ch); $errno=curl_errno($ch); $err=curl_error($ch); $info=curl_getinfo($ch); curl_close($ch);
  if($ok===false && !($errno===23 && $truncated)) return ['ok'=>false,'error'=>'Request failed: '.$err];
  return [
    'ok'=>true,'url'=>$target['url'],'status'=>(int)($info['http_code']??0),
    'content_type'=>$info['content_type']??null,'headers'=>$headers,'body'=>$body,'truncated'=>$truncated
  ];
}
function soft_fetch_with_redirects(string $url,int $maxBytes,int $limit=SWU_PAGE_REDIRECT_LIMIT): array {
  $current=trim($url); $redirects=[];
  for($hop=0;$hop<=$limit;$hop++){
    $response=soft_fetch_body_once($current,$maxBytes);
    if(empty($response['ok'])) return ['ok'=>false,'error'=>$response['error'] ?? 'Image request failed.','redirects'=>$redirects];
    $status=(int)$response['status'];
    if($status>=300 && $status<400){
      $location=trim((string)($response['headers']['location'] ?? ''));
      if($location==='') return ['ok'=>false,'error'=>'Image redirect did not include a Location header.','redirects'=>$redirects];
      if($hop>=$limit) return ['ok'=>false,'error'=>'Image exceeded the '.$limit.'-redirect safety limit.','redirects'=>$redirects];
      $next=absolute_url($current,$location);
      $target=soft_public_target($next);
      if(empty($target['ok'])) return ['ok'=>false,'error'=>$target['error'] ?? 'Unsafe image redirect destination.','redirects'=>$redirects];
      $next=$target['url'];
      $redirects[]=['status'=>$status,'from'=>$current,'to'=>$next];
      $current=$next;
      continue;
    }
    $response['final_url']=$current;
    $response['redirects']=$redirects;
    return $response;
  }
  return ['ok'=>false,'error'=>'Image redirect limit exceeded.','redirects'=>$redirects];
}
function open_graph_properties(DOMXPath $x): array {
  $properties=[]; $total=0;
  foreach($x->query('//head/meta[@property]') ?: [] as $node){
    if(!($node instanceof DOMElement)) continue;
    $property=strtolower(trim($node->getAttribute('property')));
    if(!str_starts_with($property,'og:')) continue;
    $properties[$property] ??= [];
    $properties[$property][]=trim($node->getAttribute('content'));
    $total++;
  }
  return ['properties'=>$properties,'total'=>$total];
}

$r=fetch_with_redirects($url,SWU_PAGE_FETCH_LIMIT,SWU_PAGE_REDIRECT_LIMIT,'Page');
if($r['status']<200 || $r['status']>=400) out(['error'=>'Page returned HTTP '.$r['status']],502);
$html=$r['body'];

libxml_use_internal_errors(true);
$dom=new DOMDocument();
@$dom->loadHTML($html, LIBXML_NOWARNING|LIBXML_NOERROR);
$xpath=new DOMXPath($dom);

if($mode==='meta'){
  $titles=node_values($xpath,'//head/title');
  $descriptions=meta_contents($xpath,'name','description',true);
  $robotsValues=meta_contents($xpath,'name','robots',true);
  $googlebotValues=meta_contents($xpath,'name','googlebot',true);
  $viewportValues=meta_contents($xpath,'name','viewport',true);

  $canonicalExpr='contains(concat(" ",normalize-space(translate(@rel,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"))," ")," canonical ")';
  $canonicals=node_values($xpath,'//link['.$canonicalExpr.']/@href');
  $headCanonicals=node_values($xpath,'//head/link['.$canonicalExpr.']/@href');

  $title=$titles[0] ?? null;
  $description=$descriptions[0] ?? null;
  $robots=$robotsValues[0] ?? null;
  $googlebot=$googlebotValues[0] ?? null;
  $viewport=$viewportValues[0] ?? null;
  $canonical=$canonicals[0] ?? null;
  $xRobots=$r['headers']['x-robots-tag'] ?? null;
  $lang=$dom->documentElement ? trim((string)$dom->documentElement->getAttribute('lang')) : '';
  if($lang==='') $lang=null;
  $h1Count=$xpath->query('//h1')->length;
  $firstH1=first_text($xpath,'//h1');

  $noindex=directive_has_noindex($xRobots);
  foreach(array_merge($robotsValues,$googlebotValues) as $directive){
    if(directive_has_noindex($directive)){ $noindex=true; break; }
  }
  $findings=[];

  if(count($titles)===0) $findings[]='No document title was found in the HTML head.';
  elseif(count($titles)>1) $findings[]='Multiple title elements were found in the HTML head ('.count($titles).').';

  if(count($descriptions)===0) $findings[]='No meta description was found in the HTML head.';
  elseif(count($descriptions)>1) $findings[]='Multiple meta description tags were found in the HTML head ('.count($descriptions).').';

  if(count($canonicals)===0) $findings[]='No HTML canonical link was found.';
  elseif(count($canonicals)>1) $findings[]='Multiple canonical link elements were found ('.count($canonicals).').';
  if(count($canonicals)>0 && count($headCanonicals)===0) $findings[]='A canonical link was found outside the HTML head; review its placement with the Canonical Tag Checker.';

  if(count($robotsValues)>1) $findings[]='Multiple meta robots tags were found in the HTML head ('.count($robotsValues).').';
  if(count($googlebotValues)>1) $findings[]='Multiple Googlebot meta tags were found in the HTML head ('.count($googlebotValues).').';
  if($noindex) $findings[]='A direct noindex directive was detected in robots, Googlebot or X-Robots-Tag metadata.';

  if($lang===null) $findings[]='The HTML element does not declare a lang attribute.';
  if($viewport===null) $findings[]='No viewport meta tag was found in the HTML head.';
  if($h1Count===0) $findings[]='No H1 element was found in the fetched HTML.';
  if(count($r['redirects'])>0) $findings[]='The requested URL redirected '.count($r['redirects']).' time(s) before metadata was parsed.';
  if(!empty($r['truncated'])) $findings[]='The response reached this checker\'s 1 MB safety limit, so metadata after the fetched prefix may be missing.';

  out(['ok'=>true,'result'=>[
    'url'=>$url,
    'final_url'=>$r['final_url'],
    'redirect_count'=>count($r['redirects']),
    'redirects'=>$r['redirects'],
    'status'=>$r['status'],
    'content_type'=>$r['content_type'],
    'bytes_checked'=>strlen($r['body']),
    'truncated'=>(bool)$r['truncated'],
    'title'=>$title,
    'title_length'=>text_length($title),
    'title_count'=>count($titles),
    'description'=>$description,
    'description_length'=>text_length($description),
    'description_count'=>count($descriptions),
    'robots'=>$robots,
    'robots_count'=>count($robotsValues),
    'googlebot'=>$googlebot,
    'googlebot_count'=>count($googlebotValues),
    'x_robots_tag'=>$xRobots,
    'noindex_detected'=>$noindex,
    'canonical'=>$canonical,
    'canonical_count'=>count($canonicals),
    'canonical_head_count'=>count($headCanonicals),
    'html_lang'=>$lang,
    'viewport'=>$viewport,
    'h1_count'=>$h1Count,
    'first_h1'=>$firstH1,
    'findings'=>$findings
  ]]);
}

$ogScan=open_graph_properties($xpath);
$og=$ogScan['properties'];
$first=function(string $key) use ($og): ?string {
  return $og[$key][0] ?? null;
};
$data=[
  'og:title'=>$first('og:title'),
  'og:description'=>$first('og:description'),
  'og:url'=>$first('og:url'),
  'og:image'=>$first('og:image'),
  'og:type'=>$first('og:type'),
  'og:site_name'=>$first('og:site_name'),
  'og:locale'=>$first('og:locale')
];
$core=['og:title','og:type','og:image','og:url'];
$missing=[];
foreach($core as $property){
  $value=$first($property);
  if($value===null || trim($value)==='') $missing[]=$property;
}
$findings=[];
foreach($missing as $property) $findings[]='Missing required Open Graph property: '.$property.'.';
if($first('og:description')===null) $findings[]='No og:description was found; it is optional in the Open Graph protocol.';
if($first('og:url')!==null && !absolute_http_url($first('og:url'))) $findings[]='og:url is not an absolute HTTP(S) URL.';
if($first('og:image')!==null && !absolute_http_url($first('og:image'))) $findings[]='og:image is not an absolute HTTP(S) URL.';
foreach(['og:title','og:type','og:url'] as $property){
  if(count($og[$property] ?? [])>1) $findings[]='Multiple '.$property.' values were found; Open Graph consumers prefer the first tag.';
}

$outsideHead=0;
foreach($xpath->query('//body//meta[@property]') ?: [] as $node){
  if($node instanceof DOMElement && str_starts_with(strtolower(trim($node->getAttribute('property'))),'og:')) $outsideHead++;
}
if($outsideHead>0) $findings[]=$outsideHead.' Open Graph meta tag(s) were found outside the HTML head and were not used for this report.';

$imageUrl=$first('og:image');
$image=[
  'url'=>$imageUrl,
  'secure_url'=>$first('og:image:secure_url'),
  'type'=>$first('og:image:type'),
  'width'=>$first('og:image:width'),
  'height'=>$first('og:image:height'),
  'alt'=>$first('og:image:alt'),
  'probe'=>null
];
if($imageUrl!==null && trim($imageUrl)!==''){
  if($image['alt']===null || trim((string)$image['alt'])==='') $findings[]='og:image is present but og:image:alt is missing; the Open Graph protocol says an image should include alt text.';
  if(absolute_http_url($imageUrl)){
    $probe=soft_fetch_with_redirects($imageUrl,SWU_OG_IMAGE_FETCH_LIMIT,SWU_PAGE_REDIRECT_LIMIT);
    if(empty($probe['ok'])){
      $findings[]='Primary og:image could not be validated: '.($probe['error'] ?? 'request failed');
      $image['probe']=['ok'=>false,'error'=>$probe['error'] ?? 'Request failed.','redirects'=>$probe['redirects'] ?? []];
    } else {
      $dimensions=null;
      if(function_exists('getimagesizefromstring') && $probe['body']!==''){
        $info=@getimagesizefromstring($probe['body']);
        if(is_array($info)) $dimensions=['width'=>(int)$info[0],'height'=>(int)$info[1]];
      }
      $image['probe']=[
        'ok'=>true,'status'=>$probe['status'],'content_type'=>$probe['content_type'],
        'final_url'=>$probe['final_url'],'redirect_count'=>count($probe['redirects']),
        'redirects'=>$probe['redirects'],'bytes_checked'=>strlen($probe['body']),
        'truncated'=>(bool)$probe['truncated'],'dimensions'=>$dimensions
      ];
      if($probe['status']<200 || $probe['status']>=400) $findings[]='Primary og:image returned HTTP '.$probe['status'].'.';
      $contentType=strtolower((string)($probe['content_type'] ?? ''));
      if($contentType!=='' && !str_starts_with($contentType,'image/')) $findings[]='Primary og:image returned a non-image content type: '.$probe['content_type'].'.';
    }
  }
}
if(!empty($r['redirects'])) $findings[]='The requested page redirected '.count($r['redirects']).' time(s) before Open Graph tags were parsed.';
if(!empty($r['truncated'])) $findings[]='The page response reached this checker\'s 1 MB safety limit, so tags after the fetched prefix may be missing.';

out(['ok'=>true,'result'=>[
  'url'=>$url,
  'final_url'=>$r['final_url'],
  'redirect_count'=>count($r['redirects']),
  'redirects'=>$r['redirects'],
  'status'=>$r['status'],
  'content_type'=>$r['content_type'],
  'bytes_checked'=>strlen($r['body']),
  'truncated'=>(bool)$r['truncated'],
  'core_present'=>count($core)-count($missing),
  'core_required'=>count($core),
  'missing_required'=>$missing,
  'og_tag_count'=>$ogScan['total'],
  'og_property_count'=>count($og),
  'outside_head_count'=>$outsideHead,
  'open_graph'=>$data,
  'open_graph_all'=>$og,
  'primary_image'=>$image,
  'findings'=>$findings
]]);
