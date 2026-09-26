<?php
require __DIR__.'/common.php';
$host=clean_host($_GET['host'] ?? '');
$type=strtoupper($_GET['type'] ?? 'A');
$allowed=['A','AAAA','MX','TXT','CNAME','NS','CAA'];
if(!in_array($type,$allowed,true)) out(['error'=>'Unsupported DNS record type.'],400);

function doh(string $name,string $base,string $host,string $type): array {
  $url=$base.'?name='.rawurlencode($host).'&type='.rawurlencode($type);
  $ch=curl_init($url);
  curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>8,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_HTTPHEADER=>['Accept: application/dns-json'],CURLOPT_USERAGENT=>'SmartWebUtility/1.0']);
  $raw=curl_exec($ch);$err=curl_error($ch);$code=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
  if($raw===false||$code<200||$code>=300)return ['resolver'=>$name,'ok'=>false,'error'=>$err?:'HTTP '.$code,'answers'=>[]];
  $j=json_decode($raw,true);$ans=[];
  foreach(($j['Answer']??[]) as $a){if(isset($a['data']))$ans[]=(string)$a['data'];}
  return ['resolver'=>$name,'ok'=>true,'status'=>$j['Status']??null,'answers'=>array_values(array_unique($ans))];
}
$results=[
  doh('Cloudflare','https://cloudflare-dns.com/dns-query',$host,$type),
  doh('Google','https://dns.google/resolve',$host,$type)
];
$local=[];
$dnsConst=constant('DNS_'.$type);
if($dnsConst){
  foreach((@dns_get_record($host,$dnsConst)?:[]) as $r){
    $v=$r['ip']??$r['ipv6']??$r['target']??$r['txt']??null;
    if($v!==null)$local[]=(string)$v;
  }
}
$results[]=['resolver'=>'Server resolver','ok'=>true,'answers'=>array_values(array_unique($local))];
out(['ok'=>true,'host'=>$host,'type'=>$type,'results'=>$results]);
