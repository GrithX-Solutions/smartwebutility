<?php
declare(strict_types=1);
require __DIR__.'/common.php';

rate_limit('canonical-check', 15, 60);

function cc_fetch_follow(string $url,int $maxRedirects=5,int $maxBytes=1048576): array {
  $current=normalize_url($url);
  $chain=[];
  for($i=0;$i<=$maxRedirects;$i++){
    $r=curl_body($current,$maxBytes);
    $location=$r['headers']['location'] ?? null;
    $chain[]=['url'=>$current,'status'=>$r['status'],'location'=>$location];
    if(in_array($r['status'],[301,302,303,307,308],true) && $location && $i<$maxRedirects){
      $current=normalize_url(absolute_url($current,$location));
      continue;
    }
    return ['final_url'=>$current,'response'=>$r,'chain'=>$chain,'redirected'=>count($chain)>1];
  }
  return ['final_url'=>$current,'response'=>$r ?? null,'chain'=>$chain,'redirected'=>count($chain)>1];
}

function cc_safe_public_url(string $raw): array {
  $raw=trim($raw);
  if(!preg_match('~^https?://~i',$raw)) return ['ok'=>false,'error'=>'Canonical target is not an absolute HTTP or HTTPS URL.'];
  $p=parse_url($raw);
  if(!$p || !isset($p['host'])) return ['ok'=>false,'error'=>'Canonical target URL is malformed.'];
  $scheme=strtolower((string)($p['scheme'] ?? ''));
  if(!in_array($scheme,['http','https'],true)) return ['ok'=>false,'error'=>'Canonical target uses an unsupported URL scheme.'];
  if(isset($p['user']) || isset($p['pass'])) return ['ok'=>false,'error'=>'Canonical target contains embedded credentials.'];
  if(isset($p['port']) && !in_array((int)$p['port'],[80,443,8080,8443],true)) return ['ok'=>false,'error'=>'Canonical target uses a non-web port.'];
  $host=strtolower(rtrim((string)$p['host'],'.'));
  if($host==='') return ['ok'=>false,'error'=>'Canonical target hostname is empty.'];
  if(filter_var($host,FILTER_VALIDATE_IP)){
    if(!public_ip($host)) return ['ok'=>false,'error'=>'Canonical target resolves to a private or reserved IP address.'];
    return ['ok'=>true,'url'=>$raw];
  }
  if(!preg_match('/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i',$host)) return ['ok'=>false,'error'=>'Canonical target hostname is invalid.'];
  $records=@dns_get_record($host,DNS_A|DNS_AAAA) ?: [];
  $public=[];
  foreach($records as $r){
    $ip=$r['ip'] ?? $r['ipv6'] ?? null;
    if($ip && public_ip($ip)) $public[]=$ip;
    elseif($ip) return ['ok'=>false,'error'=>'Canonical target resolves to a private or reserved IP address.'];
  }
  if(!$public) return ['ok'=>false,'error'=>'Canonical target did not resolve to a public IP address.'];
  return ['ok'=>true,'url'=>$raw];
}

function cc_fetch_target_follow(string $url,int $maxRedirects=5,int $maxBytes=1048576): array {
  $current=$url; $chain=[];
  for($i=0;$i<=$maxRedirects;$i++){
    $safe=cc_safe_public_url($current);
    if(!$safe['ok']) return ['final_url'=>$current,'response'=>null,'chain'=>$chain,'redirected'=>count($chain)>0,'error'=>$safe['error']];
    $r=curl_body($current,$maxBytes);
    $location=$r['headers']['location'] ?? null;
    $chain[]=['url'=>$current,'status'=>$r['status'],'location'=>$location];
    if(in_array($r['status'],[301,302,303,307,308],true) && $location && $i<$maxRedirects){
      $current=absolute_url($current,$location);
      continue;
    }
    return ['final_url'=>$current,'response'=>$r,'chain'=>$chain,'redirected'=>count($chain)>1,'error'=>null];
  }
  return ['final_url'=>$current,'response'=>$r ?? null,'chain'=>$chain,'redirected'=>count($chain)>1,'error'=>'Redirect limit reached.'];
}

function cc_meta_content(DOMXPath $x,string $name): ?string {
  $q='//meta[translate(@name,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="'.strtolower($name).'"]/@content';
  $n=$x->query($q)->item(0);
  return $n ? trim((string)$n->nodeValue) : null;
}

function cc_rel_has(string $rel,string $token): bool {
  foreach(preg_split('/\s+/',strtolower(trim($rel))) as $part){
    if($part===$token) return true;
  }
  return false;
}

