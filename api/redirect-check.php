<?php
require __DIR__.'/common.php';
$url=normalize_url($_GET['url'] ?? '');
$chain=[]; $current=$url; $seen=[];
for($i=0;$i<10;$i++){
  if(isset($seen[$current])) { $chain[]=['url'=>$current,'error'=>'Redirect loop detected']; break; }
  $seen[$current]=true;
  $r=curl_headers($current);
  $loc=$r['headers']['location'] ?? null;
  $chain[]=['url'=>$current,'status'=>$r['status'],'time_ms'=>$r['time_ms'],'location'=>$loc];
  if(!in_array($r['status'],[301,302,303,307,308],true) || !$loc) break;
  $next=absolute_url($current,$loc);
  $current=normalize_url($next);
}
out(['ok'=>true,'chain'=>$chain,'final_url'=>$current,'redirects'=>max(0,count($chain)-1)]);
