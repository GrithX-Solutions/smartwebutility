<?php
declare(strict_types=1);
require __DIR__.'/common.php';

rate_limit('reverse-dns-check', 30, 60);

$ip=trim((string)($_GET['ip'] ?? ''));
$ip=trim($ip, "[] \t\n\r\0\x0B");
if (!filter_var($ip,FILTER_VALIDATE_IP)) out(['error'=>'Enter a valid IPv4 or IPv6 address.'],400);
if (!public_ip($ip)) out(['error'=>'Private, reserved, loopback and documentation IP addresses are not allowed.'],400);

function rdns_reverse_name(string $ip): string {
  if (filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4)) {
    return implode('.',array_reverse(explode('.',$ip))).'.in-addr.arpa';
  }
  $packed=inet_pton($ip);
  if ($packed===false) out(['error'=>'Could not parse the IPv6 address.'],400);
  return implode('.',array_reverse(str_split(bin2hex($packed)))).'.ip6.arpa';
}

function rdns_status_name(?int $status): string {
  $m=[0=>'NOERROR',1=>'FORMERR',2=>'SERVFAIL',3=>'NXDOMAIN',4=>'NOTIMP',5=>'REFUSED'];
  return $m[$status]??($status===null?'Unknown':'RCODE '.$status);
}

function rdns_doh(string $resolver,string $base,string $name,string $type): array {
  $url=$base.'?name='.rawurlencode($name).'&type='.rawurlencode($type);
  $ch=curl_init($url);
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>true,
    CURLOPT_CONNECTTIMEOUT=>5,
    CURLOPT_TIMEOUT=>10,
    CURLOPT_HTTPHEADER=>['Accept: application/dns-json'],
    CURLOPT_USERAGENT=>'SmartWebUtility/1.0 (+https://smartwebutility.com/)'
  ]);
  $start=microtime(true);
  $raw=curl_exec($ch);
  $elapsed=(microtime(true)-$start)*1000;
  $err=curl_error($ch);
  $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);
  curl_close($ch);
  if($raw===false || $code<200 || $code>=300){
    return ['resolver'=>$resolver,'ok'=>false,'http_status'=>$code,'error'=>$err?:'HTTP '.$code,'status'=>null,'answers'=>[],'time_ms'=>(int)round($elapsed)];
  }
  $j=json_decode($raw,true);
  if(!is_array($j)){
    return ['resolver'=>$resolver,'ok'=>false,'http_status'=>$code,'error'=>'Invalid DNS-over-HTTPS JSON response.','status'=>null,'answers'=>[],'time_ms'=>(int)round($elapsed)];
  }
  return [
    'resolver'=>$resolver,
    'ok'=>true,
    'http_status'=>$code,
    'error'=>null,
    'status'=>isset($j['Status'])?(int)$j['Status']:null,
    'answers'=>array_values(array_filter($j['Answer']??[],fn($x)=>is_array($x))),
    'time_ms'=>(int)round($elapsed)
  ];
}

function rdns_same_ip(string $a,string $b): bool {
  $pa=@inet_pton($a); $pb=@inet_pton($b);
  return $pa!==false && $pb!==false && hash_equals($pa,$pb);
}

function rdns_answer_values(array $response,int $type): array {
  $out=[];
  foreach($response['answers']??[] as $r){
    if((int)($r['type']??0)!==$type) continue;
    $value=trim((string)($r['data']??''));
    if($value!=='') $out[]=['value'=>$value,'ttl'=>isset($r['TTL'])?(int)$r['TTL']:null];
  }
  return $out;
}

$resolverDefs=[
  ['name'=>'Cloudflare','base'=>'https://cloudflare-dns.com/dns-query'],
  ['name'=>'Google','base'=>'https://dns.google/resolve']
];

$reverseName=rdns_reverse_name($ip);
$resolverResults=[];
$ptrMap=[];

foreach($resolverDefs as $resolver){
  $response=rdns_doh($resolver['name'],$resolver['base'],$reverseName,'PTR');
  $ptr=[];
  foreach(rdns_answer_values($response,12) as $answer){
    $hostname=rtrim($answer['value'],'.');
    if($hostname==='') continue;
    $ptr[]=['hostname'=>$hostname,'ttl'=>$answer['ttl']];
    $key=strtolower($hostname);
    if(!isset($ptrMap[$key])) $ptrMap[$key]=['hostname'=>$hostname,'ttl'=>$answer['ttl'],'resolvers'=>[]];
    if($ptrMap[$key]['ttl']===null && $answer['ttl']!==null) $ptrMap[$key]['ttl']=$answer['ttl'];
    $ptrMap[$key]['resolvers'][]=$resolver['name'];
  }
  $resolverResults[]=[
    'resolver'=>$resolver['name'],
    'ok'=>$response['ok'],
    'status'=>$response['status'],
    'status_name'=>rdns_status_name($response['status']),
    'time_ms'=>$response['time_ms'],
    'error'=>$response['error'],
    'ptr'=>$ptr
  ];
}

