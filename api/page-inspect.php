<?php
require __DIR__.'/common.php';
rate_limit('page-inspect', 20, 60);
$url=normalize_url($_GET['url'] ?? '');
$mode=$_GET['mode'] ?? 'meta';
$r=curl_body($url, 1048576);
if($r['status']<200 || $r['status']>=400) out(['error'=>'Page returned HTTP '.$r['status']],502);
$html=$r['body'];

libxml_use_internal_errors(true);
$dom=new DOMDocument();
@$dom->loadHTML($html, LIBXML_NOWARNING|LIBXML_NOERROR);
$xpath=new DOMXPath($dom);

function first_text(DOMXPath $x,string $q): ?string {
  $n=$x->query($q)->item(0);
  return $n ? trim((string)$n->nodeValue) : null;
}
function meta_content(DOMXPath $x,string $attr,string $value): ?string {
  $q='//meta[translate(@'.$attr.',"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="'.strtolower($value).'"]/@content';
  $n=$x->query($q)->item(0);
  return $n ? trim((string)$n->nodeValue) : null;
}

if($mode==='meta'){
  $canonical=$xpath->query('//link[translate(@rel,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="canonical"]/@href')->item(0);
  out(['ok'=>true,'result'=>[
    'url'=>$url,
    'status'=>$r['status'],
    'title'=>first_text($xpath,'//title'),
    'description'=>meta_content($xpath,'name','description'),
    'robots'=>meta_content($xpath,'name','robots'),
    'canonical'=>$canonical?trim((string)$canonical->nodeValue):null,
    'h1_count'=>$xpath->query('//h1')->length
  ]]);
}
if($mode==='og'){
  $props=['og:title','og:description','og:url','og:image','og:type','og:site_name'];
  $data=[];
  foreach($props as $p){$data[$p]=meta_content($xpath,'property',$p);}
  out(['ok'=>true,'result'=>['url'=>$url,'status'=>$r['status'],'open_graph'=>$data]]);
}
out(['error'=>'Unsupported inspection mode.'],400);
