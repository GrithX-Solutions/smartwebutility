(() => {
'use strict';
if (!document.body.hasAttribute('data-curl-converter')) return;
const input=document.getElementById('curlInput');
const output=document.getElementById('curlOutput');
const target=document.getElementById('curlTarget');
const status=document.getElementById('curlStatus');
const error=document.getElementById('curlError');
const stats=document.getElementById('curlStats');
const warnings=document.getElementById('curlWarnings');
const setStatus=(text,kind='neutral')=>{status.textContent=text;status.dataset.kind=kind};

function shellDanger(source){
  const s=source.replace(/\\\r?\n/g,' ');
  if(s.indexOf('$(')!==-1||s.indexOf('`')!==-1)return 'Command substitution is not supported.';
  if(s.indexOf('$'+'{')!==-1||/(^|[^\\])\$[A-Za-z_]/.test(s))return 'Shell variable expansion is not supported.';
  if(/(^|\s)(\||&&|;|>|<)(\s|$)/.test(s))return 'Shell pipelines, chaining and redirection are not supported.';
  return '';
}
function tokenize(source){
  const danger=shellDanger(source);if(danger)throw new Error(danger);
  source=source.replace(/\\\r?\n/g,' ').trim();
  const tokens=[];let current='',quote='',escaped=false;
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(escaped){current+=ch;escaped=false;continue}
    if(quote==="'"){if(ch==="'")quote='';else current+=ch;continue}
    if(quote==='"'){
      if(ch==='"'){quote='';continue}
      if(ch==='\\'){
        const next=source[i+1];
        if(next==='"'||next==='\\'||next==='$'||next==='`'){current+=next;i++;continue}
      }
      current+=ch;continue
    }
    if(ch==="'"||ch==='"'){quote=ch;continue}
    if(ch==='\\'){escaped=true;continue}
    if(/\s/.test(ch)){if(current){tokens.push(current);current=''}continue}
    current+=ch;
  }
  if(escaped)current+='\\';
  if(quote)throw new Error('Unclosed quote in cURL command.');
  if(current)tokens.push(current);
  return tokens;
}
function need(tokens,i,flag){if(i+1>=tokens.length)throw new Error(flag+' requires a value.');return tokens[i+1]}
function parseCurl(source){
  const tokens=tokenize(source);
  if(!tokens.length)throw new Error('Add a cURL command to convert.');
  const first=tokens[0].split(/[\\/]/).pop().toLowerCase();
  if(first!=='curl'&&first!=='curl.exe')throw new Error('The command must start with curl.');
  const req={method:'',url:'',headers:[],data:[],jsonData:[],auth:null,getWithData:false,warnings:[]};
  const ignored=new Set(['-s','--silent','-S','--show-error','--compressed']);
  for(let i=1;i<tokens.length;i++){
    const t=tokens[i];
    if(ignored.has(t))continue;
    if(t==='-L'||t==='--location'){req.warnings.push('Redirect behavior differs by generated HTTP client.');continue}
    if(t==='-I'||t==='--head'){req.method='HEAD';continue}
    if(t==='-G'||t==='--get'){req.getWithData=true;continue}
    if(t==='-X'||t==='--request'){req.method=need(tokens,i,t).toUpperCase();i++;continue}
    if(t.startsWith('-X')&&t.length>2){req.method=t.slice(2).toUpperCase();continue}
    if(t==='--url'){req.url=need(tokens,i,t);i++;continue}
    if(t==='-H'||t==='--header'){
      const v=need(tokens,i,t),c=v.indexOf(':');if(c<=0)throw new Error('Header must use "Name: value" syntax.');
      req.headers.push([v.slice(0,c).trim(),v.slice(c+1).trim()]);i++;continue
    }
    if(t.startsWith('-H')&&t.length>2){
      const v=t.slice(2),c=v.indexOf(':');if(c<=0)throw new Error('Header must use "Name: value" syntax.');
      req.headers.push([v.slice(0,c).trim(),v.slice(c+1).trim()]);continue
    }
    if(t==='-d'||t==='--data'||t==='--data-raw'||t==='--data-binary'||t==='--data-ascii'){
      const v=need(tokens,i,t);if(v.startsWith('@'))throw new Error('Local-file request bodies such as @payload.json are not supported.');
      if(req.jsonData.length)throw new Error('Mixing --json with -d/--data options is not supported because curl combines those forms differently.');
      req.data.push(v);i++;continue
    }
    if(t==='--json'){
      const v=need(tokens,i,t);
      if(v.startsWith('@'))throw new Error('--json file/stdin forms such as @payload.json or @- are not supported. Paste the inline JSON data instead.');
      if(req.data.length)throw new Error('Mixing --json with -d/--data options is not supported because curl combines those forms differently.');
      req.jsonData.push(v);i++;continue
    }
    if(t.startsWith('-d')&&t.length>2){
      const v=t.slice(2);if(v.startsWith('@'))throw new Error('Local-file request bodies such as @payload.json are not supported.');
      if(req.jsonData.length)throw new Error('Mixing --json with -d/--data options is not supported because curl combines those forms differently.');
      req.data.push(v);continue
    }
    if(t==='--data-urlencode')throw new Error('--data-urlencode is not supported because its encoding form is context-dependent.');
    if(t==='-F'||t==='--form'||t.startsWith('-F'))throw new Error('Multipart -F/--form conversion is not supported in this version.');
    if(t==='-u'||t==='--user'){
      const v=need(tokens,i,t),c=v.indexOf(':');req.auth=c===-1?[v,'']:[v.slice(0,c),v.slice(c+1)];i++;continue
    }
    if(t.startsWith('-u')&&t.length>2){
      const v=t.slice(2),c=v.indexOf(':');req.auth=c===-1?[v,'']:[v.slice(0,c),v.slice(c+1)];continue
    }
    if(t==='-b'||t==='--cookie'){req.headers.push(['Cookie',need(tokens,i,t)]);i++;continue}
    if(t==='-A'||t==='--user-agent'){req.headers.push(['User-Agent',need(tokens,i,t)]);i++;continue}
    if(t==='-e'||t==='--referer'){req.headers.push(['Referer',need(tokens,i,t)]);i++;continue}
    if(t==='-k'||t==='--insecure'){req.warnings.push('Source disables TLS verification; generated code does not copy that unsafe behavior.');continue}
    if(t.startsWith('-'))throw new Error('Unsupported cURL option: '+t);
    if(!req.url)req.url=t;else throw new Error('Unexpected extra argument: '+t);
  }
  if(!req.url)throw new Error('No request URL was found.');
  if(!/^https?:\/\//i.test(req.url))req.warnings.push('URL does not start with http:// or https://.');
  if(req.jsonData.length){
    if(req.getWithData)throw new Error('--json cannot be combined with -G/--get in this converter.');
    if(req.method==='HEAD')throw new Error('--json cannot be combined with -I/--head.');
    if(!req.method)req.method='POST';
    const hasType=req.headers.some(pair=>pair[0].toLowerCase()==='content-type');
    const hasAccept=req.headers.some(pair=>pair[0].toLowerCase()==='accept');
    if(!hasType)req.headers.push(['Content-Type','application/json']);
    if(!hasAccept)req.headers.push(['Accept','application/json']);
  }
  if(req.data.length){
    if(req.getWithData){
      req.url+=(req.url.includes('?')?'&':'?')+req.data.join('&');req.data=[];if(!req.method)req.method='GET'
    }else if(!req.method)req.method='POST';
  }
  if(!req.method)req.method='GET';
  const hasType=req.headers.some(pair=>pair[0].toLowerCase()==='content-type');
  if(req.data.length&&!hasType)req.headers.push(['Content-Type','application/x-www-form-urlencoded']);
  req.body=req.jsonData.length?req.jsonData.join(''):req.data.join('&');
  const typePair=req.headers.find(pair=>pair[0].toLowerCase()==='content-type');
  const contentType=typePair?typePair[1]:'';
  req.jsonBody=null;
  if(req.body&&(req.jsonData.length||/application\/(?:[A-Za-z0-9.+-]+\+)?json/i.test(contentType))){
    try{req.jsonBody=JSON.parse(req.body)}
    catch(e){req.warnings.push((req.jsonData.length?'--json data':'Content-Type is JSON')+' but the body is not valid JSON; preserving it as a string.')}
  }
  return req;
}
const q=v=>JSON.stringify(String(v));
const php=v=>"'" + String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'") + "'";
function headersObject(headers){
  const o={};for(const pair of headers){const n=pair[0],v=pair[1];o[n]=Object.prototype.hasOwnProperty.call(o,n)?o[n]+', '+v:v}return o
}
function python(req){
  const lines=['import requests'];if(req.jsonBody!==null)lines.push('import json');lines.push('','url = '+q(req.url));
  if(req.headers.length)lines.push('headers = '+JSON.stringify(headersObject(req.headers),null,4));
  if(req.jsonBody!==null)lines.push('payload = json.loads('+q(JSON.stringify(req.jsonBody))+')');
  else if(req.body)lines.push('data = '+q(req.body));
  const args=[q(req.method),'url'];if(req.headers.length)args.push('headers=headers');if(req.auth)args.push('auth=('+q(req.auth[0])+', '+q(req.auth[1])+')');
  if(req.jsonBody!==null)args.push('json=payload');else if(req.body)args.push('data=data');
  lines.push('','response = requests.request('+args.join(', ')+')','print(response.status_code)','print(response.text)');return lines.join('\n')
}
function fetchCode(req){
  if((req.method==='GET'||req.method==='HEAD')&&req.body)throw new Error('JavaScript fetch does not allow a body with '+req.method+'. Use -G/--get or another output.');
  const h=headersObject(req.headers);
  if(req.auth){const raw=req.auth[0]+':'+req.auth[1];h.Authorization='Basic '+btoa(unescape(encodeURIComponent(raw)))}
  const opts=['  method: '+q(req.method)];
  if(Object.keys(h).length)opts.push('  headers: '+JSON.stringify(h,null,2).replace(/\n/g,'\n  '));
  if(req.jsonBody!==null)opts.push('  body: JSON.stringify('+JSON.stringify(req.jsonBody,null,2).replace(/\n/g,'\n  ')+')');
  else if(req.body)opts.push('  body: '+q(req.body));
  return ['const response = await fetch('+q(req.url)+', {',opts.join(',\n'),'});','','const text = await response.text();','console.log(response.status, text);'].join('\n')
}
function axios(req){
  const lines=["import axios from 'axios';",'','const response = await axios({','  method: '+q(req.method.toLowerCase())+',','  url: '+q(req.url)+','];
  if(req.headers.length)lines.push('  headers: '+JSON.stringify(headersObject(req.headers),null,2).replace(/\n/g,'\n  ')+',');
  if(req.auth)lines.push('  auth: { username: '+q(req.auth[0])+', password: '+q(req.auth[1])+' },');
  if(req.jsonBody!==null)lines.push('  data: '+JSON.stringify(req.jsonBody,null,2).replace(/\n/g,'\n  ')+',');else if(req.body)lines.push('  data: '+q(req.body)+',');
  lines.push('});','','console.log(response.status, response.data);');return lines.join('\n')
}
function phpCode(req){
  const opts=['    CURLOPT_URL => '+php(req.url),'    CURLOPT_RETURNTRANSFER => true'];
  if(req.method==='HEAD')opts.push('    CURLOPT_NOBODY => true');else if(req.method!=='GET')opts.push('    CURLOPT_CUSTOMREQUEST => '+php(req.method));
  if(req.headers.length)opts.push('    CURLOPT_HTTPHEADER => ['+req.headers.map(pair=>php(pair[0]+': '+pair[1])).join(', ')+']');
  if(req.auth)opts.push('    CURLOPT_USERPWD => '+php(req.auth[0]+':'+req.auth[1]));
  if(req.body)opts.push('    CURLOPT_POSTFIELDS => '+php(req.body));
  return ['<?php','$ch = curl_init();','curl_setopt_array($ch, [',opts.join(',\n'),']);','','$response = curl_exec($ch);','$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);','curl_close($ch);','','echo $status . PHP_EOL;','echo $response;'].join('\n')
}
function convert(){
  error.hidden=true;error.textContent='';warnings.hidden=true;warnings.innerHTML='';
  const req=parseCurl(input.value);let code='';
  if(target.value==='python')code=python(req);else if(target.value==='fetch')code=fetchCode(req);else if(target.value==='axios')code=axios(req);else code=phpCode(req);
  output.value=code;stats.hidden=false;stats.innerHTML='<span><b>'+req.method+'</b> method</span><span><b>'+req.headers.length+'</b> headers</span><span><b>'+new Blob([req.body]).size+'</b> body bytes</span>';
  if(req.warnings.length){warnings.hidden=false;warnings.innerHTML=req.warnings.map(w=>'<span>⚠ '+w.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</span>').join('')}
  setStatus('Converted','success')
}
function fail(e){output.value='';stats.hidden=true;warnings.hidden=true;error.textContent=e&&e.message?e.message:String(e);error.hidden=false;setStatus('Fix command','error')}
document.getElementById('convertCurl').addEventListener('click',()=>{try{convert()}catch(e){fail(e)}});
target.addEventListener('change',()=>{if(input.value.trim()){try{convert()}catch(e){fail(e)}}});
document.getElementById('exampleCurl').addEventListener('click',()=>{
  input.value="curl -X POST 'https://api.example.com/v1/items' -H 'Authorization: Bearer demo-token' -H 'Content-Type: application/json' -d '{\"name\":\"monitor\",\"price\":199}'";
  try{convert()}catch(e){fail(e)}
});
document.getElementById('clearCurl').addEventListener('click',()=>{input.value='';output.value='';error.hidden=true;stats.hidden=true;warnings.hidden=true;setStatus('Ready');input.focus()});
document.getElementById('copyCurlOutput').addEventListener('click',async()=>{if(!output.value)return;try{await navigator.clipboard.writeText(output.value)}catch(e){output.select();document.execCommand('copy')}setStatus('Copied','success')});
document.getElementById('downloadCurlOutput').addEventListener('click',()=>{
  if(!output.value)return;const ex={python:'py',fetch:'js',axios:'js',php:'php'};const type=target.value==='python'?'text/x-python':target.value==='php'?'application/x-httpd-php':'text/javascript';
  const url=URL.createObjectURL(new Blob([output.value],{type:type+';charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='curl-converted.'+ex[target.value];document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
});
input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();try{convert()}catch(err){fail(err)}}});
})();