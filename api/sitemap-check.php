<?php
require __DIR__.'/common.php';

const SWU_SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const SWU_SITEMAP_FETCH_LIMIT = 2097152;
const SWU_SITEMAP_REDIRECT_LIMIT = 3;

function sitemap_add_message(array &$messages, string $message, int $limit=20): void {
  if (count($messages) < $limit) $messages[] = $message;
}

function sitemap_child_nodes(SimpleXMLElement $node, string $localName): array {
  $nodes = $node->xpath('./*[local-name()="'.$localName.'"]');
  return is_array($nodes) ? $nodes : [];
}

function sitemap_child_text(SimpleXMLElement $node, string $localName): string {
  $nodes = sitemap_child_nodes($node, $localName);
  return $nodes ? trim((string)$nodes[0]) : '';
}

function sitemap_valid_lastmod(string $value): bool {
  if (!preg_match('/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/', $value)) return false;
  try {
    if (strlen($value) === 10) {
      $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
      $errors = DateTimeImmutable::getLastErrors();
      return $date instanceof DateTimeImmutable
        && ($errors === false || (($errors['warning_count'] ?? 0) === 0 && ($errors['error_count'] ?? 0) === 0))
        && $date->format('Y-m-d') === $value;
    }
    $date = new DateTimeImmutable($value);
    $errors = DateTimeImmutable::getLastErrors();
    return $date instanceof DateTimeImmutable
      && ($errors === false || (($errors['warning_count'] ?? 0) === 0 && ($errors['error_count'] ?? 0) === 0));
  } catch (Throwable) {
    return false;
  }
}

function sitemap_lastmod_future(string $value): bool {
  try {
    $date = new DateTimeImmutable($value);
    return $date > new DateTimeImmutable('+24 hours');
  } catch (Throwable) {
    return false;
  }
}

