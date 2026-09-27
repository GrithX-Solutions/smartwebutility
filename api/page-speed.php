<?php
declare(strict_types=1);
require __DIR__.'/common.php';

@set_time_limit(120);
rate_limit('page-speed-test', 8, 600);

$url=normalize_url($_GET['url'] ?? '');
$strategy=strtolower(trim($_GET['strategy'] ?? 'mobile'));
if(!in_array($strategy,['mobile','desktop'],true)) $strategy='mobile';

$endpoint='https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed';
$query='url='.rawurlencode($url).'&strategy='.$strategy.'&locale=en'
  .'&category=performance&category=accessibility&category=best-practices&category=seo';
$key=trim((string)(getenv('PAGESPEED_API_KEY') ?: ''));
if($key!=='') $query.='&key='.rawurlencode($key);

$ch=curl_init($endpoint.'?'.$query);
curl_setopt_array($ch,[
  CURLOPT_RETURNTRANSFER=>true,
  CURLOPT_FOLLOWLOCATION=>true,
  CURLOPT_CONNECTTIMEOUT=>10,
  CURLOPT_TIMEOUT=>100,
  CURLOPT_USERAGENT=>'SmartWebUtility/1.0 (+https://smartwebutility.com/)',
  CURLOPT_SSL_VERIFYPEER=>true,
  CURLOPT_SSL_VERIFYHOST=>2,
  CURLOPT_HTTPHEADER=>['Accept: application/json']
]);
$body=curl_exec($ch);
$errno=curl_errno($ch);
$error=curl_error($ch);
$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);
curl_close($ch);

if($body===false || $errno){
  out(['error'=>'Performance analysis service could not be reached. Please try again shortly.','detail'=>$error],502);
}
$data=json_decode((string)$body,true);
if(!is_array($data)){
  out(['error'=>'Performance analysis returned an invalid response.'],502);
}
if($status>=400 || isset($data['error'])){
  $message=$data['error']['message'] ?? 'PageSpeed analysis could not be completed.';
  if($status===429) $message='PageSpeed analysis quota is temporarily busy. Please try again shortly.';
  out(['error'=>$message,'provider_status'=>$status],$status===429?429:502);
}

$lh=$data['lighthouseResult'] ?? [];
$audits=$lh['audits'] ?? [];
$categories=$lh['categories'] ?? [];

function ps_score(array $categories,string $id): ?int {
  if(!isset($categories[$id]['score']) || !is_numeric($categories[$id]['score'])) return null;
  return (int)round(((float)$categories[$id]['score'])*100);
}
function ps_lab(array $audits,string $id,string $label): ?array {
  $a=$audits[$id] ?? null;
  if(!is_array($a)) return null;
  return [
    'id'=>$id,
    'label'=>$label,
    'value'=>$a['numericValue'] ?? null,
    'display'=>$a['displayValue'] ?? null,
    'score'=>isset($a['score']) && is_numeric($a['score']) ? (int)round(((float)$a['score'])*100) : null
  ];
}
function ps_field_metric(array $experience,string $key,string $label,string $unit='ms'): ?array {
  $m=$experience['metrics'][$key] ?? null;
  if(!is_array($m) || !isset($m['percentile'])) return null;
  $value=(float)$m['percentile'];
  if($key==='CUMULATIVE_LAYOUT_SHIFT_SCORE') $value=$value/100;
  return [
    'key'=>$key,
    'label'=>$label,
    'value'=>$value,
    'unit'=>$unit,
    'category'=>$m['category'] ?? 'NONE'
  ];
}
function ps_experience(array $experience): ?array {
  if(empty($experience['metrics']) || !is_array($experience['metrics'])) return null;
  $metrics=array_values(array_filter([
    ps_field_metric($experience,'LARGEST_CONTENTFUL_PAINT_MS','Largest Contentful Paint'),
    ps_field_metric($experience,'INTERACTION_TO_NEXT_PAINT','Interaction to Next Paint'),
    ps_field_metric($experience,'CUMULATIVE_LAYOUT_SHIFT_SCORE','Cumulative Layout Shift','score'),
    ps_field_metric($experience,'FIRST_CONTENTFUL_PAINT_MS','First Contentful Paint'),
    ps_field_metric($experience,'EXPERIMENTAL_TIME_TO_FIRST_BYTE','Time to First Byte')
  ]));
  $cwv=[];
  foreach($metrics as $m){
    if(in_array($m['key'],['LARGEST_CONTENTFUL_PAINT_MS','INTERACTION_TO_NEXT_PAINT','CUMULATIVE_LAYOUT_SHIFT_SCORE'],true)) $cwv[]=$m;
  }
  $assessment='insufficient-data';
  if(count($cwv)===3){
    $assessment=count(array_filter($cwv,fn($m)=>($m['category']??'')==='FAST'))===3?'passed':'needs-improvement';
  }
  return [
    'id'=>$experience['id'] ?? null,
    'overall_category'=>$experience['overall_category'] ?? 'NONE',
    'origin_fallback'=>(bool)($experience['origin_fallback'] ?? false),
    'assessment'=>$assessment,
    'metrics'=>$metrics
  ];
}

