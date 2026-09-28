<?php
declare(strict_types=1);
require __DIR__.'/common.php';

rate_limit('security-headers', 15, 60);

$url=normalize_url($_GET['url'] ?? '');
$current=$url;
$seen=[];
$chain=[];
$final=null;
$redirectLoop=false;

for($i=0;$i<6;$i++){
  if(isset($seen[$current])){ $redirectLoop=true; break; }
  $seen[$current]=true;
  $r=curl_headers($current);
  $location=$r['headers']['location'] ?? null;
  $chain[]=[
    'url'=>$current,
    'status'=>$r['status'],
    'location'=>$location,
    'time_ms'=>$r['time_ms']
  ];
  $final=$r;
  if(!in_array($r['status'],[301,302,303,307,308],true) || !$location) break;
  $next=absolute_url($current,$location);
  $current=normalize_url($next);
}

if(!$final) out(['error'=>'No HTTP response was received.'],502);

$headers=$final['headers'] ?? [];
$finalUrl=$final['url'] ?? $current;
$scheme=strtolower((string)(parse_url($finalUrl,PHP_URL_SCHEME) ?? ''));
$contentType=strtolower((string)($final['content_type'] ?? ''));
$isHtml=$contentType==='' || str_contains($contentType,'text/html');

function sh_add(array &$items,string $id,string $title,string $header,string $status,?string $value,string $why,string $fix,string $reference): void {
  $items[]=[
    'id'=>$id,
    'title'=>$title,
    'header'=>$header,
    'status'=>$status,
    'value'=>$value,
    'why'=>$why,
    'fix'=>$fix,
    'reference'=>$reference
  ];
}
function sh_header(array $headers,string $name): ?string {
  $key=strtolower($name);
  return isset($headers[$key]) && trim((string)$headers[$key])!=='' ? trim((string)$headers[$key]) : null;
}
function sh_csp_has_directive(string $csp,string $directive): bool {
  return (bool)preg_match('/(?:^|;)\s*'.preg_quote($directive,'/').'\s+/i',$csp);
}

$findings=[];

// HTTPS transport.
if($scheme==='https'){
  sh_add($findings,'https','HTTPS transport','HTTPS','present',$finalUrl,
    'The checked final URL is using HTTPS.',
    'Keep TLS certificate renewal and redirect behavior monitored.',
    'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security');
}else{
  sh_add($findings,'https','HTTPS transport','HTTPS','review',$finalUrl,
    'The final URL is not using HTTPS, so transport security headers such as HSTS cannot protect this response.',
    'Serve the site over HTTPS and redirect the HTTP version to the intended HTTPS URL.',
    'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security');
}

// HSTS.
$hsts=sh_header($headers,'strict-transport-security');
if($scheme!=='https'){
  sh_add($findings,'hsts','HTTP Strict Transport Security','Strict-Transport-Security','informational',$hsts,
    'Browsers ignore HSTS when it is received over insecure HTTP.',
    'Evaluate HSTS only on a working HTTPS endpoint.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security');
}elseif(!$hsts){
  sh_add($findings,'hsts','HTTP Strict Transport Security','Strict-Transport-Security','missing',null,
    'No HSTS policy was returned on the HTTPS response. HSTS can make supporting browsers automatically use HTTPS on future visits.',
    'After confirming the host is fully HTTPS-ready, add an HSTS policy with an appropriate max-age. Test subdomains before using includeSubDomains or preload.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security');
}else{
  $maxAge=null;
  if(preg_match('/(?:^|;)\s*max-age\s*=\s*([0-9]+)/i',$hsts,$m)) $maxAge=(int)$m[1];
  if($maxAge===null){
    sh_add($findings,'hsts','HTTP Strict Transport Security','Strict-Transport-Security','review',$hsts,
      'The HSTS value does not contain a parseable max-age directive.',
      'Use a valid max-age value. Review includeSubDomains and preload separately before enabling them.',
      'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security');
  }elseif($maxAge===0){
    sh_add($findings,'hsts','HTTP Strict Transport Security','Strict-Transport-Security','review',$hsts,
      'max-age=0 tells browsers to remove the host from their HSTS list.',
      'If HSTS is intended, publish a positive max-age after confirming HTTPS works reliably.',
      'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security');
  }elseif($maxAge<15768000){
    sh_add($findings,'hsts','HTTP Strict Transport Security','Strict-Transport-Security','review',$hsts,
      'The HSTS max-age is shorter than the six-month minimum used in MDN practical deployment guidance.',
      'Consider increasing max-age after validating HTTPS reliability. Do not add includeSubDomains or preload without testing their operational impact.',
      'https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/TLS');
  }else{
    sh_add($findings,'hsts','HTTP Strict Transport Security','Strict-Transport-Security','present',$hsts,
      'A parseable HSTS policy is present with a max-age of at least six months.',
      'Keep the HTTPS deployment reliable. Review includeSubDomains and preload only if they fit the whole domain estate.',
      'https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/TLS');
  }
}

