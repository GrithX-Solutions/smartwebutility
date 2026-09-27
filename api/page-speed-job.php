<?php
declare(strict_types=1);
require __DIR__.'/common.php';

@set_time_limit(12);

$action=strtolower(trim((string)($_GET['action'] ?? 'status')));
$jobDir=sys_get_temp_dir().'/lighthouse-jobs';
$cacheDir=sys_get_temp_dir().'/smartwebutility-pagespeed-cache';
if(!is_dir($jobDir)) @mkdir($jobDir,0770,true);
if(!is_dir($cacheDir)) @mkdir($cacheDir,0700,true);

function psj_read_json(string $path): ?array {
  if(!is_file($path)) return null;
  $raw=@file_get_contents($path);
  $data=json_decode((string)$raw,true);
  return is_array($data)?$data:null;
}
function psj_write_json(string $path,array $data): bool {
  return @file_put_contents($path,json_encode($data,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),LOCK_EX)!==false;
}
function psj_cleanup(string $dir): void {
  $cut=time()-1800;
  foreach(glob($dir.'/*') ?: [] as $path){
    if(!is_file($path) || basename($path)==='.runner.lock') continue;
    $mtime=@filemtime($path);
    if($mtime!==false && $mtime<$cut) @unlink($path);
  }
}
function psj_score(array $categories,string $id): ?int {
  $score=$categories[$id]['score'] ?? null;
  return is_numeric($score)?(int)round(((float)$score)*100):null;
}
function psj_lab(array $audits,string $id,string $label): ?array {
  $a=$audits[$id] ?? null;
  if(!is_array($a)) return null;
  return [
    'id'=>$id,'label'=>$label,
    'value'=>$a['numericValue'] ?? null,
    'display'=>$a['displayValue'] ?? null,
    'score'=>isset($a['score']) && is_numeric($a['score'])?(int)round(((float)$a['score'])*100):null
  ];
}
function psj_normalize(array $lh,string $url,string $strategy): array {
  $audits=$lh['audits'] ?? [];
  $categories=$lh['categories'] ?? [];

  $lab=array_values(array_filter([
    psj_lab($audits,'first-contentful-paint','First Contentful Paint'),
    psj_lab($audits,'largest-contentful-paint','Largest Contentful Paint'),
    psj_lab($audits,'total-blocking-time','Total Blocking Time'),
    psj_lab($audits,'cumulative-layout-shift','Cumulative Layout Shift'),
    psj_lab($audits,'speed-index','Speed Index'),
    psj_lab($audits,'interactive','Time to Interactive')
  ]));

  $opportunities=[];
  $diagnostics=[];
  foreach(($categories['performance']['auditRefs'] ?? []) as $ref){
    $id=$ref['id'] ?? '';
    $a=$audits[$id] ?? null;
    if(!$id || !is_array($a)) continue;
    $mode=$a['scoreDisplayMode'] ?? '';
    if(in_array($mode,['notApplicable','manual','informative'],true)) continue;
    $item=[
      'id'=>$id,
      'title'=>$a['title'] ?? $id,
      'description'=>$a['description'] ?? '',
      'display'=>$a['displayValue'] ?? null,
      'score'=>isset($a['score']) && is_numeric($a['score'])?(int)round(((float)$a['score'])*100):null,
      'savings_ms'=>$a['details']['overallSavingsMs'] ?? null,
      'savings_bytes'=>$a['details']['overallSavingsBytes'] ?? null
    ];
    $group=$ref['group'] ?? '';
    if(($a['details']['type'] ?? '')==='opportunity' || $group==='load-opportunities'){
      if(($a['score'] ?? 1)<1) $opportunities[$id]=$item;
    }elseif($group==='diagnostics' && ($a['score'] ?? 1)<1){
      $diagnostics[$id]=$item;
    }
  }
  usort($opportunities,function($a,$b){
    return (($b['savings_ms']??0)<=>($a['savings_ms']??0)) ?: (($b['savings_bytes']??0)<=>($a['savings_bytes']??0));
  });

  $passed=[];
  foreach($categories as $category){
    foreach(($category['auditRefs'] ?? []) as $ref){
      $id=$ref['id'] ?? '';
      $a=$audits[$id] ?? null;
      if(!$id || !is_array($a) || !isset($a['score']) || (float)$a['score']<0.999 || isset($passed[$id])) continue;
      $passed[$id]=['id'=>$id,'title'=>$a['title'] ?? $id];
    }
  }

  $resources=[];
  foreach(($audits['resource-summary']['details']['items'] ?? []) as $item){
    if(!is_array($item)) continue;
    $resources[]=[
      'type'=>$item['resourceType'] ?? 'other',
      'label'=>$item['label'] ?? null,
      'requests'=>$item['requestCount'] ?? null,
      'transfer_bytes'=>$item['transferSize'] ?? null
    ];
  }

  return [
    'url'=>$url,
    'strategy'=>$strategy,
    'final_url'=>$lh['finalUrl'] ?? $url,
    'fetch_time'=>$lh['fetchTime'] ?? null,
    'lighthouse_version'=>$lh['lighthouseVersion'] ?? null,
    'categories'=>[
      'performance'=>psj_score($categories,'performance'),
      'accessibility'=>psj_score($categories,'accessibility'),
      'best_practices'=>psj_score($categories,'best-practices'),
      'seo'=>psj_score($categories,'seo')
    ],
    'field'=>null,
    'origin_field'=>null,
    'lab'=>$lab,
    'opportunities'=>array_slice(array_values($opportunities),0,12),
    'diagnostics'=>array_slice(array_values($diagnostics),0,14),
    'passed'=>array_slice(array_values($passed),0,24),
    'resources'=>$resources,
    'provider'=>'Isolated local Lighthouse '.($lh['lighthouseVersion'] ?? ''),
    'notes'=>[
      'The lab report runs asynchronously in an isolated Lighthouse worker.',
      'Only one heavy Lighthouse audit runs at a time; additional requests wait in a bounded queue.',
      'Real-user CrUX field data is separate from this local lab run and appears only when a provider key is configured.',
      'Performance scores can vary between runs because page, server and network conditions change.'
    ]
  ];
}

