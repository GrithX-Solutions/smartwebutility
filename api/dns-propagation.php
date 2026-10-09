<?php
require __DIR__.'/common.php';

const SWU_DOH_RESPONSE_LIMIT = 262144;

rate_limit('dns-propagation', 30, 60);

$host=clean_host($_GET['host'] ?? '');
$type=strtoupper((string)($_GET['type'] ?? 'A'));
$allowed=['A','AAAA','MX','TXT','CNAME','NS','CAA'];
if(!in_array($type,$allowed,true)) out(['error'=>'Unsupported DNS record type.'],400);

function dns_type_code(string $type): int {
  return match($type){
    'A'=>1,
    'NS'=>2,
    'CNAME'=>5,
    'MX'=>15,
    'TXT'=>16,
    'AAAA'=>28,
    'CAA'=>257,
    default=>0
  };
}

function dns_type_name(?int $code): string {
  return match($code){
    1=>'A',
    2=>'NS',
    5=>'CNAME',
    6=>'SOA',
    12=>'PTR',
    15=>'MX',
    16=>'TXT',
    28=>'AAAA',
    33=>'SRV',
    257=>'CAA',
    default=>$code===null?'UNKNOWN':('TYPE'.$code)
  };
}

function dns_status_name(?int $code): ?string {
  if($code===null) return null;
  return match($code){
    0=>'NOERROR',
    1=>'FORMERR',
    2=>'SERVFAIL',
    3=>'NXDOMAIN',
    4=>'NOTIMP',
    5=>'REFUSED',
    default=>'RCODE '.$code
  };
}

function normalize_dns_answer(string $type,string $value): string {
  $value=trim($value);
  if($type==='TXT'){
    if(str_contains($value,'"') && preg_match_all('/"((?:\\\\.|[^"\\\\])*)"/',$value,$matches) && !empty($matches[1])){
      $parts=[];
      foreach($matches[1] as $part) $parts[]=stripcslashes($part);
      $value=implode('',$parts);
    } elseif(strlen($value)>=2 && $value[0]==='"' && $value[strlen($value)-1]==='"'){
      $value=substr($value,1,-1);
    }
    return preg_replace('/\s+/',' ',$value) ?? $value;
  }
  if(in_array($type,['CNAME','NS'],true)){
    return strtolower(rtrim($value,'.'));
  }
  if($type==='MX'){
    if(preg_match('/^\s*(\d+)\s+(.+)$/',$value,$m)){
      return ((int)$m[1]).' '.strtolower(rtrim(trim($m[2]),'.'));
    }
    return strtolower(rtrim($value,'.'));
  }
  if($type==='CAA'){
    return strtolower(preg_replace('/\s+/',' ',trim($value)) ?? trim($value));
  }
  return strtolower($value);
}

function dns_records_from_json(array $json): array {
  $records=[];
  foreach(($json['Answer'] ?? []) as $answer){
    if(!is_array($answer) || !array_key_exists('data',$answer)) continue;
    $code=isset($answer['type']) ? (int)$answer['type'] : null;
    $records[]=[
      'name'=>isset($answer['name']) ? (string)$answer['name'] : null,
      'type'=>$code,
      'type_name'=>dns_type_name($code),
      'ttl'=>isset($answer['TTL']) ? (int)$answer['TTL'] : null,
      'data'=>(string)$answer['data']
    ];
  }
  return $records;
}