// Content Security Policy.
$csp=sh_header($headers,'content-security-policy');
$cspReportOnly=sh_header($headers,'content-security-policy-report-only');
if(!$isHtml && !$csp){
  sh_add($findings,'csp','Content Security Policy','Content-Security-Policy','informational',null,
    'The checked response is not identified as HTML, so a browser-enforced page CSP may not be relevant to this resource.',
    'Evaluate CSP on browser-rendered HTML pages that execute scripts, styles or embedded content.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy');
}elseif(!$csp && $cspReportOnly){
  sh_add($findings,'csp','Content Security Policy','Content-Security-Policy','review',$cspReportOnly,
    'A report-only CSP is present, but report-only policies do not enforce the restrictions.',
    'Use report-only while tuning a policy, then deploy an enforcing Content-Security-Policy once violations are understood.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy');
}elseif(!$csp){
  sh_add($findings,'csp','Content Security Policy','Content-Security-Policy','missing',null,
    'No enforcing Content-Security-Policy header was returned for this browser-rendered response.',
    'Design a policy around the resources the application actually needs. Start in report-only mode if necessary, then enforce a tested policy.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy');
}else{
  $flags=[];
  if(stripos($csp,"'unsafe-eval'")!==false) $flags[]="'unsafe-eval'";
  if(stripos($csp,"'unsafe-inline'")!==false) $flags[]="'unsafe-inline'";
  if(preg_match('/(?:^|;)\s*(?:default-src|script-src)\s+\*/i',$csp)) $flags[]='wildcard script/default source';
  if($flags){
    sh_add($findings,'csp','Content Security Policy','Content-Security-Policy','review',$csp,
      'An enforcing CSP is present, but it includes policy choices worth reviewing: '.implode(', ',$flags).'.',
      'Reduce broad script permissions where the application can support nonces, hashes or narrower source lists. Test changes before enforcement.',
      'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy');
  }else{
    sh_add($findings,'csp','Content Security Policy','Content-Security-Policy','present',$csp,
      'An enforcing Content-Security-Policy header is present. Presence alone does not prove the policy is complete.',
      'Keep the policy aligned with the actual application and review it when scripts, frames, styles or third-party origins change.',
      'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy');
  }
}

