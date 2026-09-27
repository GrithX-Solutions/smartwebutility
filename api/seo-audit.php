<?php
declare(strict_types=1);
require __DIR__.'/common.php';

rate_limit('seo-site-audit', 4, 600);
@set_time_limit(45);

const AUDIT_MAX_PAGES = 50;
const AUDIT_MAX_DEPTH = 3;
const AUDIT_TIME_BUDGET = 32.0;
const AUDIT_BODY_LIMIT = 786432;
const AUDIT_SITEMAP_LIMIT = 2097152;

$started = microtime(true);
$requested = normalize_url($_GET['url'] ?? '');
$maxPages = min(AUDIT_MAX_PAGES, max(5, (int)($_GET['pages'] ?? AUDIT_MAX_PAGES)));

function audit_fetch(string $url, int $maxBytes=AUDIT_BODY_LIMIT): array {
  $url=normalize_url($url);
  $p=parse_url($url);
  $host=clean_host($p['host'] ?? '');
  $ips=resolve_public($host);
  $ip=$ips[0];
  $port=(int)($p['port'] ?? (($p['scheme'] ?? 'https')==='https'?443:80));
  $headers=[]; $body='';
  $ch=curl_init($url);
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>false,
    CURLOPT_FOLLOWLOCATION=>false,
    CURLOPT_CONNECTTIMEOUT=>4,
    CURLOPT_TIMEOUT=>8,
    CURLOPT_USERAGENT=>'SmartWebUtility SEO Audit/1.0 (+https://smartwebutility.com/seo-tools/)',
    CURLOPT_SSL_VERIFYPEER=>true,
    CURLOPT_SSL_VERIFYHOST=>2,
    CURLOPT_RESOLVE=>[$host.':'.$port.':'.$ip],
    CURLOPT_HEADERFUNCTION=>function($ch,$line) use (&$headers){
      $len=strlen($line); $line=trim($line);
      if($line!=='' && str_contains($line,':')){
        [$k,$v]=array_map('trim',explode(':',$line,2));
        $headers[strtolower($k)]=$v;
      }
      return $len;
    },
    CURLOPT_WRITEFUNCTION=>function($ch,$chunk) use (&$body,$maxBytes){
      $remaining=$maxBytes-strlen($body);
      if($remaining<=0) return 0;
      $take=substr($chunk,0,$remaining);
      $body.=$take;
      return strlen($chunk);
    }
  ]);
  $t=microtime(true);
  $ok=curl_exec($ch);
  $elapsed=(microtime(true)-$t)*1000;
  $errno=curl_errno($ch); $err=curl_error($ch);
  $info=curl_getinfo($ch);
  curl_close($ch);
  if($ok===false && $errno!==23){
    return ['url'=>$url,'status'=>0,'error'=>$err?:'Request failed','headers'=>[],'body'=>'','content_type'=>null,'time_ms'=>(int)round($elapsed),'ip'=>$ip,'truncated'=>false];
  }
  return [
    'url'=>$url,
    'status'=>(int)($info['http_code']??0),
    'headers'=>$headers,
    'body'=>$body,
    'content_type'=>$info['content_type']??null,
    'time_ms'=>(int)round($elapsed),
    'ip'=>$info['primary_ip']??$ip,
    'truncated'=>strlen($body)>=$maxBytes
  ];
}

function audit_follow_seed(string $url): array {
  $chain=[]; $current=$url; $seen=[];
  for($i=0;$i<6;$i++){
    if(isset($seen[$current])) break;
    $seen[$current]=true;
    $r=audit_fetch($current, 65536);
    $loc=$r['headers']['location'] ?? null;
    $chain[]=['url'=>$current,'status'=>$r['status'],'location'=>$loc,'time_ms'=>$r['time_ms']];
    if(!in_array($r['status'],[301,302,303,307,308],true) || !$loc) return ['final_url'=>$current,'chain'=>$chain,'response'=>$r];
    $current=normalize_url(absolute_url($current,$loc));
  }
  return ['final_url'=>$current,'chain'=>$chain,'response'=>audit_fetch($current,65536)];
}

