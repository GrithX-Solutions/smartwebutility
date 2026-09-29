<?php
declare(strict_types=1);
require __DIR__.'/common.php';

rate_limit('dnssec-check', 20, 60);

$raw=(string)($_GET['domain'] ?? $_GET['host'] ?? '');
$raw=preg_replace('~^https?://~i','',trim($raw));
$raw=explode('/',$raw,2)[0] ?? '';
$raw=preg_replace('/:\d+$/','',$raw);
$domain=clean_host($raw);

function dnssec_doh(string $resolver,string $base,string $name,string $type,bool $cd=false): array {
  $url=$base.'?name='.rawurlencode($name).'&type='.rawurlencode($type).'&do=1&cd='.($cd?'1':'0');
  $ch=curl_init($url);
  $headers=['Accept: application/dns-json'];
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>true,
    CURLOPT_CONNECTTIMEOUT=>5,
    CURLOPT_TIMEOUT=>10,
    CURLOPT_HTTPHEADER=>$headers,
    CURLOPT_USERAGENT=>'SmartWebUtility/1.0 (+https://smartwebutility.com/)'
  ]);
  $start=microtime(true);
  $raw=curl_exec($ch);
  $elapsed=(microtime(true)-$start)*1000;
  $err=curl_error($ch);
  $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);
  curl_close($ch);
  if($raw===false || $code<200 || $code>=300){
    return ['resolver'=>$resolver,'ok'=>false,'http_status'=>$code,'error'=>$err?:'HTTP '.$code,'status'=>null,'ad'=>null,'cd'=>$cd,'answers'=>[],'authority'=>[],'time_ms'=>(int)round($elapsed)];
  }
  $j=json_decode($raw,true);
  if(!is_array($j)){
    return ['resolver'=>$resolver,'ok'=>false,'http_status'=>$code,'error'=>'Invalid DNS-over-HTTPS JSON response.','status'=>null,'ad'=>null,'cd'=>$cd,'answers'=>[],'authority'=>[],'time_ms'=>(int)round($elapsed)];
  }
  return [
    'resolver'=>$resolver,
    'ok'=>true,
    'http_status'=>$code,
    'error'=>null,
    'status'=>isset($j['Status'])?(int)$j['Status']:null,
    'ad'=>array_key_exists('AD',$j)?(bool)$j['AD']:null,
    'cd'=>array_key_exists('CD',$j)?(bool)$j['CD']:$cd,
    'answers'=>array_values(array_filter($j['Answer']??[],fn($x)=>is_array($x))),
    'authority'=>array_values(array_filter($j['Authority']??[],fn($x)=>is_array($x))),
    'comment'=>$j['Comment']??null,
    'time_ms'=>(int)round($elapsed)
  ];
}

function dnssec_records(array $response,int $type): array {
  $out=[];
  foreach($response['answers']??[] as $r){
    if((int)($r['type']??0)!==$type) continue;
    $out[]=[
      'name'=>rtrim((string)($r['name']??''),'.'),
      'ttl'=>$r['TTL']??null,
      'data'=>(string)($r['data']??'')
    ];
  }
  return $out;
}

function dnssec_parse_ds(string $data): array {
  $p=preg_split('/\s+/',trim($data),4);
  return [
    'key_tag'=>isset($p[0])?(int)$p[0]:null,
    'algorithm'=>isset($p[1])?(int)$p[1]:null,
    'digest_type'=>isset($p[2])?(int)$p[2]:null,
    'digest'=>$p[3]??null
  ];
}

function dnssec_parse_dnskey(string $data): array {
  $p=preg_split('/\s+/',trim($data),4);
  $flags=isset($p[0])?(int)$p[0]:null;
  return [
    'flags'=>$flags,
    'role'=>$flags===257?'KSK':($flags===256?'ZSK':'Other'),
    'protocol'=>isset($p[1])?(int)$p[1]:null,
    'algorithm'=>isset($p[2])?(int)$p[2]:null,
    'public_key'=>$p[3]??null
  ];
}