function cc_html_canonicals(string $html,string $baseUrl): array {
  libxml_use_internal_errors(true);
  $dom=new DOMDocument();
  @$dom->loadHTML($html,LIBXML_NOWARNING|LIBXML_NOERROR);
  $xpath=new DOMXPath($dom);
  $items=[];
  foreach($xpath->query('//link[@href]') as $node){
    if(!$node instanceof DOMElement) continue;
    if(!cc_rel_has($node->getAttribute('rel'),'canonical')) continue;
    $raw=trim($node->getAttribute('href'));
    if($raw==='') continue;
    $inHead=(bool)$xpath->query('ancestor::head',$node)->length;
    $resolved=absolute_url($baseUrl,$raw);
    $items[]=[
      'source'=>$inHead?'html_head':'html_body',
      'raw'=>$raw,
      'resolved'=>$resolved,
      'absolute'=>(bool)preg_match('~^https?://~i',$raw),
      'has_fragment'=>(bool)parse_url($resolved,PHP_URL_FRAGMENT)
    ];
  }
  return ['items'=>$items,'robots'=>cc_meta_content($xpath,'robots'),'title'=>trim((string)($xpath->query('//title')->item(0)?->nodeValue ?? '')) ?: null];
}

function cc_http_link_canonicals(?string $linkHeader,string $baseUrl): array {
  if(!$linkHeader) return [];
  $out=[];
  foreach(preg_split('/,(?=\s*<)/',$linkHeader) as $part){
    if(!preg_match('/<([^>]+)>\s*;(.*)$/',$part,$m)) continue;
    $params=$m[2];
    if(!preg_match('/(?:^|;)\s*rel\s*=\s*(?:"[^"]*\bcanonical\b[^"]*"|[^;\s]*\bcanonical\b[^;\s]*)/i',$params)) continue;
    $raw=trim($m[1]);
    if($raw==='') continue;
    $resolved=absolute_url($baseUrl,$raw);
    $out[]=[
      'source'=>'http_header',
      'raw'=>$raw,
      'resolved'=>$resolved,
      'absolute'=>(bool)preg_match('~^https?://~i',$raw),
      'has_fragment'=>(bool)parse_url($resolved,PHP_URL_FRAGMENT)
    ];
  }
  return $out;
}

function cc_noindex(?string $metaRobots,?string $xRobots): bool {
  $v=strtolower(trim(($metaRobots ?? '').' '.($xRobots ?? '')));
  return (bool)preg_match('/(?:^|[,\s])noindex(?:[,\s]|$)/',$v);
}

function cc_norm_compare(string $url): string {
  $p=parse_url($url);
  if(!$p || !isset($p['scheme'],$p['host'])) return $url;
  $scheme=strtolower($p['scheme']); $host=strtolower($p['host']);
  $port=isset($p['port'])?':'.$p['port']:'';
  $path=$p['path'] ?? '/'; if($path==='') $path='/';
  $query=isset($p['query'])?'?'.$p['query']:'';
  return $scheme.'://'.$host.$port.$path.$query;
}

function cc_add(array &$findings,string $id,string $status,string $title,string $why,string $fix,?array $evidence=null): void {
  $findings[]=['id'=>$id,'status'=>$status,'title'=>$title,'why'=>$why,'fix'=>$fix,'evidence'=>$evidence];
}

$url=normalize_url($_GET['url'] ?? '');
$source=cc_fetch_follow($url,5,1048576);
$r=$source['response'];
if(!$r) out(['error'=>'No source response received.'],502);
if($r['status']<200 || $r['status']>=400){
  out(['error'=>'Source URL returned HTTP '.$r['status'].'.','source'=>['requested_url'=>$url,'final_url'=>$source['final_url'],'redirect_chain'=>$source['chain']]],502);
}

$finalUrl=$source['final_url'];
$htmlInfo=cc_html_canonicals($r['body'],$finalUrl);
$httpCanon=cc_http_link_canonicals($r['headers']['link'] ?? null,$finalUrl);
$canonicals=array_merge($htmlInfo['items'],$httpCanon);
$findings=[];

if($source['redirected']){
  cc_add($findings,'source_redirect','informational','Source URL redirects before the final page',
    'The submitted URL redirects before the HTML canonical is evaluated.',
    'Use the final preferred URL consistently in internal links and sitemaps when the redirect is permanent.',
    ['final_url'=>$finalUrl,'hops'=>count($source['chain'])-1]);
}