function audit_origin(string $url): string {
  $p=parse_url($url);
  $port=isset($p['port'])?':'.$p['port']:'';
  return strtolower($p['scheme']).'://'.strtolower($p['host']).$port;
}

function audit_same_host_url(string $base, string $href, string $host): ?string {
  $href=trim(html_entity_decode($href,ENT_QUOTES|ENT_HTML5,'UTF-8'));
  if($href==='' || str_starts_with($href,'#') || preg_match('~^(?:mailto|tel|javascript|data):~i',$href)) return null;
  $abs=absolute_url($base,$href);
  $p=parse_url($abs);
  if(!$p || !isset($p['scheme'],$p['host'])) return null;
  if(!in_array(strtolower($p['scheme']),['http','https'],true)) return null;
  if(strtolower($p['host'])!==strtolower($host)) return null;
  $scheme=strtolower($p['scheme']); $h=strtolower($p['host']);
  $port=isset($p['port'])?':'.$p['port']:'';
  $path=$p['path'] ?? '/'; if($path==='')$path='/';
  $path=preg_replace('~/+~','/',$path);
  return $scheme.'://'.$h.$port.$path;
}

function audit_parse_robots(string $text): array {
  $groups=[]; $sitemaps=[]; $agents=[]; $rules=[]; $haveRules=false;
  $flush=function() use (&$groups,&$agents,&$rules,&$haveRules){
    if(!$agents) return;
    foreach($agents as $a){
      $key=strtolower($a);
      if(!isset($groups[$key])) $groups[$key]=[];
      foreach($rules as $r) $groups[$key][]=$r;
    }
    $agents=[]; $rules=[]; $haveRules=false;
  };
  foreach(preg_split('/\R/',$text) as $line){
    $line=trim(preg_replace('/\s*#.*$/','',$line));
    if($line===''){ if($haveRules)$flush(); continue; }
    if(!str_contains($line,':')) continue;
    [$field,$value]=array_map('trim',explode(':',$line,2));
    $field=strtolower($field);
    if($field==='user-agent'){
      if($haveRules)$flush();
      $agents[]=$value;
    } elseif(($field==='allow'||$field==='disallow') && $agents){
      $rules[]=['type'=>$field,'path'=>$value]; $haveRules=true;
    } elseif($field==='sitemap' && $value!==''){
      $sitemaps[]=$value;
    }
  }
  $flush();
  return ['groups'=>$groups,'sitemaps'=>array_values(array_unique($sitemaps))];
}

function audit_robots_allowed(array $parsed, string $ua, string $path): bool {
  $groups=$parsed['groups'] ?? [];
  $rules=$groups[strtolower($ua)] ?? ($groups['*'] ?? []);
  $best=null; $bestLen=-1;
  foreach($rules as $r){
    $rulePath=$r['path'];
    if($rulePath==='') continue;
    if(str_starts_with($path,$rulePath) && strlen($rulePath)>$bestLen){
      $best=$r; $bestLen=strlen($rulePath);
    }
  }
  return !$best || $best['type']==='allow';
}

function audit_jsonld_types(mixed $data, array &$types): void {
  if(is_array($data)){
    if(isset($data['@type'])){
      foreach((array)$data['@type'] as $t) if(is_string($t)) $types[]=$t;
    }
    foreach($data as $v) audit_jsonld_types($v,$types);
  }
}

function audit_meta(DOMXPath $xp, string $attr, string $value): ?string {
  $q='//meta[translate(@'.$attr.',"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="'.strtolower($value).'"]/@content';
  $n=$xp->query($q)->item(0);
  return $n?trim((string)$n->nodeValue):null;
}