if($action==='start'){
  rate_limit('page-speed-start',6,600);
  psj_cleanup($jobDir);

  $url=normalize_url($_GET['url'] ?? '');
  $strategy=strtolower(trim((string)($_GET['strategy'] ?? 'mobile')));
  if(!in_array($strategy,['mobile','desktop'],true)) $strategy='mobile';

  $cacheKey=hash('sha256',$strategy.'|'.$url);
  $cacheFile=$cacheDir.'/'.$cacheKey.'.json';
  $cached=psj_read_json($cacheFile);
  if($cached && @filemtime($cacheFile)!==false && filemtime($cacheFile)>=time()-900){
    $cached['cache']=['status'=>'fresh','max_age_seconds'=>900];
    out(['state'=>'complete','stage'=>'complete','progress'=>100,'message'=>'Fresh cached report loaded.','result'=>$cached]);
  }

  $pending=0;
  foreach(glob($jobDir.'/*.json') ?: [] as $path){
    if(str_ends_with($path,'.result.json')) continue;
    $pending++;
  }
  foreach(glob($jobDir.'/*.work') ?: [] as $path) $pending++;
  if($pending>=4){
    out(['error'=>'The performance queue is full. Please retry shortly.','code'=>'queue_full'],429);
  }

  $id=bin2hex(random_bytes(12));
  $job=[
    'url'=>$url,
    'strategy'=>$strategy,
    'cache_key'=>$cacheKey,
    'created_at'=>gmdate('c')
  ];
  if(!psj_write_json($jobDir.'/'.$id.'.json',$job)){
    out(['error'=>'Could not queue the performance test.','code'=>'queue_error'],503);
  }
  psj_write_json($jobDir.'/'.$id.'.status',[
    'state'=>'queued','stage'=>'queued','progress'=>8,
    'message'=>'Test accepted and waiting for the isolated browser.',
    'updated_at'=>gmdate('c')
  ]);

  out([
    'state'=>'queued','stage'=>'queued','progress'=>8,
    'message'=>'Test accepted and queued.',
    'job_id'=>$id,'strategy'=>$strategy,'url'=>$url,
    'queue_depth'=>$pending+1
  ],202);
}

if($action==='status'){
  rate_limit('page-speed-status',240,600);
  $id=strtolower(trim((string)($_GET['job'] ?? '')));
  if(!preg_match('/^[a-f0-9]{24}$/',$id)) out(['error'=>'Invalid performance job.'],400);

  $doneFile=$jobDir.'/'.$id.'.done';
  $done=psj_read_json($doneFile);
  if($done){
    out($done);
  }

  $resultFile=$jobDir.'/'.$id.'.result.json';
  if(is_file($resultFile)){
    $raw=psj_read_json($resultFile);
    if(!$raw){
      out(['state'=>'failed','stage'=>'failed','progress'=>100,'error'=>'Performance worker returned invalid data.'],502);
    }
    $source=psj_read_json($jobDir.'/'.$id.'.jobmeta') ?? [];
    if(!$source){
      $work=$jobDir.'/'.$id.'.work';
      $source=psj_read_json($work) ?? [];
    }
    if(!$source){
      $source=['url'=>$raw['url'] ?? '', 'strategy'=>$raw['strategy'] ?? 'mobile','cache_key'=>$raw['cache_key'] ?? ''];
    }
    if(!($raw['ok'] ?? false) || !is_array($raw['lighthouseResult'] ?? null)){
      $payload=['state'=>'failed','stage'=>'failed','progress'=>100,'error'=>$raw['error'] ?? 'Lighthouse audit failed.'];
      psj_write_json($doneFile,$payload);
      @unlink($resultFile);
      out($payload,502);
    }

    $url=(string)($source['url'] ?? '');
    $strategy=(string)($source['strategy'] ?? 'mobile');
    $normalized=psj_normalize($raw['lighthouseResult'],$url,$strategy);
    $cacheKey=(string)($source['cache_key'] ?? hash('sha256',$strategy.'|'.$url));
    @file_put_contents($cacheDir.'/'.$cacheKey.'.json',json_encode($normalized,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),LOCK_EX);
    $normalized['cache']=['status'=>'miss','max_age_seconds'=>900];

    $payload=[
      'state'=>'complete','stage'=>'complete','progress'=>100,
      'message'=>'Performance report is ready.',
      'result'=>$normalized
    ];
    psj_write_json($doneFile,$payload);
    @unlink($resultFile);
    @unlink($jobDir.'/'.$id.'.status');
    @unlink($jobDir.'/'.$id.'.jobmeta');
    out($payload);
  }

  $status=psj_read_json($jobDir.'/'.$id.'.status');
  if($status){
    $status['job_id']=$id;
    out($status);
  }

  if(is_file($jobDir.'/'.$id.'.json') || is_file($jobDir.'/'.$id.'.work')){
    out([
      'state'=>'queued','stage'=>'queued','progress'=>8,
      'message'=>'Performance test is queued.','job_id'=>$id
    ]);
  }

  out(['state'=>'failed','stage'=>'expired','progress'=>100,'error'=>'Performance job expired or was not found.'],404);
}

out(['error'=>'Unsupported performance API action.'],400);
