<?php
require __DIR__.'/common.php';

const SWU_META_FETCH_LIMIT = 1048576;
const SWU_META_REDIRECT_LIMIT = 3;

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
function fetch_meta_with_redirects(string $url): array {
  $current=normalize_url($url);
  $redirects=[];
  for($hop=0;$hop<=SWU_META_REDIRECT_LIMIT;$hop++){
    $response=curl_body($current,SWU_META_FETCH_LIMIT);
    $status=(int)$response['status'];
    if($status>=300 && $status<400){
      $location=trim((string)($response['headers']['location'] ?? ''));
      if($location==='') out(['error'=>'Page redirect did not include a Location header.'],502);
      if($hop>=SWU_META_REDIRECT_LIMIT) out(['error'=>'Page exceeded the '.SWU_META_REDIRECT_LIMIT.'-redirect safety limit.'],502);
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
  out(['error'=>'Page redirect limit exceeded.'],502);
}

$r=$mode==='meta' ? fetch_meta_with_redirects($url) : curl_body($url,SWU_META_FETCH_LIMIT);
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

$props=['og:title','og:description','og:url','og:image','og:type','og:site_name'];
$data=[];
foreach($props as $p){$data[$p]=meta_content($xpath,'property',$p);}
out(['ok'=>true,'result'=>['url'=>$url,'status'=>$r['status'],'open_graph'=>$data]]);