function audit_parse_page(array $fetch, string $host): array {
  $html=$fetch['body'];
  libxml_use_internal_errors(true);
  $dom=new DOMDocument();
  @$dom->loadHTML($html,LIBXML_NOWARNING|LIBXML_NOERROR);
  $xp=new DOMXPath($dom);

  $titleNode=$xp->query('//title')->item(0);
  $title=$titleNode?trim((string)$titleNode->nodeValue):null;
  $description=audit_meta($xp,'name','description');
  $robots=audit_meta($xp,'name','robots');
  $viewport=audit_meta($xp,'name','viewport');
  $ogTitle=audit_meta($xp,'property','og:title');
  $ogDescription=audit_meta($xp,'property','og:description');
  $canonicalNode=$xp->query('//link[contains(concat(" ",normalize-space(translate(@rel,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"))," ")," canonical ")]/@href')->item(0);
  $canonical=$canonicalNode?trim((string)$canonicalNode->nodeValue):null;
  if($canonical) $canonical=absolute_url($fetch['url'],$canonical);

  $htmlNode=$xp->query('/html')->item(0);
  $lang=$htmlNode instanceof DOMElement ? trim($htmlNode->getAttribute('lang')) : '';

  $internal=[]; $external=0;
  foreach($xp->query('//a[@href]') as $a){
    $href=$a->getAttribute('href');
    $same=audit_same_host_url($fetch['url'],$href,$host);
    if($same) $internal[]=$same;
    elseif(preg_match('~^https?://~i,',$href)) $external++;
  }
  $internal=array_values(array_unique($internal));

  $images=$xp->query('//img')->length; $missingAlt=0;
  foreach($xp->query('//img') as $img){
    if(!($img instanceof DOMElement) || !$img->hasAttribute('alt')) $missingAlt++;
  }

  $jsonldCount=0; $jsonldInvalid=0; $schemaTypes=[];
  foreach($xp->query('//script[translate(@type,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="application/ld+json"]') as $script){
    $raw=trim((string)$script->nodeValue);
    if($raw==='') continue;
    $jsonldCount++;
    $decoded=json_decode($raw,true);
    if(json_last_error()!==JSON_ERROR_NONE){$jsonldInvalid++;continue;}
    audit_jsonld_types($decoded,$schemaTypes);
  }
  $schemaTypes=array_values(array_unique($schemaTypes));

  $textParts=[];
  foreach($xp->query('//body//text()[not(ancestor::script) and not(ancestor::style) and not(ancestor::noscript) and not(ancestor::svg)]') as $node){
    $t=trim(preg_replace('/\s+/u',' ',(string)$node->nodeValue));
    if($t!=='') $textParts[]=$t;
  }
  $visibleText=trim(implode(' ',$textParts));
  $words=$visibleText===''?0:count(preg_split('/\s+/u',$visibleText));

  $hreflang=$xp->query('//link[@hreflang]')->length;
  $xrobots=$fetch['headers']['x-robots-tag'] ?? null;
  $noindex=(stripos((string)$robots,'noindex')!==false)||(stripos((string)$xrobots,'noindex')!==false);

  return [
    'url'=>$fetch['url'],'status'=>$fetch['status'],'time_ms'=>$fetch['time_ms'],'content_type'=>$fetch['content_type'],
    'title'=>$title,'title_length'=>$title?strlen($title):0,
    'description'=>$description,'description_length'=>$description?strlen($description):0,
    'robots'=>$robots,'x_robots_tag'=>$xrobots,'noindex'=>$noindex,'canonical'=>$canonical,
    'h1_count'=>$xp->query('//h1')->length,'h2_count'=>$xp->query('//h2')->length,
    'lang'=>$lang?:null,'viewport'=>(bool)$viewport,'word_count'=>$words,
    'internal_links'=>$internal,'internal_link_count'=>count($internal),'external_link_count'=>$external,
    'images'=>$images,'images_missing_alt'=>$missingAlt,
    'jsonld_count'=>$jsonldCount,'jsonld_invalid'=>$jsonldInvalid,'schema_types'=>$schemaTypes,
    'og_title'=>(bool)$ogTitle,'og_description'=>(bool)$ogDescription,
    'hreflang_count'=>$hreflang,'truncated'=>$fetch['truncated']
  ];
}

