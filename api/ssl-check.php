<?php
require __DIR__.'/common.php';
$host=clean_host($_GET['host'] ?? '');
$ips=resolve_public($host); $ip=$ips[0];
$target=(str_contains($ip,':')?'['.$ip.']':$ip).':443';
$ctx=stream_context_create(['ssl'=>[
  'capture_peer_cert'=>true,'capture_peer_cert_chain'=>true,'verify_peer'=>true,'verify_peer_name'=>true,
  'peer_name'=>$host,'SNI_enabled'=>true,'disable_compression'=>true
]]);
$start=microtime(true);
$client=@stream_socket_client('tls://'.$target,$errno,$errstr,8,STREAM_CLIENT_CONNECT,$ctx);
$elapsed=(microtime(true)-$start)*1000;
if(!$client) out(['error'=>'TLS connection failed: '.($errstr ?: 'unable to connect')],502);
$params=stream_context_get_params($client); fclose($client);
$cert=$params['options']['ssl']['peer_certificate'] ?? null;
if(!$cert) out(['error'=>'No TLS certificate was returned.'],502);
$parsed=openssl_x509_parse($cert,false);
if(!$parsed) out(['error'=>'Certificate could not be parsed.'],502);
$from=(int)($parsed['validFrom_time_t']??0); $to=(int)($parsed['validTo_time_t']??0); $now=time();
$san=$parsed['extensions']['subjectAltName'] ?? '';
$sans=[]; if($san!=='') foreach(explode(',',$san) as $v){ $v=trim($v); $v=preg_replace('/^DNS:/','',$v); if($v!=='') $sans[]=$v; }
$issuer=$parsed['issuer']['CN'] ?? implode(', ',array_map(fn($k,$v)=>$k.'='.$v,array_keys($parsed['issuer']??[]),array_values($parsed['issuer']??[])));
$subject=$parsed['subject']['CN'] ?? $host;
out(['ok'=>true,'result'=>[
  'host'=>$host,'ip'=>$ip,'valid_now'=>($from<=$now && $to>=$now),'subject'=>$subject,'issuer'=>$issuer,
  'valid_from'=>$from?gmdate('c',$from):null,'valid_to'=>$to?gmdate('c',$to):null,
  'days_remaining'=>$to?(int)floor(($to-$now)/86400):null,'serial'=>$parsed['serialNumberHex']??null,
  'signature_type'=>$parsed['signatureTypeSN']??null,'sans'=>array_slice($sans,0,100),'connect_time_ms'=>(int)round($elapsed)
]]);