$lab=array_values(array_filter([
  ps_lab($audits,'first-contentful-paint','First Contentful Paint'),
  ps_lab($audits,'largest-contentful-paint','Largest Contentful Paint'),
  ps_lab($audits,'total-blocking-time','Total Blocking Time'),
  ps_lab($audits,'cumulative-layout-shift','Cumulative Layout Shift'),
  ps_lab($audits,'speed-index','Speed Index'),
  ps_lab($audits,'interactive','Time to Interactive')
]));

$opportunities=[];
$diagnostics=[];
$passed=[];
$perfRefs=$categories['performance']['auditRefs'] ?? [];
foreach($perfRefs as $ref){
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
    'score'=>isset($a['score']) && is_numeric($a['score']) ? (int)round(((float)$a['score'])*100) : null,
    'savings_ms'=>$a['details']['overallSavingsMs'] ?? null,
    'savings_bytes'=>$a['details']['overallSavingsBytes'] ?? null
  ];
  $group=$ref['group'] ?? '';
  if(($a['details']['type'] ?? '')==='opportunity' || $group==='load-opportunities'){
    if(($a['score'] ?? 1)<1) $opportunities[$id]=$item;
  } elseif($group==='diagnostics' && ($a['score'] ?? 1)<1){
    $diagnostics[$id]=$item;
  }
}
usort($opportunities,function($a,$b){
  return (($b['savings_ms']??0)<=>($a['savings_ms']??0)) ?: (($b['savings_bytes']??0)<=>($a['savings_bytes']??0));
});
$opportunities=array_slice(array_values($opportunities),0,12);
$diagnostics=array_slice(array_values($diagnostics),0,14);

foreach($categories as $category){
  foreach(($category['auditRefs'] ?? []) as $ref){
    $id=$ref['id'] ?? '';
    $a=$audits[$id] ?? null;
    if(!$id || !is_array($a) || !isset($a['score']) || (float)$a['score']<0.999) continue;
    if(isset($passed[$id])) continue;
    $passed[$id]=['id'=>$id,'title'=>$a['title'] ?? $id];
  }
}
$passed=array_slice(array_values($passed),0,24);

function ps_crux_category(string $metric,float $value): string {
  return match($metric){
    'largest_contentful_paint' => $value<=2500?'FAST':($value<=4000?'AVERAGE':'SLOW'),
    'interaction_to_next_paint' => $value<=200?'FAST':($value<=500?'AVERAGE':'SLOW'),
    'cumulative_layout_shift' => $value<=0.10?'FAST':($value<=0.25?'AVERAGE':'SLOW'),
    'first_contentful_paint' => $value<=1800?'FAST':($value<=3000?'AVERAGE':'SLOW'),
    'experimental_time_to_first_byte' => $value<=800?'FAST':($value<=1800?'AVERAGE':'SLOW'),
    default => 'NONE'
  };
}
function ps_crux_request(string $key,string $target,string $strategy,bool $origin=false): ?array {
  if($key==='') return null;
  $endpoint='https://chromeuxreport.googleapis.com/v1/records:queryRecord?key='.rawurlencode($key);
  $payload=[
    $origin?'origin':'url'=>$target,
    'formFactor'=>$strategy==='desktop'?'DESKTOP':'PHONE',
    'metrics'=>[
      'largest_contentful_paint','interaction_to_next_paint','cumulative_layout_shift',
      'first_contentful_paint','experimental_time_to_first_byte'
    ]
  ];
  $ch=curl_init($endpoint);
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>true,
    CURLOPT_POST=>true,
    CURLOPT_POSTFIELDS=>json_encode($payload,JSON_UNESCAPED_SLASHES),
    CURLOPT_CONNECTTIMEOUT=>6,
    CURLOPT_TIMEOUT=>15,
    CURLOPT_SSL_VERIFYPEER=>true,
    CURLOPT_SSL_VERIFYHOST=>2,
    CURLOPT_HTTPHEADER=>['Accept: application/json','Content-Type: application/json']
  ]);
  $body=curl_exec($ch);
  $status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);
  $errno=curl_errno($ch);
  curl_close($ch);
  if($body===false || $errno || $status>=400) return null;
  $json=json_decode((string)$body,true);
  return is_array($json['record'] ?? null)?$json['record']:null;
}
function ps_crux_experience(array $record,bool $originFallback=false): ?array {
  $metrics=$record['metrics'] ?? null;
  if(!is_array($metrics) || !$metrics) return null;
  $map=[
    'largest_contentful_paint'=>['LARGEST_CONTENTFUL_PAINT_MS','Largest Contentful Paint','ms'],
    'interaction_to_next_paint'=>['INTERACTION_TO_NEXT_PAINT','Interaction to Next Paint','ms'],
    'cumulative_layout_shift'=>['CUMULATIVE_LAYOUT_SHIFT_SCORE','Cumulative Layout Shift','score'],
    'first_contentful_paint'=>['FIRST_CONTENTFUL_PAINT_MS','First Contentful Paint','ms'],
    'experimental_time_to_first_byte'=>['EXPERIMENTAL_TIME_TO_FIRST_BYTE','Time to First Byte','ms']
  ];
  $out=[];
  foreach($map as $metric=>$meta){
    $raw=$metrics[$metric]['percentiles']['p75'] ?? null;
    if($raw===null || !is_numeric($raw)) continue;
    $value=(float)$raw;
    $out[]=['key'=>$meta[0],'label'=>$meta[1],'value'=>$value,'unit'=>$meta[2],'category'=>ps_crux_category($metric,$value)];
  }
  $cwv=array_values(array_filter($out,fn($m)=>in_array($m['key'],['LARGEST_CONTENTFUL_PAINT_MS','INTERACTION_TO_NEXT_PAINT','CUMULATIVE_LAYOUT_SHIFT_SCORE'],true)));
  $assessment='insufficient-data';
  if(count($cwv)===3) $assessment=count(array_filter($cwv,fn($m)=>$m['category']==='FAST'))===3?'passed':'needs-improvement';
  $key=$record['key'] ?? [];
  return [
    'id'=>$key['url'] ?? ($key['origin'] ?? null),
    'overall_category'=>'NONE',
    'origin_fallback'=>$originFallback,
    'assessment'=>$assessment,
    'metrics'=>$out,
    'source'=>'Chrome UX Report API',
    'collection_period'=>$record['collectionPeriod'] ?? null
  ];
}