if(!$canonicals){
  cc_add($findings,'missing','review','No canonical annotation found',
    'No HTML rel=canonical or canonical HTTP Link header was found in the fetched response. Google can still choose a canonical automatically, so this is not automatically an error.',
    'If this page belongs to a duplicate or parameterized URL set, consider adding a clear canonical preference. Self-referencing canonicals are commonly used on preferred indexable pages.');
}else{
  $unique=[];
  foreach($canonicals as $c) $unique[cc_norm_compare($c['resolved'])]=true;
  if(count($unique)>1){
    cc_add($findings,'conflict','review','Conflicting canonical targets found',
      'The response declares more than one distinct canonical target. Google recommends avoiding conflicting canonical signals.',
      'Choose one preferred canonical URL and remove conflicting HTML or HTTP canonical declarations.',
      ['targets'=>array_keys($unique)]);
  }else{
    cc_add($findings,'declared','present','Canonical target declared',
      'The page declares one consistent canonical target across the canonical annotations found.',
      'Keep the canonical aligned with redirects, internal links and sitemap URLs.',
      ['target'=>array_key_first($unique),'annotations'=>count($canonicals)]);
  }

  $body=array_values(array_filter($canonicals,fn($c)=>$c['source']==='html_body'));
  if($body){
    cc_add($findings,'body_canonical','review','Canonical link appears outside <head>',
      'Google only accepts the HTML canonical link element when it appears in the document head.',
      'Move the canonical link element into a valid <head> section.',
      ['count'=>count($body)]);
  }

  $relative=array_values(array_filter($canonicals,fn($c)=>!$c['absolute']));
  if($relative){
    cc_add($findings,'relative','review','Relative canonical URL used',
      'Google supports relative canonical paths but recommends absolute URLs because relative values are easier to misconfigure across hosts or environments.',
      'Use a full absolute canonical URL including scheme and hostname.',
      ['values'=>array_map(fn($c)=>$c['raw'],$relative)]);
  }

  $fragment=array_values(array_filter($canonicals,fn($c)=>$c['has_fragment']));
  if($fragment){
    cc_add($findings,'fragment','review','Canonical contains a URL fragment',
      'Google generally does not support URL fragments as canonical targets.',
      'Point the canonical at the fragment-free preferred document URL.',
      ['values'=>array_map(fn($c)=>$c['resolved'],$fragment)]);
  }

  $headCount=count(array_filter($canonicals,fn($c)=>$c['source']==='html_head'));
  $httpCount=count(array_filter($canonicals,fn($c)=>$c['source']==='http_header'));
  if($headCount && $httpCount){
    cc_add($findings,'dual_method','informational','Canonical declared in HTML and HTTP header',
      'Google supports both methods, but its documentation recommends choosing one because using both is more error-prone.',
      'Keep both only if they are intentionally synchronized; otherwise standardize on the method appropriate to the resource type.',
      ['html'=>$headCount,'http_header'=>$httpCount]);
  }
}

$sourceXRobots=$r['headers']['x-robots-tag'] ?? null;
$sourceNoindex=cc_noindex($htmlInfo['robots'],$sourceXRobots);
if($sourceNoindex){
  cc_add($findings,'source_noindex','review','Source page is noindex',
    'The source response contains a noindex directive. Google recommends rel=canonical, not noindex, when the goal is canonicalization within a site.',
    'Confirm whether the page should be excluded entirely or consolidated as a duplicate; do not mix directives unintentionally.',
    ['meta_robots'=>$htmlInfo['robots'],'x_robots_tag'=>$sourceXRobots]);
}