function audit_add_issue(array &$issues,string $id,string $severity,string $category,string $title,string $why,string $fix,?string $url=null,?string $reference=null): void {
  if(!isset($issues[$id])) $issues[$id]=[
    'id'=>$id,'severity'=>$severity,'category'=>$category,'title'=>$title,'why'=>$why,'fix'=>$fix,
    'affected_count'=>0,'urls'=>[],'reference'=>$reference
  ];
  if($url!==null){
    $issues[$id]['affected_count']++;
    if(count($issues[$id]['urls'])<10 && !in_array($url,$issues[$id]['urls'],true)) $issues[$id]['urls'][]=$url;
  } elseif($issues[$id]['affected_count']===0) $issues[$id]['affected_count']=1;
}

function audit_collect_sitemap(string $url,string $host,array &$visited,int $depth=0,int $limit=200): array {
  if($depth>1 || isset($visited[$url]) || count($visited)>8) return [];
  $visited[$url]=true;
  $r=audit_fetch($url,AUDIT_SITEMAP_LIMIT);
  if($r['status']<200||$r['status']>=400||trim($r['body'])==='') return [];
  libxml_use_internal_errors(true);
  $xml=@simplexml_load_string($r['body']);
  if(!$xml) return [];
  $root=strtolower($xml->getName());
  $locNodes=$xml->xpath('//*[local-name()="loc"]') ?: [];
  $urls=[];
  if($root==='sitemapindex'){
    foreach(array_slice($locNodes,0,5) as $loc){
      $child=trim((string)$loc);
      if($child!=='') $urls=array_merge($urls,audit_collect_sitemap($child,$host,$visited,$depth+1,$limit));
      if(count($urls)>=$limit) break;
    }
  } else {
    foreach($locNodes as $loc){
      $u=trim((string)$loc);
      $p=parse_url($u);
      if($u!=='' && $p && strtolower($p['host']??'')===strtolower($host)) $urls[]=$u;
      if(count($urls)>=$limit) break;
    }
  }
  return array_values(array_unique($urls));
}

$seed=audit_follow_seed($requested);
$finalUrl=$seed['final_url'];
$origin=audit_origin($finalUrl);
$parts=parse_url($finalUrl);
$host=strtolower($parts['host'] ?? '');
if($host==='') out(['error'=>'Could not determine the final audit hostname.'],400);

$robotsUrl=$origin.'/robots.txt';
$robotsFetch=audit_fetch($robotsUrl,262144);
$robotsText=($robotsFetch['status']>=200&&$robotsFetch['status']<400)?$robotsFetch['body']:'';
$robotsParsed=audit_parse_robots($robotsText);

$sitemapCandidates=$robotsParsed['sitemaps'] ?? [];
if(!$sitemapCandidates) $sitemapCandidates=[$origin.'/sitemap.xml'];
$sitemapUrl=$sitemapCandidates[0];
$sitemapVisited=[];
$sitemapUrls=audit_collect_sitemap($sitemapUrl,$host,$sitemapVisited,0,250);

$queue=[['url'=>$finalUrl,'depth'=>0]];
foreach($sitemapUrls as $u){
  $normalized=audit_same_host_url($finalUrl,$u,$host);
  if($normalized) $queue[]=['url'=>$normalized,'depth'=>1];
}

