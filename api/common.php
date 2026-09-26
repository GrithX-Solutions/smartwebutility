<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(array $data, int $status=200): never {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}
function public_ip(string $ip): bool {
  return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
}
function clean_host(string $host): string {
  $host = strtolower(trim($host));
  $host = rtrim($host, '.');
  if ($host === '' || strlen($host) > 253) out(['error'=>'Invalid hostname.'],400);
  if (filter_var($host, FILTER_VALIDATE_IP)) {
    if (!public_ip($host)) out(['error'=>'Private or reserved IP addresses are not allowed.'],400);
    return $host;
  }
  if (!preg_match('/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i', $host)) out(['error'=>'Enter a valid public hostname.'],400);
  return $host;
}
function resolve_public(string $host): array {
  if (filter_var($host, FILTER_VALIDATE_IP)) return [$host];
  $ips=[];
  $records=@dns_get_record($host, DNS_A | DNS_AAAA) ?: [];
  foreach($records as $r){
    $ip=$r['ip'] ?? $r['ipv6'] ?? null;
    if ($ip && public_ip($ip)) $ips[]=$ip;
  }
  $ips=array_values(array_unique($ips));
  if (!$ips) out(['error'=>'Hostname did not resolve to a public IP address.'],400);
  return $ips;
}
function normalize_url(string $raw): string {
  $raw=trim($raw);
  if ($raw==='') out(['error'=>'URL is required.'],400);
  if (!preg_match('~^https?://~i',$raw)) $raw='https://'.$raw;
  $p=parse_url($raw);
  if (!$p || !isset($p['host'])) out(['error'=>'Enter a valid HTTP or HTTPS URL.'],400);
  $scheme=strtolower($p['scheme'] ?? '');
  if (!in_array($scheme,['http','https'],true)) out(['error'=>'Only http:// and https:// URLs are allowed.'],400);
  if (isset($p['user']) || isset($p['pass'])) out(['error'=>'URLs with embedded credentials are not allowed.'],400);
  if (isset($p['port']) && !in_array((int)$p['port'],[80,443,8080,8443],true)) out(['error'=>'Only common web ports are allowed.'],400);
  clean_host($p['host']);
  resolve_public($p['host']);
  return $raw;
}
function absolute_url(string $base, string $location): string {
  $location=trim($location);
  if (preg_match('~^https?://~i',$location)) return $location;
  $b=parse_url($base);
  if (!$b || !isset($b['scheme'],$b['host'])) return $location;
  if (str_starts_with($location,'//')) return $b['scheme'].':'.$location;
  $port=isset($b['port'])?':'.$b['port']:'';
  $origin=$b['scheme'].'://'.$b['host'].$port;
  if (str_starts_with($location,'/')) return $origin.$location;
  $path=$b['path'] ?? '/';
  $dir=preg_replace('~/[^/]*$~','/',$path);
  return $origin.$dir.$location;
}
function curl_headers(string $url): array {
  $p=parse_url($url); $host=clean_host($p['host'] ?? ''); $ips=resolve_public($host); $ip=$ips[0];
  $port=(int)($p['port'] ?? (($p['scheme'] ?? 'https')==='https'?443:80));
  $ch=curl_init($url);
  $headers=[];
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>true,
    CURLOPT_NOBODY=>true,
    CURLOPT_HEADER=>false,
    CURLOPT_FOLLOWLOCATION=>false,
    CURLOPT_CONNECTTIMEOUT=>6,
    CURLOPT_TIMEOUT=>12,
    CURLOPT_USERAGENT=>'SmartWebUtility/1.0 (+https://smartwebutility.com/)',
    CURLOPT_SSL_VERIFYPEER=>true,
    CURLOPT_SSL_VERIFYHOST=>2,
    CURLOPT_RESOLVE=>[$host.':'.$port.':'.$ip],
    CURLOPT_HEADERFUNCTION=>function($ch,$line) use (&$headers){
      $len=strlen($line); $line=trim($line);
      if ($line!=='' && str_contains($line,':')) { [$k,$v]=array_map('trim',explode(':',$line,2)); $headers[strtolower($k)]=$v; }
      return $len;
    }
  ]);
  $start=microtime(true); $ok=curl_exec($ch); $elapsed=(microtime(true)-$start)*1000;
  $errno=curl_errno($ch); $err=curl_error($ch); $info=curl_getinfo($ch); curl_close($ch);
  if ($ok===false || $errno) out(['error'=>'Request failed: '.$err],502);
  return ['url'=>$url,'status'=>(int)($info['http_code']??0),'time_ms'=>(int)round($elapsed),'content_type'=>$info['content_type']??null,'ip'=>$info['primary_ip']??$ip,'headers'=>$headers];
}