$target=null;
$preferred=null;
if($canonicals){
  $preferred=$canonicals[0]['resolved'];
  $preferredCmp=cc_norm_compare($preferred);
  $sourceCmp=cc_norm_compare($finalUrl);

  if($preferredCmp===$sourceCmp){
    cc_add($findings,'self','present','Self-referencing canonical',
      'The declared canonical resolves to the final source URL.',
      'Keep other canonicalization signals consistent with this URL.',
      ['canonical'=>$preferred]);
  }else{
    $sourceHost=strtolower((string)parse_url($finalUrl,PHP_URL_HOST));
    $targetHost=strtolower((string)parse_url($preferred,PHP_URL_HOST));
    cc_add($findings,'cross_reference','informational',$sourceHost===$targetHost?'Canonical points to another URL on the same host':'Cross-domain canonical',
      'The page asks search engines to consolidate this URL with a different canonical target. Canonical hints are not guarantees of Google-selected canonical.',
      'Verify that the target is genuinely the preferred representative of duplicate or substantially similar content.',
      ['canonical'=>$preferred]);
  }

  $sourceScheme=strtolower((string)parse_url($finalUrl,PHP_URL_SCHEME));
  $targetScheme=strtolower((string)parse_url($preferred,PHP_URL_SCHEME));
  if($sourceScheme==='https' && $targetScheme==='http'){
    cc_add($findings,'https_to_http','review','HTTPS page canonicals to HTTP',
      'Google generally prefers HTTPS over equivalent HTTP pages unless conflicting signals or HTTPS problems exist.',
      'If the HTTPS page is the preferred version, use an HTTPS canonical and align redirects and internal links.',
      ['canonical'=>$preferred]);
  }

  try{
    $targetFetch=cc_fetch_target_follow($preferred,5,1048576);
    $tr=$targetFetch['response'];
    if(!empty($targetFetch['error'])){
      cc_add($findings,'target_fetch','review','Canonical target could not be safely verified',
        $targetFetch['error'],
        'Use a valid public HTTP or HTTPS canonical target that resolves to a public web endpoint.',
        ['canonical'=>$preferred]);
    }
    $target=[
      'requested_url'=>$preferred,
      'final_url'=>$targetFetch['final_url'],
      'status'=>$tr['status'] ?? null,
      'redirect_chain'=>$targetFetch['chain'],
      'redirected'=>$targetFetch['redirected']
    ];

    if(!$tr){
      // A safe-verification finding was already added above.
    }elseif($tr['status']<200 || $tr['status']>=400){
      cc_add($findings,'target_status','review','Canonical target does not return a successful page',
        'The declared canonical target returned HTTP '.($tr['status'] ?? 'unknown').'.',
        'Point the canonical directly at a stable, successful preferred URL.',
        ['status'=>$tr['status'] ?? null,'final_url'=>$targetFetch['final_url']]);
    }else{
      if($targetFetch['redirected']){
        cc_add($findings,'target_redirect','review','Canonical target redirects',
          'The declared canonical target redirects before reaching its final response.',
          'Point the canonical directly at the final preferred URL to avoid an unnecessary canonical chain.',
          ['final_url'=>$targetFetch['final_url'],'hops'=>count($targetFetch['chain'])-1]);
      }

      $targetInfo=cc_html_canonicals($tr['body'],$targetFetch['final_url']);
      $targetHttpCanon=cc_http_link_canonicals($tr['headers']['link'] ?? null,$targetFetch['final_url']);
      $targetCanons=array_merge($targetInfo['items'],$targetHttpCanon);
      $targetNoindex=cc_noindex($targetInfo['robots'],$tr['headers']['x-robots-tag'] ?? null);
      $target['meta_robots']=$targetInfo['robots'];
      $target['x_robots_tag']=$tr['headers']['x-robots-tag'] ?? null;
      $target['noindex']=$targetNoindex;
      $target['canonicals']=$targetCanons;

      if($targetNoindex){
        cc_add($findings,'target_noindex','review','Canonical target is noindex',
          'The canonical target contains a noindex directive, which conflicts with using it as the page intended to represent the content in search.',
          'Remove accidental noindex from the intended canonical page or choose a different indexable canonical target.',
          ['meta_robots'=>$targetInfo['robots'],'x_robots_tag'=>$tr['headers']['x-robots-tag'] ?? null]);
      }

      if($targetCanons){
        $next=$targetCanons[0]['resolved'];
        if(cc_norm_compare($next)!==cc_norm_compare($targetFetch['final_url'])){
          cc_add($findings,'canonical_chain','review','Canonical target points to another canonical URL',
            'The declared canonical target itself canonicals to a different URL, creating a canonical chain.',
            'Point the source directly at the final intended canonical URL and keep canonical signals consistent.',
            ['source_canonical'=>$preferred,'target_canonical'=>$next]);
        }
      }
    }
  }catch(Throwable $e){
    cc_add($findings,'target_fetch','review','Canonical target could not be verified',
      'The canonical target could not be fetched by this checker.',
      'Verify the target URL manually and confirm it is publicly reachable, stable and indexable.',
      ['error'=>substr($e->getMessage(),0,220)]);
  }
}

$counts=['present'=>0,'review'=>0,'informational'=>0];
foreach($findings as $f) if(isset($counts[$f['status']])) $counts[$f['status']]++;

out([
  'ok'=>true,
  'source'=>[
    'requested_url'=>$url,
    'final_url'=>$finalUrl,
    'status'=>$r['status'],
    'redirect_chain'=>$source['chain'],
    'title'=>$htmlInfo['title'],
    'meta_robots'=>$htmlInfo['robots'],
    'x_robots_tag'=>$sourceXRobots,
    'noindex'=>$sourceNoindex
  ],
  'canonical_annotations'=>$canonicals,
  'preferred_canonical'=>$preferred,
  'target'=>$target,
  'summary'=>$counts,
  'findings'=>$findings,
  'methodology'=>[
    'The checker follows source redirects, inspects canonical link elements in HTML and canonical HTTP Link headers, then verifies the first declared target.',
    'HTML canonical elements outside the document head are reported because Google only accepts the HTML canonical link element in the head.',
    'Relative canonical URLs are resolved for testing but reported for review because Google recommends absolute paths.',
    'A declared canonical is a preference signal, not proof of the Google-selected canonical. Use Google Search Console URL Inspection for Google-selected canonical data.'
  ]
]);