$seen=[]; $pages=[]; $inbound=[]; $blocked=[]; $discovered=[];
while($queue && count($pages)<$maxPages && (microtime(true)-$started)<AUDIT_TIME_BUDGET){
  $item=array_shift($queue); $url=$item['url']; $depth=$item['depth'];
  if(isset($seen[$url])) continue;
  $seen[$url]=true; $discovered[$url]=true;
  $path=parse_url($url,PHP_URL_PATH) ?: '/';
  if(!audit_robots_allowed($robotsParsed,'*',$path)){
    $blocked[]=$url; continue;
  }

  $fetch=audit_fetch($url,AUDIT_BODY_LIMIT);
  $contentType=strtolower((string)$fetch['content_type']);
  if(in_array($fetch['status'],[301,302,303,307,308],true)){
    $loc=$fetch['headers']['location'] ?? null;
    $pages[$url]=['url'=>$url,'status'=>$fetch['status'],'time_ms'=>$fetch['time_ms'],'redirect'=>$loc,'content_type'=>$fetch['content_type']];
    if($loc){
      $next=audit_same_host_url($url,$loc,$host);
      if($next && !isset($seen[$next])) $queue[]=['url'=>$next,'depth'=>$depth];
    }
    continue;
  }
  if($fetch['status']<200 || $fetch['status']>=400 || !str_contains($contentType,'text/html')){
    $pages[$url]=['url'=>$url,'status'=>$fetch['status'],'time_ms'=>$fetch['time_ms'],'content_type'=>$fetch['content_type'],'error'=>$fetch['error']??null];
    continue;
  }

  $page=audit_parse_page($fetch,$host);
  $pages[$url]=$page;

  foreach($page['internal_links'] as $link){
    $discovered[$link]=true;
    $inbound[$link]=($inbound[$link]??0)+1;
    if($depth<AUDIT_MAX_DEPTH && !isset($seen[$link])) $queue[]=['url'=>$link,'depth'=>$depth+1];
  }
}

$issues=[]; $passes=[];
$googleRef='https://developers.google.com/search/docs/crawling-indexing';
$canonicalRef='https://developers.google.com/search/docs/crawling-indexing/canonicalization';
$structuredRef='https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data';
$aiRef='https://developers.google.com/search/docs/appearance/ai-features';
$bingRef='https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/';

$finalScheme=strtolower(parse_url($finalUrl,PHP_URL_SCHEME)??'');
if($finalScheme==='https') $passes[]=['category'=>'Technical','title'=>'Final audited URL uses HTTPS'];
else audit_add_issue($issues,'https','critical','Technical SEO','Site does not resolve to HTTPS','Secure delivery is a basic web and user-trust requirement.','Redirect HTTP to a canonical HTTPS version and update internal links, canonicals and sitemap URLs.',$finalUrl,$googleRef);

$googleAllowed=audit_robots_allowed($robotsParsed,'Googlebot','/');
$bingAllowed=audit_robots_allowed($robotsParsed,'bingbot','/');
if($googleAllowed) $passes[]=['category'=>'Crawl & Indexing','title'=>'robots.txt does not block Googlebot from the site root'];
else audit_add_issue($issues,'googlebot-block','critical','Crawl & Indexing','Googlebot is blocked at the site root','A blocked site cannot be crawled normally by Google Search.','Review robots.txt and remove the blocking rule if the site is intended for public search.',$robotsUrl,$googleRef);
if($bingAllowed) $passes[]=['category'=>'Crawl & Indexing','title'=>'robots.txt does not block Bingbot from the site root'];
else audit_add_issue($issues,'bingbot-block','critical','Crawl & Indexing','Bingbot is blocked at the site root','Blocking Bingbot prevents normal Bing crawling and can also limit discovery for Bing AI experiences.','Review robots.txt and allow Bingbot to crawl the public pages you want discovered.',$robotsUrl,$bingRef);

if($robotsFetch['status']===200) $passes[]=['category'=>'Crawl & Indexing','title'=>'robots.txt is reachable'];
elseif($robotsFetch['status']===404) audit_add_issue($issues,'robots-missing','notice','Crawl & Indexing','robots.txt was not found','A missing robots.txt generally means crawlers are not restricted, but you lose a central place to communicate crawl rules and sitemap location.','Add a root robots.txt if you need crawl directives or want to advertise the sitemap.',$robotsUrl,$googleRef);
else audit_add_issue($issues,'robots-error','warning','Crawl & Indexing','robots.txt returned an unexpected response','Search crawlers need a reliable response from robots.txt to understand crawl permissions.','Make robots.txt return a stable 200 response, or a clear 404 if you intentionally do not use it.',$robotsUrl,$googleRef);

if($sitemapUrls){
  $passes[]=['category'=>'Discovery','title'=>'XML sitemap is reachable and contains same-host URLs'];
} else {
  audit_add_issue($issues,'sitemap','warning','Discovery','No usable XML sitemap was found','Sitemaps help search engines discover canonical URLs, especially on larger or newer sites.','Publish a valid XML sitemap at the root or reference its URL from robots.txt.',$sitemapUrl,$bingRef);
}

