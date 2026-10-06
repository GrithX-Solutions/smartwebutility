<?php
define('SWU_SITEMAP_LIBRARY_ONLY', true);
require __DIR__.'/../api/sitemap-check.php';

$valid = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc><lastmod>2026-10-05</lastmod></url><url><loc>https://example.com/about/</loc><lastmod>2026-10-05T12:30:00+00:00</lastmod></url></urlset>';
$v = analyze_sitemap_xml($valid, 'https://example.com/sitemap.xml');
if (
  !$v['protocol_valid'] ||
  !$v['namespace_ok'] ||
  $v['entries'] !== 2 ||
  $v['invalid_locs'] !== 0 ||
  $v['invalid_lastmod'] !== 0
) {
  fwrite(STDERR, "valid fixture failed\n");
  exit(2);
}

$bad = '<?xml version="1.0"?><urlset><url><loc>https://example.com/a</loc><lastmod>not-a-date</lastmod><changefreq>sometimes</changefreq><priority>1.5</priority></url><url><loc>https://example.com/a</loc></url><url><loc>/relative</loc></url></urlset>';
$b = analyze_sitemap_xml($bad, 'https://example.com/sitemap.xml');
if (
  $b['protocol_valid'] ||
  $b['namespace_ok'] ||
  $b['entries'] !== 3 ||
  $b['duplicates'] !== 1 ||
  $b['invalid_locs'] !== 1 ||
  $b['invalid_lastmod'] !== 1 ||
  $b['invalid_changefreq'] !== 1 ||
  $b['invalid_priority'] !== 1
) {
  fwrite(STDERR, json_encode($b, JSON_UNESCAPED_SLASHES)."\n");
  exit(3);
}

$index = '<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://example.com/sitemap-a.xml</loc></sitemap><sitemap><loc>https://example.com/sitemap-b.xml</loc></sitemap></sitemapindex>';
$i = analyze_sitemap_xml($index, 'https://example.com/sitemap-index.xml');
if (!$i['protocol_valid'] || $i['type'] !== 'sitemapindex' || $i['entries'] !== 2) {
  fwrite(STDERR, "sitemap index fixture failed\n");
  exit(4);
}

echo json_encode([
  'valid' => ['protocol_valid' => $v['protocol_valid'], 'entries' => $v['entries']],
  'invalid' => [
    'issues' => count($b['issues']),
    'warnings' => count($b['warnings']),
    'duplicates' => $b['duplicates'],
    'invalid_locs' => $b['invalid_locs'],
    'invalid_lastmod' => $b['invalid_lastmod']
  ],
  'index' => ['protocol_valid' => $i['protocol_valid'], 'entries' => $i['entries']]
], JSON_UNESCAPED_SLASHES).PHP_EOL;