function resolver_result(
  string $name,
  string $base,
  string $host,
  string $type,
  ?callable $requester=null
): array {
  $requester=$requester ?? function(string $url): array {
    $body='';
    $truncated=false;
    $ch=curl_init($url);
    curl_setopt_array($ch,[
      CURLOPT_RETURNTRANSFER=>false,
      CURLOPT_FOLLOWLOCATION=>false,
      CURLOPT_TIMEOUT=>8,
      CURLOPT_CONNECTTIMEOUT=>4,
      CURLOPT_HTTPHEADER=>['Accept: application/dns-json'],
      CURLOPT_USERAGENT=>'SmartWebUtility/1.0 (+https://smartwebutility.com/)',
      CURLOPT_SSL_VERIFYPEER=>true,
      CURLOPT_SSL_VERIFYHOST=>2,
      CURLOPT_WRITEFUNCTION=>function($ch,$chunk) use (&$body,&$truncated){
        $remaining=SWU_DOH_RESPONSE_LIMIT-strlen($body);
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
    $errno=curl_errno($ch);
    $err=curl_error($ch);
    $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);
    curl_close($ch);
    if($truncated){
      return [
        'raw'=>false,
        'error'=>'Resolver response exceeded the 256 KB safety limit.',
        'http_status'=>$code,
        'latency_ms'=>(int)round($elapsed)
      ];
    }
    return [
      'raw'=>$ok===false?false:$body,
      'error'=>$ok===false||$errno?$err:'',
      'http_status'=>$code,
      'latency_ms'=>(int)round($elapsed)
    ];
  };

  $url=$base.'?name='.rawurlencode($host).'&type='.rawurlencode($type);
  $response=$requester($url);
  $raw=$response['raw'] ?? false;
  $httpStatus=(int)($response['http_status'] ?? 0);
  $latency=(int)($response['latency_ms'] ?? 0);

  if($raw===false || $httpStatus<200 || $httpStatus>=300){
    return [
      'resolver'=>$name,
      'ok'=>false,
      'error'=>trim((string)($response['error'] ?? '')) ?: 'HTTP '.$httpStatus,
      'http_status'=>$httpStatus ?: null,
      'dns_status'=>null,
      'status_name'=>null,
      'dnssec_authenticated'=>null,
      'latency_ms'=>$latency,
      'answers'=>[],
      'ttls'=>[],
      'records'=>[]
    ];
  }

  $json=json_decode((string)$raw,true);
  if(!is_array($json)){
    return [
      'resolver'=>$name,
      'ok'=>false,
      'error'=>'Resolver returned invalid JSON.',
      'http_status'=>$httpStatus,
      'dns_status'=>null,
      'status_name'=>null,
      'dnssec_authenticated'=>null,
      'latency_ms'=>$latency,
      'answers'=>[],
      'ttls'=>[],
      'records'=>[]
    ];
  }

  $records=dns_records_from_json($json);
  $wanted=dns_type_code($type);
  $answers=[];
  $ttls=[];
  foreach($records as $record){
    if($record['type']!==$wanted) continue;
    $answers[]=$record['data'];
    if($record['ttl']!==null) $ttls[]=$record['ttl'];
  }

  $answers=array_values(array_unique($answers));
  $ttls=array_values(array_unique($ttls));
  sort($ttls,SORT_NUMERIC);
  $dnsStatus=isset($json['Status']) ? (int)$json['Status'] : null;

  return [
    'resolver'=>$name,
    'ok'=>true,
    'http_status'=>$httpStatus,
    'dns_status'=>$dnsStatus,
    'status_name'=>dns_status_name($dnsStatus),
    'dnssec_authenticated'=>array_key_exists('AD',$json) ? (bool)$json['AD'] : null,
    'latency_ms'=>$latency,
    'answers'=>$answers,
    'ttls'=>$ttls,
    'records'=>$records
  ];
}

function local_record_value(string $type,array $record): ?string {
  return match($type){
    'A'=>isset($record['ip']) ? (string)$record['ip'] : null,
    'AAAA'=>isset($record['ipv6']) ? (string)$record['ipv6'] : null,
    'CNAME','NS'=>isset($record['target']) ? (string)$record['target'] : null,
    'MX'=>isset($record['target']) ? ((int)($record['pri'] ?? 0)).' '.(string)$record['target'] : null,
    'TXT'=>isset($record['txt'])
      ? (string)$record['txt']
      : (isset($record['entries']) && is_array($record['entries']) ? implode('',$record['entries']) : null),
    'CAA'=>isset($record['tag'],$record['value'])
      ? ((int)($record['flags'] ?? 0)).' '.(string)$record['tag'].' "'.(string)$record['value'].'"'
      : null,
    default=>null
  };
}

function local_resolver_result(string $host,string $type): array {
  $constant='DNS_'.$type;
  $dnsConst=defined($constant) ? constant($constant) : 0;
  $start=microtime(true);
  $raw=$dnsConst ? (@dns_get_record($host,$dnsConst) ?: []) : [];
  $latency=(int)round((microtime(true)-$start)*1000);

  $answers=[];
  $ttls=[];
  $records=[];
  foreach($raw as $record){
    if(!is_array($record)) continue;
    $value=local_record_value($type,$record);
    if($value===null) continue;
    $ttl=isset($record['ttl']) ? (int)$record['ttl'] : null;
    $answers[]=$value;
    if($ttl!==null) $ttls[]=$ttl;
    $records[]=[
      'name'=>isset($record['host']) ? (string)$record['host'] : $host,
      'type'=>dns_type_code($type),
      'type_name'=>$type,
      'ttl'=>$ttl,
      'data'=>$value
    ];
  }

  $answers=array_values(array_unique($answers));
  $ttls=array_values(array_unique($ttls));
  sort($ttls,SORT_NUMERIC);

  return [
    'resolver'=>'Server resolver',
    'ok'=>true,
    'http_status'=>null,
    'dns_status'=>null,
    'status_name'=>null,
    'dnssec_authenticated'=>null,
    'latency_ms'=>$latency,
    'answers'=>$answers,
    'ttls'=>$ttls,
    'records'=>$records
  ];
}

function normalized_answer_set(array $result,string $type): array {
  $values=[];
  foreach(($result['answers'] ?? []) as $value){
    $values[]=normalize_dns_answer($type,(string)$value);
  }
  $values=array_values(array_unique($values));
  sort($values,SORT_STRING);
  return $values;
}

function resolver_agreement(array $results,string $type): array {
  $public=array_values(array_filter(
    $results,
    fn($r)=>in_array($r['resolver'] ?? '',['Cloudflare','Google'],true)
  ));
  $publicComparable=count($public)===2 && !empty($public[0]['ok']) && !empty($public[1]['ok']);
  $publicAgreement=null;
  if($publicComparable){
    $publicAgreement=
      ($public[0]['dns_status'] ?? null)===($public[1]['dns_status'] ?? null)
      && normalized_answer_set($public[0],$type)===normalized_answer_set($public[1],$type);
  }

  $sets=[];
  foreach($results as $result){
    if(empty($result['ok'])) continue;
    $sets[$result['resolver']]=normalized_answer_set($result,$type);
  }
  $distinct=[];
  foreach($sets as $set){
    $key=json_encode($set,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
    $distinct[$key]=true;
  }

  return [
    'public_resolvers_comparable'=>$publicComparable,
    'public_resolvers_agree'=>$publicAgreement,
    'all_answer_sets_agree'=>count($sets)>=2 ? count($distinct)===1 : null,
    'distinct_answer_sets'=>count($distinct)
  ];
}

$results=[
  resolver_result('Cloudflare','https://cloudflare-dns.com/dns-query',$host,$type),
  resolver_result('Google','https://dns.google/resolve',$host,$type),
  local_resolver_result($host,$type)
];

$agreement=resolver_agreement($results,$type);
$findings=[];

if($agreement['public_resolvers_agree']===true){
  $findings[]='Google Public DNS and Cloudflare returned the same DNS status and requested-type answer set.';
} elseif($agreement['public_resolvers_agree']===false){
  $findings[]='Google Public DNS and Cloudflare disagree on the DNS status or requested-type answer set.';
} else {
  $findings[]='Google/Cloudflare agreement could not be determined because at least one public-resolver request failed.';
}

if($agreement['all_answer_sets_agree']===true){
  $findings[]='All successful resolver paths returned the same requested-type answer set.';
} elseif($agreement['all_answer_sets_agree']===false){
  $findings[]='At least two successful resolver paths returned different requested-type answer sets.';
}

foreach($results as $result){
  if(empty($result['ok'])){
    $findings[]=$result['resolver'].' request failed: '.($result['error'] ?? 'unknown error');
    continue;
  }
  if(($result['dns_status'] ?? null)!==null && (int)$result['dns_status']!==0){
    $findings[]=$result['resolver'].' returned '.($result['status_name'] ?? ('DNS status '.$result['dns_status'])).'.';
  }
}

out([
  'ok'=>true,
  'host'=>$host,
  'type'=>$type,
  'results'=>$results,
  'agreement'=>$agreement,
  'findings'=>$findings,
  'methodology'=>[
    'public_resolvers'=>['Cloudflare DNS over HTTPS','Google Public DNS over HTTPS'],
    'server_resolver'=>'PHP dns_get_record from the Smart Web Utility server environment',
    'worldwide_propagation'=>false
  ]
]);