function dnssec_alg_name(?int $id): ?string {
  if($id===null) return null;
  $m=[
    5=>'RSASHA1',
    7=>'RSASHA1-NSEC3-SHA1',
    8=>'RSASHA256',
    10=>'RSASHA512',
    13=>'ECDSAP256SHA256',
    14=>'ECDSAP384SHA384',
    15=>'ED25519',
    16=>'ED448'
  ];
  return $m[$id]??('Algorithm '.$id);
}

function dnssec_digest_name(?int $id): ?string {
  if($id===null) return null;
  $m=[1=>'SHA-1',2=>'SHA-256',3=>'GOST R 34.11-94',4=>'SHA-384'];
  return $m[$id]??('Digest '.$id);
}

function dnssec_status_name(?int $status): string {
  $m=[0=>'NOERROR',1=>'FORMERR',2=>'SERVFAIL',3=>'NXDOMAIN',4=>'NOTIMP',5=>'REFUSED'];
  return $m[$status]??($status===null?'Unknown':'RCODE '.$status);
}

function dnssec_add(array &$findings,string $status,string $title,string $why,string $fix,?array $evidence=null): void {
  $findings[]=['status'=>$status,'title'=>$title,'why'=>$why,'fix'=>$fix,'evidence'=>$evidence];
}

$resolvers=[
  ['name'=>'Cloudflare','base'=>'https://cloudflare-dns.com/dns-query'],
  ['name'=>'Google','base'=>'https://dns.google/resolve']
];

$checks=[];
foreach($resolvers as $resolver){
  $validatedA=dnssec_doh($resolver['name'],$resolver['base'],$domain,'A',false);
  $uncheckedA=dnssec_doh($resolver['name'],$resolver['base'],$domain,'A',true);
  $ds=dnssec_doh($resolver['name'],$resolver['base'],$domain,'DS',false);
  $dnskey=dnssec_doh($resolver['name'],$resolver['base'],$domain,'DNSKEY',false);
  $checks[$resolver['name']]=[
    'validated_a'=>$validatedA,
    'unchecked_a'=>$uncheckedA,
    'ds'=>$ds,
    'dnskey'=>$dnskey
  ];
}

$dsMap=[];$keyMap=[];
foreach($checks as $resolver=>$set){
  foreach(dnssec_records($set['ds'],43) as $r){
    $parsed=dnssec_parse_ds($r['data']);
    $key=implode('|',[$parsed['key_tag'],$parsed['algorithm'],$parsed['digest_type'],$parsed['digest']]);
    $dsMap[$key]=array_merge($r,$parsed,[
      'algorithm_name'=>dnssec_alg_name($parsed['algorithm']),
      'digest_name'=>dnssec_digest_name($parsed['digest_type'])
    ]);
  }
  foreach(dnssec_records($set['dnskey'],48) as $r){
    $parsed=dnssec_parse_dnskey($r['data']);
    $key=implode('|',[$parsed['flags'],$parsed['protocol'],$parsed['algorithm'],$parsed['public_key']]);
    $keyMap[$key]=array_merge($r,$parsed,['algorithm_name'=>dnssec_alg_name($parsed['algorithm'])]);
  }
}
$dsRecords=array_values($dsMap);
$dnskeyRecords=array_values($keyMap);

$resolverSummary=[];
$secureVotes=0;$bogusVotes=0;$unsignedVotes=0;$usableVotes=0;
foreach($checks as $resolver=>$set){
  $v=$set['validated_a'];
  $u=$set['unchecked_a'];
  $usable=$v['ok'] && $u['ok'];
  if($usable)$usableVotes++;
  $secure=$usable && $v['status']===0 && $v['ad']===true;
  $bogus=$usable && $v['status']===2 && $u['status']===0;
  $unsigned=$usable && $v['status']===0 && $v['ad']===false && $u['status']===0;
  if($secure)$secureVotes++;
  if($bogus)$bogusVotes++;
  if($unsigned)$unsignedVotes++;
  $resolverSummary[]=[
    'resolver'=>$resolver,
    'validated_status'=>$v['status'],
    'validated_status_name'=>dnssec_status_name($v['status']),
    'ad'=>$v['ad'],
    'unchecked_status'=>$u['status'],
    'unchecked_status_name'=>dnssec_status_name($u['status']),
    'validation_passed'=>$secure,
    'validation_failure_pattern'=>$bogus,
    'time_ms'=>$v['time_ms'],
    'comment'=>$v['comment']??null
  ];
}

