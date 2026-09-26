<?php
require __DIR__.'/common.php';
rate_limit('http-status', 30, 60);
$url=normalize_url($_GET['url'] ?? '');
$r=curl_headers($url);
out(['ok'=>true,'result'=>$r]);