$ptrRecords=[];
foreach(array_slice(array_values($ptrMap),0,10) as $entry){
  $aMap=[]; $aaaaMap=[];
  foreach($resolverDefs as $resolver){
    $a=rdns_doh($resolver['name'],$resolver['base'],$entry['hostname'],'A');
    foreach(rdns_answer_values($a,1) as $answer){
      if(filter_var($answer['value'],FILTER_VALIDATE_IP,FILTER_FLAG_IPV4) && public_ip($answer['value'])) $aMap[$answer['value']]=true;
    }
    $aaaa=rdns_doh($resolver['name'],$resolver['base'],$entry['hostname'],'AAAA');
    foreach(rdns_answer_values($aaaa,28) as $answer){
      if(filter_var($answer['value'],FILTER_VALIDATE_IP,FILTER_FLAG_IPV6) && public_ip($answer['value'])) $aaaaMap[$answer['value']]=true;
    }
  }
  $ipv4=array_keys($aMap); $ipv6=array_keys($aaaaMap);
  $confirmed=false;
  foreach(array_merge($ipv4,$ipv6) as $candidate){
    if(rdns_same_ip($ip,$candidate)){ $confirmed=true; break; }
  }
  $ptrRecords[]=[
    'hostname'=>$entry['hostname'],
    'ttl'=>$entry['ttl'],
    'resolvers'=>array_values(array_unique($entry['resolvers'])),
    'ipv4'=>$ipv4,
    'ipv6'=>$ipv6,
    'forward_confirmed'=>$confirmed
  ];
}

$ptrSets=[];
foreach($resolverResults as $r){
  $set=array_map(fn($x)=>strtolower((string)$x['hostname']),$r['ptr']);
  sort($set);
  if($r['ok']) $ptrSets[]=implode('|',$set);
}
$resolverAgreement=count(array_unique($ptrSets))<=1;

$confirmedCount=count(array_filter($ptrRecords,fn($x)=>$x['forward_confirmed']));
$fcrdnsStatus='not_applicable';
if(count($ptrRecords)>0) $fcrdnsStatus=$confirmedCount>0?'confirmed':'failed';

$findings=[];
if(count($ptrRecords)===0){
  $findings[]=['status'=>'review','title'=>'No PTR hostname found','why'=>'The checked public resolvers did not return a PTR record for this IP address.','action'=>'If you control this IP and need reverse DNS, configure PTR through the provider that controls the IP block.'];
}else{
  $findings[]=['status'=>'present','title'=>'PTR record found','why'=>'At least one public resolver returned a PTR hostname for the IP address.','action'=>'Confirm the hostname is intentional and still belongs to the service using this IP.'];
}
if($fcrdnsStatus==='confirmed'){
  $findings[]=['status'=>'present','title'=>'Forward-confirmed reverse DNS passed','why'=>'At least one PTR hostname resolves forward through A or AAAA records to the original IP address.','action'=>'Keep the PTR and forward records synchronized when moving the service.'];
}elseif($fcrdnsStatus==='failed'){
  $findings[]=['status'=>'review','title'=>'PTR does not forward-confirm','why'=>'PTR hostname data exists, but the checked A/AAAA answers did not point back to the original IP.','action'=>'Review the PTR hostname and its forward A/AAAA records, especially for outbound mail infrastructure.'];
}
if(!$resolverAgreement){
  $findings[]=['status'=>'review','title'=>'Resolvers disagree','why'=>'Google and Cloudflare returned different PTR hostname sets. This can happen during a recent reverse-DNS change or cache transition.','action'=>'Recheck after DNS caches have had time to update and confirm the provider-side PTR configuration.'];
}else{
  $findings[]=['status'=>'present','title'=>'Resolvers agree','why'=>'Google and Cloudflare returned the same PTR hostname set for this lookup.','action'=>'No resolver-specific discrepancy was observed at check time.'];
}

out([
  'ok'=>true,
  'ip'=>$ip,
  'family'=>filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4)?'IPv4':'IPv6',
  'reverse_name'=>$reverseName,
  'ptr_records'=>$ptrRecords,
  'resolvers'=>$resolverResults,
  'resolver_agreement'=>$resolverAgreement,
  'fcrdns'=>['status'=>$fcrdnsStatus,'confirmed_count'=>$confirmedCount,'ptr_count'=>count($ptrRecords)],
  'findings'=>$findings,
  'checked_at'=>gmdate('Y-m-d H:i:s').' UTC',
  'methodology'=>'The checker converts the public IP into its standards-based reverse DNS name, queries PTR through Cloudflare and Google DNS-over-HTTPS, then resolves each returned hostname through A and AAAA queries and compares those addresses with the original IP. Private, reserved, loopback and documentation address ranges are rejected. Public resolver caches can briefly disagree after a PTR change.'
]);