// Clickjacking / framing.
$xfo=sh_header($headers,'x-frame-options');
$hasFrameAncestors=$csp ? sh_csp_has_directive($csp,'frame-ancestors') : false;
if(!$isHtml){
  sh_add($findings,'framing','Framing / clickjacking policy','CSP frame-ancestors / X-Frame-Options','informational',$hasFrameAncestors?$csp:$xfo,
    'Framing controls are mainly relevant to browser-rendered documents with interactive content.',
    'Evaluate framing controls on the HTML pages users interact with.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors');
}elseif($hasFrameAncestors){
  sh_add($findings,'framing','Framing / clickjacking policy','CSP frame-ancestors','present',$csp,
    'The active CSP contains a frame-ancestors directive controlling which parents may embed the page.',
    'Keep the allowed ancestor list as narrow as the product requires.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors');
}elseif($xfo && preg_match('/^(DENY|SAMEORIGIN)$/i',trim($xfo))){
  sh_add($findings,'framing','Framing / clickjacking policy','X-Frame-Options','present',$xfo,
    'X-Frame-Options is set to a widely supported restrictive value.',
    'For modern policy control, consider CSP frame-ancestors while retaining X-Frame-Options if legacy compatibility matters.',
    'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html');
}elseif($xfo){
  sh_add($findings,'framing','Framing / clickjacking policy','X-Frame-Options','review',$xfo,
    'A framing header is present, but its value is not DENY or SAMEORIGIN and there is no active CSP frame-ancestors directive.',
    'Use CSP frame-ancestors for explicit modern control, or a supported X-Frame-Options value when appropriate.',
    'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html');
}else{
  sh_add($findings,'framing','Framing / clickjacking policy','CSP frame-ancestors / X-Frame-Options','missing',null,
    'No explicit framing restriction was found on this HTML response.',
    'If the page should not be embedded by arbitrary sites, define CSP frame-ancestors and validate any legitimate embedding use cases.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors');
}

// MIME sniffing.
$xcto=sh_header($headers,'x-content-type-options');
if(!$xcto){
  sh_add($findings,'nosniff','MIME sniffing protection','X-Content-Type-Options','missing',null,
    'The response does not set X-Content-Type-Options.',
    'Send X-Content-Type-Options: nosniff and make sure Content-Type values are correct for served resources.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options');
}elseif(strtolower(trim($xcto))==='nosniff'){
  sh_add($findings,'nosniff','MIME sniffing protection','X-Content-Type-Options','present',$xcto,
    'The response asks browsers to respect declared MIME types instead of sniffing another type.',
    'Keep accurate Content-Type headers on scripts, styles, documents and uploaded files.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options');
}else{
  sh_add($findings,'nosniff','MIME sniffing protection','X-Content-Type-Options','review',$xcto,
    'X-Content-Type-Options is present but the standard protective value is nosniff.',
    'Use X-Content-Type-Options: nosniff and verify correct Content-Type values.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options');
}

// Referrer Policy.
$referrer=sh_header($headers,'referrer-policy');
if(!$referrer){
  sh_add($findings,'referrer','Referrer policy','Referrer-Policy','informational',null,
    'No explicit Referrer-Policy header was returned. Modern browsers have a default policy, but an explicit policy can make the site intent clearer and more predictable.',
    'Choose a policy that matches the application privacy and analytics requirements; strict-origin-when-cross-origin is a common explicit baseline.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy');
}elseif(stripos($referrer,'unsafe-url')!==false){
  sh_add($findings,'referrer','Referrer policy','Referrer-Policy','review',$referrer,
    'unsafe-url can send the full referrer URL in situations where a stricter policy would expose less information.',
    'Review whether a stricter policy meets the application requirements before changing it.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy');
}else{
  sh_add($findings,'referrer','Referrer policy','Referrer-Policy','present',$referrer,
    'An explicit Referrer-Policy is present.',
    'Confirm the selected policy matches the product privacy, analytics and cross-origin navigation requirements.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy');
}

