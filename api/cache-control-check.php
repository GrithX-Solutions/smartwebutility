<?php
declare(strict_types=1);
require __DIR__.'/common.php';

rate_limit('cache-control-check', 15, 60);

$url=normalize_url($_GET['url'] ?? '');

function cache_request(string $url,int $maxBytes=2097152): array {
  $url=normalize_url($url);
  $p=parse_url($url);
  $host=clean_host($p['host'] ?? '');
  $ips=resolve_public($host);
  $ip=$ips[0];
  $port=(int)($p['port'] ?? (($p['scheme'] ?? 'https')==='https'?443:80));
  $headers=[];$body='';$truncated=false;
  $ch=curl_init($url);
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>false,
    CURLOPT_FOLLOWLOCATION=>false,
    CURLOPT_CONNECTTIMEOUT=>6,
    CURLOPT_TIMEOUT=>15,
    CURLOPT_USERAGENT=>'SmartWebUtility-CacheChecker/1.0 (+https://smartwebutility.com/)',
    CURLOPT_SSL_VERIFYPEER=>true,
    CURLOPT_SSL_VERIFYHOST=>2,
    CURLOPT_RESOLVE=>[$host.':'.$port.':'.$ip],
    CURLOPT_ENCODING=>'',
    CURLOPT_HTTPHEADER=>['Accept: */*'],
    CURLOPT_HEADERFUNCTION=>function($ch,$line) use (&$headers){
      $len=strlen($line);$line=trim($line);
      if($line!=='' && str_contains($line,':')){
        [$k,$v]=array_map('trim',explode(':',$line,2));
        $k=strtolower($k);
        if(isset($headers[$k])) $headers[$k].=', '.$v;
        else $headers[$k]=$v;
      }
      return $len;
    },
    CURLOPT_WRITEFUNCTION=>function($ch,$chunk) use (&$body,$maxBytes,&$truncated){
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
  $start=microtime(true);
  $ok=curl_exec($ch);
  $elapsed=(microtime(true)-$start)*1000;
  $errno=curl_errno($ch);$err=curl_error($ch);$info=curl_getinfo($ch);
  curl_close($ch);
  if($ok===false && $errno!==23) out(['error'=>'Request failed: '.$err],502);
  return [
    'url'=>$url,
    'status'=>(int)($info['http_code']??0),
    'time_ms'=>(int)round($elapsed),
    'content_type'=>$info['content_type']??null,
    'content_length_download'=>isset($info['download_content_length']) && $info['download_content_length']>=0 ? (int)$info['download_content_length'] : null,
    'downloaded_bytes'=>strlen($body),
    'truncated'=>$truncated,
    'ip'=>$info['primary_ip']??$ip,
    'headers'=>$headers
  ];
}

function cache_follow(string $url,int $maxRedirects=5): array {
  $current=$url;$chain=[];
  for($i=0;$i<=$maxRedirects;$i++){
    $r=cache_request($current);
    $location=$r['headers']['location']??null;
    $chain[]=['url'=>$current,'status'=>$r['status'],'location'=>$location,'time_ms'=>$r['time_ms']];
    if(in_array($r['status'],[301,302,303,307,308],true) && $location && $i<$maxRedirects){
      $current=normalize_url(absolute_url($current,$location));
      continue;
    }
    return ['final_url'=>$current,'response'=>$r,'chain'=>$chain];
  }
  return ['final_url'=>$current,'response'=>$r??null,'chain'=>$chain];
}

function cache_split_directives(?string $value): array {
  if(!$value) return [];
  $parts=[];$buf='';$quote=false;
  $len=strlen($value);
  for($i=0;$i<$len;$i++){
    $c=$value[$i];
    if($c==='"' && ($i===0 || $value[$i-1]!=='\\')) $quote=!$quote;
    if($c===',' && !$quote){$parts[]=$buf;$buf='';continue;}
    $buf.=$c;
  }
  if(trim($buf)!=='')$parts[]=$buf;
  $out=[];
  foreach($parts as $part){
    $part=trim($part);if($part==='')continue;
    if(str_contains($part,'=')){
      [$k,$v]=array_map('trim',explode('=',$part,2));
      $v=trim($v," \t\n\r\0\x0B\"");
      $out[strtolower($k)]=$v;
    }else{
      $out[strtolower($part)]=true;
    }
  }
  return $out;
}

function cache_int_directive(array $d,string $key): ?int {
  if(!array_key_exists($key,$d) || $d[$key]===true) return null;
  return preg_match('/^-?\d+$/',(string)$d[$key]) ? (int)$d[$key] : null;
}

function cache_header(array $headers,string $key): ?string {
  $key=strtolower($key);
  return isset($headers[$key]) && trim((string)$headers[$key])!=='' ? trim((string)$headers[$key]) : null;
}

function cache_cdn_headers(array $headers): array {
  $map=[
    'cf-cache-status'=>'Cloudflare cache status',
    'x-cache'=>'X-Cache',
    'x-cache-hits'=>'X-Cache hits',
    'x-vercel-cache'=>'Vercel cache status',
    'x-nextjs-cache'=>'Next.js cache status',
    'x-cache-status'=>'Cache status',
    'x-proxy-cache'=>'Proxy cache status',
    'x-fastly-request-id'=>'Fastly request ID',
    'x-served-by'=>'Served by',
    'cdn-cache-control'=>'CDN-Cache-Control',
    'cloudflare-cdn-cache-control'=>'Cloudflare-CDN-Cache-Control'
  ];
  $out=[];
  foreach($map as $key=>$label){
    if(isset($headers[$key]))$out[]=['header'=>$key,'label'=>$label,'value'=>$headers[$key]];
  }
  return $out;
}

function cache_hit_signal(array $headers): ?array {
  $checks=[
    'cf-cache-status'=>['HIT','STALE','UPDATING','REVALIDATED'],
    'x-vercel-cache'=>['HIT','STALE'],
    'x-nextjs-cache'=>['HIT','STALE'],
    'x-cache'=>['HIT'],
    'x-cache-status'=>['HIT','STALE'],
    'x-proxy-cache'=>['HIT']
  ];
  foreach($checks as $key=>$tokens){
    if(!isset($headers[$key]))continue;
    $value=strtoupper((string)$headers[$key]);
    foreach($tokens as $token){
      if(str_contains($value,$token))return ['header'=>$key,'value'=>$headers[$key],'token'=>$token];
    }
  }
  $age=cache_header($headers,'age');
  if($age!==null && ctype_digit($age) && (int)$age>0)return ['header'=>'age','value'=>$age,'token'=>'AGE>0'];
  return null;
}

function cache_add(array &$findings,string $status,string $title,string $why,string $fix,?array $evidence=null): void {
  $findings[]=['status'=>$status,'title'=>$title,'why'=>$why,'fix'=>$fix,'evidence'=>$evidence];
}

$firstFollow=cache_follow($url);
$first=$firstFollow['response'];
if(!$first) out(['error'=>'No HTTP response received.'],502);
$finalUrl=$firstFollow['final_url'];

usleep(250000);
$second=cache_request($finalUrl);

$headers=$second['headers'];
$ccRaw=cache_header($headers,'cache-control');
$cc=cache_split_directives($ccRaw);
$cdnCcRaw=cache_header($headers,'cdn-cache-control');
$cdnCc=cache_split_directives($cdnCcRaw);
$cfCdnRaw=cache_header($headers,'cloudflare-cdn-cache-control');
$cfCdn=cache_split_directives($cfCdnRaw);
$maxAge=cache_int_directive($cc,'max-age');
$sMaxAge=cache_int_directive($cc,'s-maxage');
$cdnSMaxAge=cache_int_directive($cdnCc,'s-maxage') ?? cache_int_directive($cfCdn,'s-maxage');
$cdnMaxAge=cache_int_directive($cdnCc,'max-age') ?? cache_int_directive($cfCdn,'max-age');
$age=cache_header($headers,'age');
$expires=cache_header($headers,'expires');
$etag=cache_header($headers,'etag');
$lastModified=cache_header($headers,'last-modified');
$vary=cache_header($headers,'vary');
$setCookie=cache_header($headers,'set-cookie');
$hit1=cache_hit_signal($first['headers']);
$hit2=cache_hit_signal($second['headers']);

$browserTtl=$maxAge;
$sharedTtl=$cdnSMaxAge ?? $cdnMaxAge ?? $sMaxAge ?? $maxAge;
$browserMode='unspecified';
$sharedMode='unspecified';

if(isset($cc['no-store'])){
  $browserMode='no-store';$sharedMode='no-store';
}elseif(isset($cc['private'])){
  $browserMode=isset($cc['no-cache'])?'private-revalidate':'private';
  $sharedMode='private';
}else{
  if(isset($cc['no-cache']))$browserMode='revalidate';
  elseif($maxAge!==null && $maxAge>0)$browserMode='fresh-cache';
  elseif($maxAge===0)$browserMode='stale-immediately';
  elseif($expires)$browserMode='expires-based';

  if(isset($cc['no-cache']) && $sMaxAge===null && $cdnSMaxAge===null && $cdnMaxAge===null)$sharedMode='revalidate';
  elseif($sharedTtl!==null && $sharedTtl>0)$sharedMode='fresh-cache';
  elseif($sharedTtl===0)$sharedMode='stale-immediately';
  elseif(isset($cc['public']))$sharedMode='public-unspecified-ttl';
}

if($vary==='*'){$browserMode='vary-star';$sharedMode='vary-star';}

$findings=[];

if(!$ccRaw && !$cdnCcRaw && !$cfCdnRaw && !$expires){
  cache_add($findings,'review','No explicit freshness policy found',
    'The response does not expose Cache-Control, CDN-specific cache-control or Expires freshness instructions.',
    'Set caching intentionally for this resource type. Versioned static assets commonly use long-lived caching; HTML and personalized responses usually need different policies.',
    null);
}else{
  cache_add($findings,'present','Caching policy headers found',
    'The response exposes explicit cache policy information that browsers or shared caches can evaluate.',
    'Keep the policy aligned with how frequently this resource changes and whether it is shared or personalized.',
    ['cache_control'=>$ccRaw,'cdn_cache_control'=>$cdnCcRaw,'cloudflare_cdn_cache_control'=>$cfCdnRaw,'expires'=>$expires]);
}

if(isset($cc['no-store'])){
  cache_add($findings,'informational','no-store disables response storage',
    'Cache-Control: no-store tells caches not to store this response.',
    'Use no-store for responses that truly must not be retained. Do not use it on static assets merely to force freshness.',
    ['cache_control'=>$ccRaw]);
}
if(isset($cc['no-cache'])){
  cache_add($findings,'informational','no-cache requires revalidation',
    'The no-cache directive does not mean “do not store.” It allows storage but requires validation before reuse.',
    'Pair revalidation-oriented policies with ETag or Last-Modified when practical so unchanged content can return 304 Not Modified.',
    ['etag'=>$etag,'last_modified'=>$lastModified]);
}
if(isset($cc['private'])){
  cache_add($findings,'informational','Response is marked private',
    'Cache-Control: private allows private/browser caching but tells shared caches not to store the response.',
    'Keep private on personalized responses. Remove it only if shared caching is safe for all users.',
    ['cache_control'=>$ccRaw]);
}
if(isset($cc['public'])){
  cache_add($findings,'present','Response is explicitly public-cacheable',
    'Cache-Control: public explicitly permits shared-cache storage subject to the rest of the policy.',
    'Confirm the response is not personalized or authorization-specific before using shared caching.',
    ['cache_control'=>$ccRaw]);
}
if($sMaxAge!==null){
  cache_add($findings,'present','Shared cache TTL overrides browser TTL',
    's-maxage defines freshness for shared caches and overrides max-age for those shared caches.',
    'Use this split deliberately when CDN freshness should differ from browser freshness.',
    ['max_age'=>$maxAge,'s_maxage'=>$sMaxAge]);
}
if($cdnSMaxAge!==null || $cdnMaxAge!==null){
  cache_add($findings,'present','CDN-specific cache policy found',
    'A CDN-specific cache-control header defines edge-cache freshness separately from ordinary browser Cache-Control.',
    'Keep CDN-specific policy synchronized with purge/versioning behavior so edges do not retain obsolete content.',
    ['cdn_cache_control'=>$cdnCcRaw,'cloudflare_cdn_cache_control'=>$cfCdnRaw]);
}
if(isset($cc['immutable'])){
  cache_add($findings,'present','immutable directive present',
    'immutable tells supporting clients that a fresh response will not change during its freshness lifetime, reducing needless revalidation.',
    'Use immutable primarily with fingerprinted/versioned URLs that change whenever the content changes.',
    ['max_age'=>$maxAge]);
}
if(isset($cc['stale-while-revalidate']) || isset($cc['stale-if-error'])){
  cache_add($findings,'present','Stale-response directives present',
    'The response allows controlled stale reuse during background revalidation and/or origin errors.',
    'Choose stale windows based on how much temporary staleness the content can safely tolerate.',
    ['stale_while_revalidate'=>$cc['stale-while-revalidate']??null,'stale_if_error'=>$cc['stale-if-error']??null]);
}

if($vary==='*'){
  cache_add($findings,'review','Vary: * prevents normal reusable caching',
    'Vary: * means factors beyond normal request-header matching influenced the response, so caches cannot safely reuse it for a later request.',
    'Replace Vary: * with the specific request headers that actually affect the representation when reusable caching is intended.',
    ['vary'=>$vary]);
}elseif($vary){
  cache_add($findings,'informational','Vary changes the cache key',
    'Caches need separate stored variants for the request headers named by Vary.',
    'Keep Vary limited to headers that genuinely change the representation; high-cardinality values can reduce cache efficiency.',
    ['vary'=>$vary]);
}

if(!$etag && !$lastModified && (isset($cc['no-cache']) || $maxAge===0)){
  cache_add($findings,'review','Revalidation policy has no common validator',
    'The response asks for immediate or repeated revalidation but exposes neither ETag nor Last-Modified.',
    'Add an ETag and/or Last-Modified validator when the application can generate them correctly, so unchanged resources can validate efficiently.',
    ['etag'=>$etag,'last_modified'=>$lastModified]);
}elseif($etag || $lastModified){
  cache_add($findings,'present','Cache validator available',
    'The response exposes a validator that can support conditional revalidation of stale content.',
    'Keep validator values stable for unchanged representations and update them when the representation changes.',
    ['etag'=>$etag,'last_modified'=>$lastModified]);
}

if($setCookie && ($sharedMode==='fresh-cache' || isset($cc['public']))){
  cache_add($findings,'review','Cacheable response also sets a cookie',
    'The response appears share-cache eligible while also returning Set-Cookie. CDN behavior varies and personalized content must never leak across users.',
    'Confirm this cookie does not make the representation user-specific and verify the CDN cache key/bypass rules.',
    ['set_cookie'=>$setCookie,'shared_mode'=>$sharedMode]);
}

if($hit2){
  cache_add($findings,'present','Second request shows shared-cache evidence',
    'The repeated request returned a recognized cache-hit or positive Age signal.',
    'Use this as point-in-time evidence only; cache behavior can vary by edge, request headers, cookies, geography and cache key.',
    ['signal'=>$hit2,'first_signal'=>$hit1]);
}else{
  $cdnStatus=[];
  foreach(cache_cdn_headers($headers) as $x)$cdnStatus[$x['header']]=$x['value'];
  cache_add($findings,'informational','No clear shared-cache HIT on the second request',
    'The second request did not expose a recognized HIT or positive Age signal. That does not prove the URL can never be cached.',
    'Review Cache-Control plus CDN-specific status headers. A MISS may simply mean the object is cold; BYPASS/DYNAMIC/private/no-store can indicate intentional non-caching.',
    ['cdn_headers'=>$cdnStatus,'age'=>$age]);
}

$firstAge=cache_header($first['headers'],'age');
$secondAge=cache_header($second['headers'],'age');
if($firstAge!==null || $secondAge!==null){
  cache_add($findings,'informational','Age header observed',
    'Age reports how long a response has been resident in a proxy cache.',
    'Compare Age with the relevant shared-cache freshness lifetime when diagnosing stale or unexpectedly fresh responses.',
    ['first_age'=>$firstAge,'second_age'=>$secondAge,'shared_ttl_seconds'=>$sharedTtl]);
}

$knownCdn=cache_cdn_headers($headers);
if($knownCdn){
  cache_add($findings,'present','CDN or proxy cache headers detected',
    'The response contains cache-related headers commonly emitted by CDNs or reverse proxies.',
    'Interpret these vendor-specific values together with standard Cache-Control and Age rather than relying on a single header.',
    ['headers'=>$knownCdn]);
}

$counts=['present'=>0,'review'=>0,'informational'=>0];
foreach($findings as $f)if(isset($counts[$f['status']]))$counts[$f['status']]++;

out([
  'ok'=>true,
  'requested_url'=>$url,
  'final_url'=>$finalUrl,
  'redirect_chain'=>$firstFollow['chain'],
  'first_request'=>$first,
  'second_request'=>$second,
  'policy'=>[
    'cache_control'=>$ccRaw,
    'directives'=>$cc,
    'cdn_cache_control'=>$cdnCcRaw,
    'cloudflare_cdn_cache_control'=>$cfCdnRaw,
    'browser_mode'=>$browserMode,
    'shared_mode'=>$sharedMode,
    'browser_ttl_seconds'=>$browserTtl,
    'shared_ttl_seconds'=>$sharedTtl,
    'age'=>$age,
    'expires'=>$expires,
    'etag'=>$etag,
    'last_modified'=>$lastModified,
    'vary'=>$vary,
    'cdn_headers'=>$knownCdn,
    'first_hit_signal'=>$hit1,
    'second_hit_signal'=>$hit2
  ],
  'summary'=>$counts,
  'findings'=>$findings,
  'methodology'=>[
    'The checker makes two ordinary server-side GET requests to the same final public URL after following up to five safe HTTP redirects.',
    'The second request is used only as point-in-time cache evidence. A MISS does not prove that a resource is uncacheable, and a HIT can vary by CDN edge, cache key, request headers and geography.',
    'max-age describes ordinary freshness; s-maxage can override it for shared caches. CDN-specific Cache-Control headers may define an additional edge policy.',
    'no-cache permits storage but requires revalidation before reuse; no-store instructs caches not to store the response.',
    'Age is proxy-cache residency evidence. ETag and Last-Modified are validators used for conditional revalidation.',
    'This tool does not emulate a logged-in browser cache and does not claim to inspect every CDN edge worldwide.'
  ]
]);