$hasDS=count($dsRecords)>0;
$hasDNSKEY=count($dnskeyRecords)>0;
$verdict='indeterminate';
$verdictLabel='Indeterminate';
$verdictWhy='The resolver evidence was not sufficient for a confident DNSSEC classification.';

if($bogusVotes>=1 && $secureVotes===0){
  $verdict='bogus';
  $verdictLabel='Broken DNSSEC';
  $verdictWhy='At least one validating resolver returned SERVFAIL while the same query succeeded with DNSSEC checking disabled, a strong sign of DNSSEC validation failure.';
}elseif($secureVotes>=1){
  $verdict='secure';
  $verdictLabel='DNSSEC validates';
  $verdictWhy='At least one validating resolver authenticated the response and set the AD flag.';
}elseif($usableVotes>=1 && !$hasDS && !$hasDNSKEY && $unsignedVotes>=1){
  $verdict='unsigned';
  $verdictLabel='DNSSEC not enabled';
  $verdictWhy='Validating resolvers returned the domain successfully without authenticated DNSSEC data, and this check did not find DS or DNSKEY records.';
}elseif($hasDS xor $hasDNSKEY){
  $verdict='partial';
  $verdictLabel='Partial DNSSEC configuration';
  $verdictWhy='Only one side of the expected DS/DNSKEY relationship was visible, so the DNSSEC configuration needs review.';
}elseif($usableVotes>=1 && $unsignedVotes>=1){
  $verdict='unsigned_or_island';
  $verdictLabel='Not validated';
  $verdictWhy='The domain resolved, but validating resolvers did not authenticate the answer. DNSKEY material without a parent DS can create an unsigned island of security.';
}

$findings=[];

if($verdict==='secure'){
  dnssec_add($findings,'present','Resolver validation passed',
    'A validating public resolver returned a successful answer with the DNSSEC Authenticated Data (AD) flag set.',
    'Keep registrar DS records and authoritative DNSSEC signing synchronized during key rollovers.',
    ['secure_resolvers'=>array_values(array_map(fn($x)=>$x['resolver'],array_filter($resolverSummary,fn($x)=>$x['validation_passed'])))]);
}elseif($verdict==='bogus'){
  dnssec_add($findings,'critical','DNSSEC validation failure detected',
    'A validating resolver failed the query while the same resolver could answer when DNSSEC checking was disabled.',
    'Check the parent DS record, DNSKEY set, active signatures and key rollover state. Broken DNSSEC can make the domain unreachable to validating resolvers.',
    ['resolvers'=>array_values(array_map(fn($x)=>$x['resolver'],array_filter($resolverSummary,fn($x)=>$x['validation_failure_pattern'])))]);
}elseif($verdict==='unsigned'){
  dnssec_add($findings,'informational','Domain is not DNSSEC-signed',
    'The domain resolved normally, but no authenticated DNSSEC chain was observed and no DS/DNSKEY records were found by this check.',
    'Enable DNSSEC only when your DNS provider and registrar both support a coordinated signing and DS-publication workflow.',
    null);
}else{
  dnssec_add($findings,'review','DNSSEC state needs review',
    $verdictWhy,
    'Compare the registrar DS configuration with the authoritative zone DNSKEYs and confirm the domain validates through a public validating resolver.',
    null);
}