$titleMap=[]; $descMap=[]; $htmlPages=0; $indexablePages=0; $structuredSeen=0; $invalidStructured=0; $totalInternal=0;
foreach($pages as $url=>$p){
  $status=$p['status']??0;
  if($status>=400 || $status===0){
    audit_add_issue($issues,'broken-url','critical','Crawl & Indexing','Crawled URLs return errors','Internal URLs returning 4xx, 5xx or network errors waste crawl paths and can break user journeys.','Fix the destination, restore the page, or update/remove internal links that point to it.',$url,$googleRef);
    continue;
  }
  if($status>=300 && $status<400){
    audit_add_issue($issues,'redirecting-internal','warning','Site Architecture','Crawled URLs redirect','Internal links that point through redirects add unnecessary hops and can make migrations harder to debug.','Update internal links to point directly to the final canonical URL where practical.',$url,$canonicalRef);
    continue;
  }
  if(!isset($p['title'])) continue;
  $htmlPages++;
  if(!$p['noindex']) $indexablePages++;
  $totalInternal+=($p['internal_link_count']??0);

  if($p['noindex']){
    $sev=in_array($url,$sitemapUrls,true)?'critical':'warning';
    audit_add_issue($issues,'noindex',$sev,'Crawl & Indexing','Pages contain noindex','A noindex directive prevents a page from being eligible for normal search indexing. A sitemap URL with noindex sends conflicting discovery signals.','Remove noindex from pages that should appear in search; remove intentionally excluded URLs from the sitemap.',$url,$googleRef);
  }

  if(!$p['title']) audit_add_issue($issues,'title-missing','critical','On-page SEO','Pages are missing a title element','The title is an important source Google and Bing can use to understand and present a page.','Write a concise, page-specific title that accurately describes the primary purpose.',$url,$googleRef);
  else {
    $key=strtolower(trim($p['title'])); $titleMap[$key][]=$url;
    if($p['title_length']<20 || $p['title_length']>70) audit_add_issue($issues,'title-length','notice','On-page SEO','Page titles may be unusually short or long','Search engines can rewrite titles; extreme lengths are a useful editorial heuristic, not a fixed ranking rule.','Make the title specific and concise enough to communicate the page purpose without boilerplate or repetition.',$url,$googleRef);
  }

  if(!$p['description']) audit_add_issue($issues,'description-missing','warning','On-page SEO','Pages are missing meta descriptions','Search engines may generate snippets from page text, but a useful description gives you a strong candidate snippet.','Add a unique summary that accurately describes what the user can do or learn on the page.',$url,$googleRef);
  else {
    $key=strtolower(trim($p['description'])); $descMap[$key][]=$url;
    if($p['description_length']>180) audit_add_issue($issues,'description-length','notice','On-page SEO','Some meta descriptions are very long','Long descriptions may be truncated or replaced. This is a presentation heuristic, not a ranking requirement.','Keep descriptions focused on the page intent and remove repetitive wording.',$url,$googleRef);
  }

  if($p['h1_count']===0) audit_add_issue($issues,'h1-missing','warning','Content Structure','Pages have no H1 heading','A clear primary heading helps users and parsers understand the page topic.','Add a descriptive visible primary heading aligned with the page purpose.',$url,$googleRef);
  elseif($p['h1_count']>1) audit_add_issue($issues,'h1-multiple','notice','Content Structure','Pages use multiple H1 headings','Multiple H1 elements are not automatically an SEO error, but they can signal unclear document hierarchy in some templates.','Review the heading structure and keep the page hierarchy easy for users to scan.',$url,$googleRef);

  if(!$p['canonical']) audit_add_issue($issues,'canonical-missing','warning','Canonicalization','Pages are missing a canonical hint','Canonical annotations help search engines consolidate duplicate or variant URLs.','Add a self-referencing canonical for unique indexable pages and point duplicates to the preferred URL.',$url,$canonicalRef);
  else {
    $chost=strtolower(parse_url($p['canonical'],PHP_URL_HOST)??'');
    if($chost!=='' && $chost!==$host) audit_add_issue($issues,'canonical-crosshost','warning','Canonicalization','Canonical points to another hostname','Cross-domain canonicals can intentionally consolidate content, but accidental ones can remove the audited page from the preferred index set.','Confirm the cross-domain canonical is deliberate; otherwise point it to the preferred URL on this site.',$url,$canonicalRef);
  }

  if(!$p['viewport']) audit_add_issue($issues,'viewport','warning','SXO & Mobile','Pages are missing a viewport meta tag','Mobile layout behavior can be poor without a responsive viewport, hurting usability on phones.','Add a responsive viewport declaration and test the page at mobile widths.',$url,$googleRef);
  if(!$p['lang']) audit_add_issue($issues,'lang','notice','Accessibility & Semantics','Pages do not declare the document language','A language declaration helps browsers, assistive technology and language processing interpret the page.','Set the html lang attribute to the page language.',$url,$googleRef);

  if($p['images_missing_alt']>0) audit_add_issue($issues,'image-alt','notice','Content & Accessibility','Images are missing alt attributes','Meaningful images should have useful alternative text; decorative images should use an empty alt attribute.','Add accurate alt text where the image conveys information and alt="" for purely decorative images.',$url,$googleRef);

  if($p['jsonld_count']>0){
    $structuredSeen++;
    if($p['jsonld_invalid']>0){
      $invalidStructured++;
      audit_add_issue($issues,'jsonld-invalid','warning','Structured Data','Invalid JSON-LD was detected','Malformed structured data cannot be reliably interpreted and may make a page ineligible for supported rich-result features.','Fix JSON syntax, then validate supported markup with Google Rich Results Test and relevant schema requirements.',$url,$structuredRef);
    }
  }

  if($p['word_count']<120) audit_add_issue($issues,'low-text','notice','GEO / AIO Readiness','Some pages expose very little readable text','Google says important content should be available in textual form for Search and AI features. This threshold is only a diagnostic heuristic.','Add concise visible explanations, definitions, limitations or supporting content when that genuinely helps the user.',$url,$aiRef);
  if($p['internal_link_count']===0) audit_add_issue($issues,'no-internal-links','warning','Site Architecture','Pages have no crawlable internal links','Internal links help users and search engines discover related content and understand site structure.','Add relevant crawlable links to related pages, parent categories or next-step resources.',$url,$aiRef);
  if($p['time_ms']>2000) audit_add_issue($issues,'slow-response','warning','SXO & Performance','Some crawled HTML responses are slow','This measures crawler response time only, not Core Web Vitals. Slow server responses can still delay users and crawlers.','Investigate server latency, backend work, caching and large HTML responses; measure real CWV separately.',$url,$googleRef);
}

