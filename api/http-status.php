<?php
require __DIR__.'/common.php';
$url=normalize_url($_GET['url'] ?? '');
$r=curl_headers($url);
out(['ok'=>true,'result'=>$r]);