if($hasDS){
  dnssec_add($findings,'present','DS record found at the delegation',
    'A DS record is visible through recursive DNS and links the child zone into a parent-side DNSSEC delegation.',
    'During key changes, make sure the DS record published through the registrar corresponds to an active key-signing key.',
    ['count'=>count($dsRecords)]);
}else{
  dnssec_add($findings,$verdict==='unsigned'?'informational':'review','No DS record found',
    'No DS answer was visible for this domain. Without a parent DS record, a child zone cannot form an authenticated chain of trust to the parent.',
    'If DNSSEC is intended, publish the correct DS record through the registrar after the authoritative zone is signed.',
    null);
}

if($hasDNSKEY){
  dnssec_add($findings,'present','DNSKEY record found',
    'The zone publishes DNSKEY material that can be used by validating resolvers during DNSSEC validation.',
    'Keep key rollovers coordinated with signatures and parent DS records.',
    ['count'=>count($dnskeyRecords)]);
}else{
  dnssec_add($findings,$verdict==='unsigned'?'informational':'review','No DNSKEY record found',
    'No DNSKEY answer was visible for this domain in the current resolver responses.',
    'If DNSSEC is intended, confirm the authoritative DNS provider is signing the correct zone and publishing DNSKEY records.',
    null);
}

$sha1Ds=array_values(array_filter($dsRecords,fn($x)=>(int)($x['digest_type']??0)===1));
if($sha1Ds){
  dnssec_add($findings,'review','SHA-1 DS digest present',
    'One or more DS records use digest type 1 (SHA-1), an older digest option.',
    'Review current registry and DNS provider recommendations and prefer stronger supported digest types when performing a controlled rollover.',
    ['count'=>count($sha1Ds)]);
}

$alg5=array_values(array_filter($dnskeyRecords,fn($x)=>in_array((int)($x['algorithm']??0),[5,7],true)));
if($alg5){
  dnssec_add($findings,'review','Legacy RSA/SHA-1 DNSKEY algorithm present',
    'One or more DNSKEY records use an older RSA/SHA-1 DNSSEC algorithm.',
    'Plan a supported algorithm rollover with your DNS provider and registrar rather than changing keys manually without coordination.',
    ['count'=>count($alg5)]);
}

if(count($resolverSummary)>=2){
  $first=$resolverSummary[0];$second=$resolverSummary[1];
  if($first['validated_status']!==$second['validated_status'] || $first['ad']!==$second['ad']){
    dnssec_add($findings,'review','Validating resolvers disagree',
      'Cloudflare and Google did not return the same validation status for the tested query.',
      'Recheck after DNS caches converge and inspect authoritative DNSSEC data if disagreement persists.',
      ['resolvers'=>$resolverSummary]);
  }else{
    dnssec_add($findings,'present','Validating resolvers agree',
      'Cloudflare and Google returned the same validation status for the tested query.',
      'Use repeated checks around DNSSEC changes because resolver caches can temporarily expose different states.',
      ['status'=>$first['validated_status_name'],'ad'=>$first['ad']]);
  }
}

$counts=['present'=>0,'review'=>0,'critical'=>0,'informational'=>0];
foreach($findings as $f) if(isset($counts[$f['status']]))$counts[$f['status']]++;

out([
  'ok'=>true,
  'domain'=>$domain,
  'verdict'=>$verdict,
  'verdict_label'=>$verdictLabel,
  'verdict_explanation'=>$verdictWhy,
  'summary'=>$counts,
  'resolver_summary'=>$resolverSummary,
  'ds_records'=>$dsRecords,
  'dnskey_records'=>$dnskeyRecords,
  'findings'=>$findings,
  'methodology'=>[
    'The checker queries Cloudflare and Google DNS-over-HTTPS with DNSSEC validation enabled and requests DNSSEC data with the DO bit.',
    'The AD flag is resolver evidence that the returned data validated with DNSSEC; this tool does not independently perform cryptographic signature verification.',
    'A SERVFAIL result with validation enabled but a successful response with checking disabled is treated as strong evidence of a bogus DNSSEC state.',
    'DS and DNSKEY presence is reported separately because publishing key material is not the same as successful end-to-end validation.',
    'Results are point-in-time resolver observations and can differ temporarily during DNS or key rollovers.'
  ]
]);