foreach($titleMap as $title=>$urls) if($title!=='' && count($urls)>1)
  foreach($urls as $u) audit_add_issue($issues,'duplicate-title','warning','On-page SEO','Duplicate page titles were found','Repeated titles make it harder to distinguish page intent in search results and site reporting.','Write page-specific titles for distinct URLs.',$u,$googleRef);
foreach($descMap as $desc=>$urls) if($desc!=='' && count($urls)>1)
  foreach($urls as $u) audit_add_issue($issues,'duplicate-description','notice','On-page SEO','Duplicate meta descriptions were found','Duplicate descriptions reduce snippet differentiation across pages.','Write distinct descriptions where pages serve different search intents.',$u,$googleRef);

foreach($sitemapUrls as $u){
  $n=audit_same_host_url($finalUrl,$u,$host);
  if(!$n || !isset($pages[$n]) || $n===$finalUrl) continue;
  if(($inbound[$n]??0)===0) audit_add_issue($issues,'orphan-sitemap','notice','Site Architecture','Sitemap pages have no discovered internal links','A sitemap can help discovery, but crawlable internal links also show users and search engines how pages relate.','Add contextual internal links to important sitemap pages when appropriate.',$n,$aiRef);
}

if($structuredSeen>0 && $invalidStructured===0) $passes[]=['category'=>'Structured Data','title'=>'Parsed JSON-LD is syntactically valid on crawled pages'];
if($htmlPages>0 && $indexablePages===$htmlPages) $passes[]=['category'=>'Crawl & Indexing','title'=>'All crawled HTML pages are indexable by meta/X-Robots directives'];
if($totalInternal>0) $passes[]=['category'=>'Site Architecture','title'=>'Crawlable internal links were discovered'];

