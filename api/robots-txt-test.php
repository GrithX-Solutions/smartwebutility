<?php
declare(strict_types=1);
require __DIR__.'/common.php';

rate_limit('robots-txt-tester', 20, 60);

$raw=file_get_contents('php://input');
$payload=json_decode($raw?:'',true);
if(!is_array($payload)) $payload=[];
$mode=strtolower(trim((string)($payload['mode'] ?? $_GET['mode'] ?? 'live')));
if(!in_array($mode,['live','paste'],true)) out(['error'=>'Mode must be live or paste.'],400);

function robots_strip_comment(string $line): string {
  $pos=strpos($line,'#');
  if($pos!==false) $line=substr($line,0,$pos);
  return trim($line);
}
function robots_norm_ua(string $value): string {
  $v=strtolower(trim($value));
  if($v==='*') return '*';
  if(preg_match('/^[a-z_-]+/i',$v,$m)) return strtolower($m[0]);
  return $v;
}
function robots_norm_path(string $s): string {
  $s=preg_replace_callback('/%([0-9a-f]{2})/i',function($m){
    $byte=hexdec($m[1]); $ch=chr($byte);
    if(preg_match('/[A-Za-z0-9\-._~]/',$ch)) return $ch;
    return '%'.strtoupper($m[1]);
  },$s);
  return preg_replace_callback('/[^\x00-\x7F]+/u',fn($m)=>rawurlencode($m[0]),$s);
}
function robots_rule_match(string $pattern,string $path): bool {
  $p=robots_norm_path($pattern);
  $path=robots_norm_path($path);
  $anchored=str_ends_with($p,'$');
  if($anchored) $p=substr($p,0,-1);
  $regex=preg_quote($p,'~');
  $regex=str_replace('\\*','.*',$regex);
  return (bool)preg_match('~^'.$regex.($anchored?'$':'').'~u',$path);
}
function robots_parse(string $text): array {
  $groups=[]; $sitemaps=[]; $warnings=[]; $current=null; $seenRules=false;
  $lines=preg_split('/\r\n|\r|\n/',$text);
  foreach($lines as $idx=>$original){
    $lineNo=$idx+1; $line=robots_strip_comment($original);
    if($line==='') continue;
    if(!str_contains($line,':')){
      $warnings[]=['line'=>$lineNo,'type'=>'syntax','message'=>'Line has no field/value colon.','source'=>trim($original)];
      continue;
    }
    [$field,$value]=array_map('trim',explode(':',$line,2));
    $field=strtolower($field);
    if($field==='user-agent'){
      if($value===''){
        $warnings[]=['line'=>$lineNo,'type'=>'syntax','message'=>'User-agent value is empty.','source'=>trim($original)];
        continue;
      }
      if($current===null || $seenRules){
        $groups[]=['agents'=>[],'rules'=>[],'start_line'=>$lineNo];
        $current=count($groups)-1; $seenRules=false;
      }
      $groups[$current]['agents'][]=['raw'=>$value,'token'=>robots_norm_ua($value),'line'=>$lineNo];
      continue;
    }
    if($field==='allow' || $field==='disallow'){
      if($current===null || empty($groups[$current]['agents'])){
        $warnings[]=['line'=>$lineNo,'type'=>'orphan-rule','message'=>ucfirst($field).' appears before any User-agent group and is ignored.','source'=>trim($original)];
        continue;
      }
      $seenRules=true;
      if($value===''){
        $warnings[]=['line'=>$lineNo,'type'=>'empty-rule','message'=>ucfirst($field).' has an empty path and is ignored.','source'=>trim($original)];
        continue;
      }
      if(!str_starts_with($value,'/')){
        $warnings[]=['line'=>$lineNo,'type'=>'path','message'=>ucfirst($field).' path normally starts with /.','source'=>trim($original)];
      }
      $groups[$current]['rules'][]=['type'=>$field,'path'=>$value,'line'=>$lineNo,'specificity'=>strlen(robots_norm_path($value))];
      continue;
    }
    if($field==='sitemap'){
      if($value===''){
        $warnings[]=['line'=>$lineNo,'type'=>'sitemap','message'=>'Sitemap directive is empty.','source'=>trim($original)];
      }else{
        $valid=(bool)filter_var($value,FILTER_VALIDATE_URL);
        $sitemaps[]=['url'=>$value,'line'=>$lineNo,'valid_absolute_url'=>$valid];
        if(!$valid) $warnings[]=['line'=>$lineNo,'type'=>'sitemap','message'=>'Sitemap should be an absolute URL.','source'=>trim($original)];
      }
      continue;
    }
    $message=$field==='crawl-delay'
      ? 'crawl-delay is not part of Google robots.txt rules and is ignored by Google.'
      : 'Unsupported directive is ignored by this Google/RFC-style evaluator.';
    $warnings[]=['line'=>$lineNo,'type'=>'unsupported','message'=>$message,'source'=>trim($original)];
  }
  return ['groups'=>$groups,'sitemaps'=>$sitemaps,'warnings'=>$warnings,'line_count'=>count($lines)];
}
function robots_select_rules(array $groups,string $ua): array {
  $uaLower=strtolower($ua);
  $best=-1; $matchedTokens=[];
  foreach($groups as $g){
    foreach($g['agents'] as $a){
      $token=$a['token'];
      if($token==='*') continue;
      if($token!=='' && str_contains($uaLower,$token)){
        $len=strlen($token);
        if($len>$best){$best=$len;$matchedTokens=[$token];}
        elseif($len===$best)$matchedTokens[]=$token;
      }
    }
  }
  $matchedTokens=array_values(array_unique($matchedTokens));
  $rules=[]; $groupsUsed=[];
  if($best>=0){
    foreach($groups as $gi=>$g){
      $use=false;
      foreach($g['agents'] as $a){
        if(in_array($a['token'],$matchedTokens,true)){$use=true;break;}
      }
      if($use){$groupsUsed[]=$gi+1;foreach($g['rules'] as $r)$rules[]=$r;}
    }
    return ['rules'=>$rules,'groups'=>$groupsUsed,'tokens'=>$matchedTokens,'fallback'=>false];
  }
  foreach($groups as $gi=>$g){
    $use=false;
    foreach($g['agents'] as $a){if($a['token']==='*'){$use=true;break;}}
    if($use){$groupsUsed[]=$gi+1;foreach($g['rules'] as $r)$rules[]=$r;}
  }
  return ['rules'=>$rules,'groups'=>$groupsUsed,'tokens'=>$groupsUsed?['*']:[],'fallback'=>(bool)$groupsUsed];
}
function robots_test_path(array $selection,string $input): array {
  $p=parse_url($input);
  if($p!==false && isset($p['host'])){
    $path=$p['path'] ?? '/';
    if(isset($p['query']) && $p['query']!=='') $path.='?'.$p['query'];
  }else{
    $path=trim($input);
    if($path==='') $path='/';
    if(!str_starts_with($path,'/')) $path='/'.$path;
  }
  if($path==='/robots.txt') return ['input'=>$input,'path'=>$path,'allowed'=>true,'matched'=>null,'reason'=>'robots.txt is implicitly allowed by RFC 9309.'];
  $matches=[];
  foreach($selection['rules'] as $r){
    if(robots_rule_match($r['path'],$path)) $matches[]=$r;
  }
  if(!$matches) return ['input'=>$input,'path'=>$path,'allowed'=>true,'matched'=>null,'reason'=>'No matching Allow or Disallow rule applies.'];
  usort($matches,function($a,$b){
    if($a['specificity']!==$b['specificity']) return $b['specificity']<=>$a['specificity'];
    if($a['type']!==$b['type']) return $a['type']==='allow'?-1:1;
    return $a['line']<=>$b['line'];
  });
  $winner=$matches[0];
  return [
    'input'=>$input,'path'=>$path,'allowed'=>$winner['type']==='allow',
    'matched'=>$winner,
    'reason'=>($winner['type']==='allow'?'Allowed':'Blocked').' by the most specific matching rule on line '.$winner['line'].'.',
    'matching_rules'=>array_slice($matches,0,20)
  ];
}
function robots_fetch_live(string $input): array {
  $base=normalize_url($input);
  $p=parse_url($base);
  $port=isset($p['port'])?':'.$p['port']:'';
  $robotsUrl=$p['scheme'].'://'.$p['host'].$port.'/robots.txt';
  $current=$robotsUrl; $chain=[];
  for($i=0;$i<6;$i++){
    $r=curl_body($current,512000);
    $chain[]=['url'=>$current,'status'=>$r['status'],'location'=>$r['headers']['location']??null];
    if(in_array($r['status'],[301,302,303,307,308],true) && !empty($r['headers']['location']) && $i<5){
      $current=normalize_url(absolute_url($current,$r['headers']['location']));
      continue;
    }
    return ['robots_url'=>$robotsUrl,'final_url'=>$current,'status'=>$r['status'],'body'=>$r['body'],'truncated'=>$r['truncated'],'chain'=>$chain,'content_type'=>$r['content_type']];
  }
  return ['robots_url'=>$robotsUrl,'final_url'=>$current,'status'=>0,'body'=>'','truncated'=>false,'chain'=>$chain,'content_type'=>null];
}