$resourceSummary=[];
foreach(($audits['resource-summary']['details']['items'] ?? []) as $item){
  if(!is_array($item)) continue;
  $resourceSummary[]=[
    'type'=>$item['resourceType'] ?? 'other',
    'label'=>$item['label'] ?? null,
    'requests'=>$item['requestCount'] ?? null,
    'transfer_bytes'=>$item['transferSize'] ?? null
  ];
}

$field=ps_experience($data['loadingExperience'] ?? []);
$originField=ps_experience($data['originLoadingExperience'] ?? []);
$cruxKey=trim((string)(getenv('CRUX_API_KEY') ?: $key));
if($cruxKey!==''){
  $cruxRecord=ps_crux_request($cruxKey,$lh['finalUrl'] ?? $url,$strategy,false);
  if($cruxRecord){
    $field=ps_crux_experience($cruxRecord,false);
    $originField=null;
  } else {
    $p=parse_url($lh['finalUrl'] ?? $url);
    if($p && isset($p['scheme'],$p['host'])){
      $origin=$p['scheme'].'://'.$p['host'].(isset($p['port'])?':'.$p['port']:'');
      $originRecord=ps_crux_request($cruxKey,$origin,$strategy,true);
      if($originRecord) $originField=ps_crux_experience($originRecord,true);
    }
  }
}

out([
  'url'=>$url,
  'strategy'=>$strategy,
  'final_url'=>$lh['finalUrl'] ?? ($data['id'] ?? $url),
  'fetch_time'=>$lh['fetchTime'] ?? ($data['analysisUTCTimestamp'] ?? null),
  'lighthouse_version'=>$lh['lighthouseVersion'] ?? null,
  'categories'=>[
    'performance'=>ps_score($categories,'performance'),
    'accessibility'=>ps_score($categories,'accessibility'),
    'best_practices'=>ps_score($categories,'best-practices'),
    'seo'=>ps_score($categories,'seo')
  ],
  'field'=>$field,
  'origin_field'=>$originField,
  'lab'=>$lab,
  'opportunities'=>$opportunities,
  'diagnostics'=>$diagnostics,
  'passed'=>$passed,
  'resources'=>$resourceSummary,
  'provider'=>'Google PageSpeed Insights API / Lighthouse',
  'notes'=>[
    'Lab data is a synthetic Lighthouse run for the selected device strategy.',
    'Field data is shown only when the provider returns sufficient real-user experience data.',
    'Performance scores can vary between runs because network, server and page conditions change.',
    'Field data is provider-dependent and may be unavailable even when a Lighthouse lab run succeeds.'
  ]
]);