// Permissions Policy.
$permissions=sh_header($headers,'permissions-policy');
if($permissions){
  sh_add($findings,'permissions','Permissions policy','Permissions-Policy','present',$permissions,
    'An explicit Permissions-Policy is present for browser features.',
    'Review the allowed features and origins against what the application actually uses.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy');
}else{
  sh_add($findings,'permissions','Permissions policy','Permissions-Policy','informational',null,
    'No explicit Permissions-Policy was returned. This is application-dependent rather than an automatic vulnerability.',
    'If the page does not need sensitive browser features, consider explicitly restricting unused capabilities.',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy');
}

// Cross-origin isolation headers.
foreach([
  ['coop','Cross-Origin-Opener-Policy','cross-origin-opener-policy','https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy'],
  ['coep','Cross-Origin-Embedder-Policy','cross-origin-embedder-policy','https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy'],
  ['corp','Cross-Origin-Resource-Policy','cross-origin-resource-policy','https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy']
] as [$id,$title,$key,$ref]){
  $value=sh_header($headers,$key);
  sh_add($findings,$id,$title,$title,$value?'present':'informational',$value,
    $value ? 'This cross-origin policy header is present.' : 'This cross-origin policy header is not present. It is only required for specific isolation or resource-sharing models.',
    $value ? 'Confirm the value matches the intended cross-origin architecture.' : 'Add this header only when the application needs the isolation or resource policy it provides.',
    $ref);
}

// Legacy / deprecated headers.
$xxss=sh_header($headers,'x-xss-protection');
if($xxss && trim($xxss)!=='0'){
  sh_add($findings,'xxss','Legacy XSS filter header','X-XSS-Protection','review',$xxss,
    'OWASP recommends not relying on the legacy browser XSS filter header and notes problematic behavior in older implementations.',
    'Use a well-designed Content Security Policy and context-aware output encoding. Remove this header or explicitly disable it where legacy behavior is a concern.',
    'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html');
}else{
  sh_add($findings,'xxss','Legacy XSS filter header','X-XSS-Protection','informational',$xxss,
    $xxss==='0' ? 'The legacy XSS filter is explicitly disabled, which aligns with modern guidance.' : 'The obsolete X-XSS-Protection header is not being relied on.',
    'Use CSP and secure output handling instead of legacy browser XSS filters.',
    'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html');
}

$hpkp=sh_header($headers,'public-key-pins');
if($hpkp){
  sh_add($findings,'hpkp','Deprecated public key pinning','Public-Key-Pins','review',$hpkp,
    'HPKP is obsolete and unsupported by modern browsers; incorrect pinning could historically make sites inaccessible.',
    'Remove Public-Key-Pins and use current TLS, certificate transparency and certificate automation practices instead.',
    'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html');
}

// Disclosure signals.
$disclosure=[];
foreach(['server','x-powered-by','x-aspnet-version','x-generator'] as $key){
  if(isset($headers[$key]) && trim((string)$headers[$key])!=='') $disclosure[$key]=$headers[$key];
}
sh_add($findings,'disclosure','Technology disclosure','Server / X-Powered-By','informational',
  $disclosure ? implode(' | ',array_map(fn($k,$v)=>$k.': '.$v,array_keys($disclosure),array_values($disclosure))) : null,
  $disclosure ? 'The response exposes one or more implementation-identifying headers. This is not automatically a vulnerability, but detailed version disclosure can provide unnecessary fingerprinting information.' : 'No common implementation-disclosure headers were found in this response.',
  $disclosure ? 'Remove unnecessary version or framework disclosure where operationally safe. Do not rely on header hiding as a substitute for patching.' : 'No action is required solely for this check.',
  'https://owasp.org/projects/secure-headers-project');

$counts=['present'=>0,'review'=>0,'missing'=>0,'informational'=>0];
foreach($findings as $item){
  if(isset($counts[$item['status']])) $counts[$item['status']]++;
}

out([
  'ok'=>true,
  'requested_url'=>$url,
  'final_url'=>$finalUrl,
  'status'=>$final['status'],
  'content_type'=>$final['content_type'],
  'resolved_ip'=>$final['ip'],
  'time_ms'=>$final['time_ms'],
  'redirect_loop'=>$redirectLoop,
  'redirect_chain'=>$chain,
  'summary'=>$counts,
  'findings'=>$findings,
  'raw_headers'=>$headers,
  'methodology'=>[
    'The checker follows up to five HTTP redirects and evaluates the final response.',
    'The diagnostic uses a server-side HTTP header request, so a browser session can receive different headers based on cookies, authentication, geography, user agent or experimentation.',
    'Present means a recognizable policy exists; it does not prove the policy is complete or appropriate for the application.',
    'Missing optional headers are not automatically treated as vulnerabilities.'
  ]
]);