function analyze_sitemap_xml(string $xml, string $sourceUrl): array {
  libxml_use_internal_errors(true);
  libxml_clear_errors();
  $doc = simplexml_load_string($xml, SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
  if ($doc === false) {
    $errors = libxml_get_errors();
    $detail = $errors ? trim($errors[0]->message) : '';
    libxml_clear_errors();
    throw new RuntimeException('Response is not valid XML'.($detail !== '' ? ': '.$detail : '.'));
  }

  $root = $doc->getName();
  if (!in_array($root, ['urlset','sitemapindex'], true)) {
    throw new RuntimeException('XML root is not urlset or sitemapindex.');
  }

  $issues = [];
  $warnings = [];
  $rootDom = dom_import_simplexml($doc);
  $namespaceOk = $rootDom instanceof DOMElement && $rootDom->namespaceURI === SWU_SITEMAP_NAMESPACE;
  if (!$namespaceOk) {
    sitemap_add_message($issues, 'Missing or incorrect Sitemap protocol namespace on the root element.');
  }

  $entryName = $root === 'urlset' ? 'url' : 'sitemap';
  $entries = $doc->xpath('./*[local-name()="'.$entryName.'"]');
  $entries = is_array($entries) ? $entries : [];
  $entryCount = count($entries);

  if ($entryCount === 0) {
    sitemap_add_message($issues, 'The '.$root.' does not contain any direct <'.$entryName.'> entries.');
  }

  if ($entryCount > 50000) {
    sitemap_add_message($issues, 'This file contains more than the 50,000-entry sitemap protocol limit.');
  }

  $sample = [];
  $seen = [];
  $hosts = [];
  $schemes = [];
  $validLocs = 0;
  $invalidLocs = 0;
  $duplicates = 0;
  $lastmodCount = 0;
  $invalidLastmod = 0;
  $futureLastmod = 0;
  $changefreqCount = 0;
  $invalidChangefreq = 0;
  $priorityCount = 0;
  $invalidPriority = 0;
  $allowedChangefreq = ['always','hourly','daily','weekly','monthly','yearly','never'];

  foreach ($entries as $index => $entry) {
    $number = $index + 1;
    $locNodes = sitemap_child_nodes($entry, 'loc');
    $loc = $locNodes ? trim((string)$locNodes[0]) : '';

    if (count($locNodes) !== 1 || $loc === '') {
      $invalidLocs++;
      sitemap_add_message($issues, $entryName.' #'.$number.' must contain exactly one non-empty <loc>.');
    } else {
      $parts = parse_url($loc);
      $scheme = strtolower((string)($parts['scheme'] ?? ''));
      $host = strtolower((string)($parts['host'] ?? ''));
      $absolute = in_array($scheme, ['http','https'], true) && $host !== '';

      if (!$absolute || strlen($loc) > 2048) {
        $invalidLocs++;
        sitemap_add_message($issues, $entryName.' #'.$number.' has an invalid <loc>; use an absolute HTTP(S) URL no longer than 2,048 characters.');
      } else {
        $validLocs++;
        $hosts[$host] = true;
        $schemes[$scheme] = true;
        if (isset($seen[$loc])) {
          $duplicates++;
          sitemap_add_message($warnings, 'Duplicate <loc>: '.$loc);
        } else {
          $seen[$loc] = true;
        }
        if (count($sample) < 20) $sample[] = $loc;
      }
    }

    $lastmod = sitemap_child_text($entry, 'lastmod');
    if ($lastmod !== '') {
      $lastmodCount++;
      if (!sitemap_valid_lastmod($lastmod)) {
        $invalidLastmod++;
        sitemap_add_message($issues, $entryName.' #'.$number.' has an invalid <lastmod>: '.$lastmod);
      } elseif (sitemap_lastmod_future($lastmod)) {
        $futureLastmod++;
        sitemap_add_message($warnings, $entryName.' #'.$number.' has a future <lastmod>: '.$lastmod);
      }
    }

    if ($root === 'urlset') {
      $changefreq = strtolower(sitemap_child_text($entry, 'changefreq'));
      if ($changefreq !== '') {
        $changefreqCount++;
        if (!in_array($changefreq, $allowedChangefreq, true)) {
          $invalidChangefreq++;
          sitemap_add_message($issues, 'url #'.$number.' has an invalid <changefreq>: '.$changefreq);
        }
      }

      $priority = sitemap_child_text($entry, 'priority');
      if ($priority !== '') {
        $priorityCount++;
        if (!is_numeric($priority) || (float)$priority < 0 || (float)$priority > 1) {
          $invalidPriority++;
          sitemap_add_message($issues, 'url #'.$number.' has an invalid <priority>: '.$priority);
        }
      }
    }
  }

  $hostCount = count($hosts);
  if ($hostCount > 1) {
    sitemap_add_message(
      $warnings,
      'Multiple hosts appear in <loc> values. The Sitemap protocol generally expects one host; Google cross-site sitemaps require verified ownership/submission.'
    );
  }

  if (count($schemes) > 1) {
    sitemap_add_message($warnings, 'Mixed HTTP and HTTPS <loc> values were found. Review canonical protocol consistency before submission.');
  }

  if ($root === 'urlset' && ($changefreqCount > 0 || $priorityCount > 0)) {
    sitemap_add_message($warnings, 'Google currently ignores <changefreq> and <priority>; keep them only if another consumer needs them.');
  }

  return [
    'type' => $root,
    'protocol_valid' => count($issues) === 0,
    'namespace_ok' => $namespaceOk,
    'entries' => $entryCount,
    'valid_locs' => $validLocs,
    'invalid_locs' => $invalidLocs,
    'duplicates' => $duplicates,
    'hosts' => array_keys($hosts),
    'lastmod_count' => $lastmodCount,
    'invalid_lastmod' => $invalidLastmod,
    'future_lastmod' => $futureLastmod,
    'changefreq_count' => $changefreqCount,
    'invalid_changefreq' => $invalidChangefreq,
    'priority_count' => $priorityCount,
    'invalid_priority' => $invalidPriority,
    'issues' => $issues,
    'warnings' => $warnings,
    'sample' => $sample,
    'source_url' => $sourceUrl
  ];
}

function fetch_sitemap_with_redirects(string $url): array {
  $current = normalize_url($url);
  $redirects = [];

  for ($hop = 0; $hop <= SWU_SITEMAP_REDIRECT_LIMIT; $hop++) {
    $response = curl_body($current, SWU_SITEMAP_FETCH_LIMIT);
    $status = (int)$response['status'];

    if ($status >= 300 && $status < 400) {
      $location = trim((string)($response['headers']['location'] ?? ''));
      if ($location === '') throw new RuntimeException('Sitemap redirect did not include a Location header.');
      if ($hop >= SWU_SITEMAP_REDIRECT_LIMIT) throw new RuntimeException('Sitemap exceeded the '.$hop.'-redirect safety limit.');

      $next = normalize_url(absolute_url($current, $location));
      $redirects[] = ['status'=>$status,'from'=>$current,'to'=>$next];
      $current = $next;
      continue;
    }

    $response['final_url'] = $current;
    $response['redirects'] = $redirects;
    return $response;
  }

  throw new RuntimeException('Sitemap redirect limit exceeded.');
}

if (defined('SWU_SITEMAP_LIBRARY_ONLY') && SWU_SITEMAP_LIBRARY_ONLY) return;

rate_limit('sitemap-check', 15, 60);

try {
  $requestedUrl = normalize_url($_GET['url'] ?? '');
  $r = fetch_sitemap_with_redirects($requestedUrl);

  if ($r['status'] < 200 || $r['status'] >= 300) {
    out(['error'=>'Sitemap returned HTTP '.$r['status']], 502);
  }

  $contentLength = isset($r['headers']['content-length']) && ctype_digit(trim((string)$r['headers']['content-length']))
    ? (int)trim((string)$r['headers']['content-length'])
    : null;
  $truncated = (bool)$r['truncated'];
  if ($truncated && $contentLength !== null && $contentLength <= SWU_SITEMAP_FETCH_LIMIT) $truncated = false;

  if ($truncated) {
    out([
      'error'=>'Sitemap exceeds this checker\'s 2 MB fetch safety limit, so the full XML cannot be validated here. Google allows sitemap files up to 50 MB uncompressed.',
      'limit_bytes'=>SWU_SITEMAP_FETCH_LIMIT
    ], 413);
  }

  $xml = trim($r['body']);
  if ($xml === '') out(['error'=>'Empty sitemap response.'], 422);

  try {
    $analysis = analyze_sitemap_xml($xml, $r['final_url']);
  } catch (RuntimeException $e) {
    out(['error'=>$e->getMessage()], 422);
  }

  out([
    'ok'=>true,
    'result'=>array_merge($analysis, [
      'url'=>$requestedUrl,
      'final_url'=>$r['final_url'],
      'status'=>$r['status'],
      'redirect_count'=>count($r['redirects']),
      'redirects'=>$r['redirects'],
      'content_type'=>$r['content_type'],
      'bytes_checked'=>strlen($r['body']),
      'fetch_limit_bytes'=>SWU_SITEMAP_FETCH_LIMIT,
      'truncated'=>false
    ])
  ]);
} catch (RuntimeException $e) {
  out(['error'=>$e->getMessage()], 502);
}