$knownPaths=array_map(fn($u)=>strtolower(parse_url($u,PHP_URL_PATH)??''),array_keys($discovered));
$trust=[
  'about'=>false,'contact'=>false,'privacy'=>false
];
foreach($knownPaths as $path){
  if(str_contains($path,'/about'))$trust['about']=true;
  if(str_contains($path,'/contact'))$trust['contact']=true;
  if(str_contains($path,'/privacy'))$trust['privacy']=true;
}
if(count(array_filter($trust))<2){
  audit_add_issue($issues,'trust-pages','notice','GEO / AIO Readiness','Few trust or identity pages were discovered','Trust pages are not a special Google AI requirement, but clear ownership, contact and policy information can improve user confidence and make site identity easier to understand.','Make appropriate About, Contact and privacy/policy information easy to find through internal navigation.',null,$aiRef);
} else $passes[]=['category'=>'Trust & Transparency','title'=>'Multiple site identity/trust pages were discovered'];

$issueList=array_values($issues);
$rank=['critical'=>0,'warning'=>1,'notice'=>2];
usort($issueList,fn($a,$b)=>($rank[$a['severity']]<=>$rank[$b['severity']]) ?: strcmp($a['category'],$b['category']));

$counts=['critical'=>0,'warning'=>0,'notice'=>0];
foreach($issueList as $issue) $counts[$issue['severity']]++;

$pageRows=[];
foreach($pages as $p){
  $pageRows[]=[
    'url'=>$p['url'],'status'=>$p['status']??0,'title'=>$p['title']??null,'noindex'=>$p['noindex']??null,
    'canonical'=>$p['canonical']??null,'h1_count'=>$p['h1_count']??null,'word_count'=>$p['word_count']??null,
    'internal_links'=>$p['internal_link_count']??null,'time_ms'=>$p['time_ms']??null
  ];
}

out([
  'ok'=>true,
  'audit'=>[
    'requested_url'=>$requested,
    'final_url'=>$finalUrl,
    'host'=>$host,
    'redirect_chain'=>$seed['chain'],
    'pages_crawled'=>count($pages),
    'html_pages'=>$htmlPages,
    'indexable_html_pages'=>$indexablePages,
    'max_pages'=>$maxPages,
    'discovered_urls'=>count($discovered),
    'robots_blocked_urls'=>count($blocked),
    'sitemap_url'=>$sitemapUrl,
    'sitemap_urls_found'=>count($sitemapUrls),
    'stopped_early'=>(count($pages)>=$maxPages || (microtime(true)-$started)>=AUDIT_TIME_BUDGET),
    'elapsed_ms'=>(int)round((microtime(true)-$started)*1000)
  ],
  'summary'=>[
    'critical'=>$counts['critical'],
    'warnings'=>$counts['warning'],
    'notices'=>$counts['notice'],
    'passed_checks'=>count($passes)
  ],
  'issues'=>$issueList,
  'passes'=>$passes,
  'pages'=>$pageRows,
  'methodology'=>[
    'scope'=>'Public crawl-based audit of up to '.$maxPages.' same-host pages, seeded by the final landing URL, internal links and available XML sitemap URLs.',
    'limits'=>[
      'Does not use private Google Search Console or Bing Webmaster data for sites you do not own.',
      'Does not measure CrUX field data or guarantee Core Web Vitals.',
      'Does not render JavaScript like a full browser crawler.',
      'AI/GEO checks assess technical readiness and content accessibility; they cannot guarantee AI citations or recommendations.',
      'Search engines can crawl, index, canonicalize and present URLs differently from any third-party audit.'
    ]
  ]
]);