$ua=trim((string)($payload['user_agent'] ?? 'Googlebot'));
if($ua==='') $ua='Googlebot';
if(strlen($ua)>300) out(['error'=>'User-agent is too long.'],400);
$paths=$payload['paths'] ?? ['/'];
if(!is_array($paths)) $paths=[$paths];
$paths=array_values(array_filter(array_map(fn($v)=>trim((string)$v),$paths),fn($v)=>$v!==''));
$paths=array_slice($paths,0,100);
if(!$paths) $paths=['/'];

$fetch=null; $text='';
if($mode==='live'){
  $input=trim((string)($payload['url'] ?? ''));
  if($input==='') out(['error'=>'Enter a public website URL for live mode.'],400);
  $fetch=robots_fetch_live($input);
  if($fetch['truncated']) out(['error'=>'robots.txt exceeds the 500 KiB limit used by this tester.'],422);
  $status=(int)$fetch['status'];
  if($status>=400 && $status<500){
    out([
      'ok'=>true,'mode'=>'live','fetch'=>$fetch,'user_agent'=>$ua,
      'source_text'=>'','parse'=>['groups'=>[],'sitemaps'=>[],'warnings'=>[],'line_count'=>0],
      'selection'=>['rules'=>[],'groups'=>[],'tokens'=>[],'fallback'=>false],
      'tests'=>array_map(fn($p)=>['input'=>$p,'path'=>str_starts_with($p,'/')?$p:'/'.$p,'allowed'=>true,'matched'=>null,'reason'=>'robots.txt returned HTTP '.$status.'; no crawl rules were available from this fetch.'],$paths),
      'fetch_note'=>'robots.txt returned HTTP '.$status.'. This tester reports no crawl rules from the fetched file; search engines have their own temporary error handling and caching behavior.'
    ]);
  }
  if($status<200 || $status>=300) out(['error'=>'robots.txt returned HTTP '.$status.'. Retry when the host is reachable.','fetch'=>$fetch],502);
  $text=$fetch['body'];
}else{
  $text=(string)($payload['text'] ?? '');
  if(strlen($text)>512000) out(['error'=>'Pasted robots.txt exceeds 500 KiB.'],422);
}

$parse=robots_parse($text);
$selection=robots_select_rules($parse['groups'],$ua);
$tests=array_map(fn($path)=>robots_test_path($selection,$path),$paths);

out([
  'ok'=>true,'mode'=>$mode,'fetch'=>$fetch,'user_agent'=>$ua,'source_text'=>$text,
  'parse'=>$parse,'selection'=>$selection,'tests'=>$tests,
  'methodology'=>[
    'User-agent matching selects the most specific matching product token; equally specific matching groups are combined.',
    'A specific user-agent group is not combined with the global * group.',
    'The longest matching Allow or Disallow path wins; an equal-specificity conflict prefers Allow.',
    '* matches zero or more characters and a terminal $ anchors the end of the URL path.',
    'robots.txt controls crawling by compliant crawlers; it is not access control and is not a reliable noindex mechanism.'
  ]
]);
