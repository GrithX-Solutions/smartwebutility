<?php
require __DIR__.'/common.php';

const SWU_HEADER_REDIRECT_LIMIT = 3;

rate_limit('http-status', 30, 60);

function swu_header_request_once(string $url,string $method): array {
  $url=normalize_url($url);
  $p=parse_url($url);
  $host=clean_host($p['host'] ?? '');
  $ips=resolve_public($host);
  $ip=$ips[0];
  $scheme=strtolower((string)($p['scheme'] ?? 'https'));
  $port=(int)($p['port'] ?? ($scheme==='https'?443:80));
  $headers=[];
  $method=strtoupper($method);
  if(!in_array($method,['HEAD','GET'],true)) out(['error'=>'Unsupported HTTP method.'],400);

  $ch=curl_init($url);
  $options=[
    CURLOPT_RETURNTRANSFER=>false,
    CURLOPT_HEADER=>false,
    CURLOPT_FOLLOWLOCATION=>false,
    CURLOPT_CONNECTTIMEOUT=>6,
    CURLOPT_TIMEOUT=>12,
    CURLOPT_USERAGENT=>'SmartWebUtility/1.0 (+https://smartwebutility.com/)',
    CURLOPT_SSL_VERIFYPEER=>true,
    CURLOPT_SSL_VERIFYHOST=>2,
    CURLOPT_RESOLVE=>[$host.':'.$port.':'.$ip],
    CURLOPT_HEADERFUNCTION=>function($ch,$line) use (&$headers){
      $len=strlen($line);
      $line=trim($line);
      if($line!=='' && str_contains($line,':')){
        [$k,$v]=array_map('trim',explode(':',$line,2));
        $key=strtolower($k);
        $headers[$key] ??= [];
        $headers[$key][]=$v;
      }
      return $len;
    },
    // GET fallback is used only for headers; discard the response body as it arrives.
    CURLOPT_WRITEFUNCTION=>function($ch,$chunk){ return strlen($chunk); }
  ];
  if($method==='HEAD') $options[CURLOPT_NOBODY]=true;
  else $options[CURLOPT_HTTPGET]=true;
  curl_setopt_array($ch,$options);

  $start=microtime(true);
  $ok=curl_exec($ch);
  $elapsed=(microtime(true)-$start)*1000;
  $errno=curl_errno($ch);
  $err=curl_error($ch);
  $info=curl_getinfo($ch);
  curl_close($ch);

  if($ok===false || $errno){
    return ['ok'=>false,'error'=>'Request failed: '.$err,'url'=>$url,'method'=>$method];
  }

  $flat=[];
  foreach($headers as $name=>$values) $flat[$name]=implode(', ',$values);
  $headerCount=0;
  foreach($headers as $values) $headerCount+=count($values);

  return [
    'ok'=>true,
    'url'=>$url,
    'method'=>$method,
    'status'=>(int)($info['http_code'] ?? 0),
    'time_ms'=>(int)round($elapsed),
    'content_type'=>$info['content_type'] ?? null,
    'ip'=>$info['primary_ip'] ?? $ip,
    'headers'=>$flat,
    'headers_all'=>$headers,
    'header_count'=>$headerCount,
    'unique_header_count'=>count($headers)
  ];
}

function swu_header_request(string $url,string $requestedMethod,?callable $requester=null): array {
  $requester=$requester ?? 'swu_header_request_once';
  $requestedMethod=strtolower($requestedMethod);
  if(!in_array($requestedMethod,['auto','head','get'],true)) out(['error'=>'Method must be auto, head or get.'],400);

  $firstMethod=$requestedMethod==='get' ? 'GET' : 'HEAD';
  $response=$requester($url,$firstMethod);
  if(empty($response['ok'])) return $response;
  $attemptTime=(int)($response['time_ms'] ?? 0);

  $fallback=false;
  if($requestedMethod==='auto' && in_array((int)$response['status'],[405,501],true)){
    $fallbackResponse=$requester($url,'GET');
    if(empty($fallbackResponse['ok'])) return $fallbackResponse;
    $attemptTime+=(int)($fallbackResponse['time_ms'] ?? 0);
    $response=$fallbackResponse;
    $fallback=true;
  }

  $response['requested_method']=$requestedMethod;
  $response['method_fallback']=$fallback;
  $response['attempt_time_ms']=$attemptTime;
  return $response;
}

function swu_header_inspect(string $url,string $requestedMethod='auto',?callable $requester=null): array {
  $requestedUrl=normalize_url($url);
  $current=$requestedUrl;
  $redirects=[];
  $totalTime=0;
  $fallbackUsed=false;

  for($hop=0;$hop<=SWU_HEADER_REDIRECT_LIMIT;$hop++){
    $response=swu_header_request($current,$requestedMethod,$requester);
    if(empty($response['ok'])) out(['error'=>$response['error'] ?? 'Header request failed.'],502);
    $totalTime+=(int)($response['attempt_time_ms'] ?? $response['time_ms'] ?? 0);
    $fallbackUsed=$fallbackUsed || !empty($response['method_fallback']);
    $status=(int)$response['status'];

    if($status>=300 && $status<400){
      $locationValues=$response['headers_all']['location'] ?? [];
      $location=trim((string)($locationValues[0] ?? ''));
      if($location!==''){
        if($hop>=SWU_HEADER_REDIRECT_LIMIT) out(['error'=>'Page exceeded the '.SWU_HEADER_REDIRECT_LIMIT.'-redirect safety limit.'],502);
        $next=normalize_url(absolute_url($current,$location));
        $redirects[]=[
          'status'=>$status,
          'from'=>$current,
          'to'=>$next,
          'method'=>$response['method']
        ];
        $current=$next;
        continue;
      }
    }

    $duplicates=[];
    foreach($response['headers_all'] as $name=>$values){
      if(count($values)>1) $duplicates[$name]=count($values);
    }

    return [
      'url'=>$requestedUrl,
      'final_url'=>$current,
      'redirect_count'=>count($redirects),
      'redirects'=>$redirects,
      'requested_method'=>$requestedMethod,
      'method_used'=>$response['method'],
      'method_fallback'=>$fallbackUsed,
      'status'=>$status,
      'time_ms'=>$response['time_ms'],
      'total_time_ms'=>$totalTime,
      'content_type'=>$response['content_type'],
      'ip'=>$response['ip'],
      'header_count'=>$response['header_count'],
      'unique_header_count'=>$response['unique_header_count'],
      'duplicate_headers'=>$duplicates,
      'headers'=>$response['headers'],
      'headers_all'=>$response['headers_all']
    ];
  }

  out(['error'=>'Header redirect limit exceeded.'],502);
}

$url=normalize_url($_GET['url'] ?? '');
$mode=strtolower((string)($_GET['mode'] ?? 'status'));

if($mode==='headers'){
  $method=strtolower((string)($_GET['method'] ?? 'auto'));
  out(['ok'=>true,'result'=>swu_header_inspect($url,$method)]);
}

// Backward-compatible first-response HEAD contract used by HTTP Status Checker.
$r=curl_headers($url);
out(['ok'=>true,'result'=>$r]);
