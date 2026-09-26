<?php
require __DIR__.'/common.php';
rate_limit('sitemap-check', 15, 60);
$url=normalize_url($_GET['url'] ?? '');
$r=curl_body($url, 2097152);
if($r['status']<200 || $r['status']>=400) out(['error'=>'Sitemap returned HTTP '.$r['status']],502);
$xml=trim($r['body']);
if($xml==='') out(['error'=>'Empty sitemap response.'],422);
libxml_use_internal_errors(true);
$doc=simplexml_load_string($xml);
if($doc===false) out(['error'=>'Response is not valid XML.'],422);
$root=$doc->getName();
$count=0;$sample=[];
if($root==='urlset'){
  foreach($doc->url as $u){$loc=trim((string)$u->loc);if($loc!==''){if(count<20)$sample[]=$loc;$count++;}}
}elseif($root==='sitemapindex'){
  foreach($doc->sitemap as $u){$loc=trim((string)$u->loc);if($loc!==''){if(count<20)$sample[]=$loc;$count++;}}
}else out(['error'=>'XML root is not urlset or sitemapindex.'],422);
out(['ok'=>true,'result'=>['url'=>$url,'status'=>$r['status'],'type'=>$root,'entries'=>$count,'sample'=>$sample,'truncated'=>$r['truncated']]]);
