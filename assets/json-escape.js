(() => {
'use strict';
if(!document.body.hasAttribute('data-json-escape-tool'))return;
const input=document.getElementById('jsonEscapeInput');
const output=document.getElementById('jsonEscapeOutput');
const status=document.getElementById('jsonEscapeStatus');
const error=document.getElementById('jsonEscapeError');
const stats=document.getElementById('jsonEscapeStats');
const quotes=document.getElementById('jsonEscapeQuotes');
const slashes=document.getElementById('jsonEscapeSlashes');
const setStatus=(t,k='neutral')=>{status.textContent=t;status.dataset.kind=k};
function wrapRawEscaped(text){
  let out='"',slashesCount=0;
  for(const ch of text){
    if(ch==='"'&&slashesCount%2===0)out+='\\';
    out+=ch;
    if(ch==='\\')slashesCount++;else slashesCount=0;
  }
  return out+'"';
}
function showStats(mode){
  stats.hidden=false;
  stats.innerHTML='<span><b>'+input.value.length+'</b> input chars</span><span><b>'+output.value.length+'</b> output chars</span><span><b>'+mode+'</b> mode</span>';
}
function escapeValue(){
  error.hidden=true;error.textContent='';
  let encoded=JSON.stringify(input.value);
  if(!quotes.checked)encoded=encoded.slice(1,-1);
  if(slashes.checked)encoded=encoded.replace(/\//g,'\\/');
  output.value=encoded;showStats('Escape');setStatus('Escaped','success');
}
function unescapeValue(){
  error.hidden=true;error.textContent='';
  const raw=input.value;
  if(!raw){output.value='';stats.hidden=true;setStatus('Add input');return}
  const trimmed=raw.trim();
  let decoded;
  if(trimmed.startsWith('"')&&trimmed.endsWith('"'))decoded=JSON.parse(trimmed);
  else decoded=JSON.parse(wrapRawEscaped(raw));
  if(typeof decoded!=='string')throw new Error('Input must represent a JSON string value.');
  output.value=decoded;showStats('Unescape');setStatus('Unescaped','success');
}
function fail(e){output.value='';stats.hidden=true;error.textContent=e&&e.message?e.message:String(e);error.hidden=false;setStatus('Fix input','error')}
document.getElementById('escapeJsonString').addEventListener('click',()=>{try{escapeValue()}catch(e){fail(e)}});
document.getElementById('unescapeJsonString').addEventListener('click',()=>{try{unescapeValue()}catch(e){fail(e)}});
quotes.addEventListener('change',()=>{if(output.value||input.value){try{escapeValue()}catch(e){fail(e)}}});
slashes.addEventListener('change',()=>{if(output.value||input.value){try{escapeValue()}catch(e){fail(e)}}});
document.getElementById('exampleJsonEscape').addEventListener('click',()=>{input.value='Line 1\nLine 2\t"quoted" \\ path';try{escapeValue()}catch(e){fail(e)}});
document.getElementById('clearJsonEscape').addEventListener('click',()=>{input.value='';output.value='';error.hidden=true;stats.hidden=true;setStatus('Ready');input.focus()});
document.getElementById('copyJsonEscape').addEventListener('click',async()=>{if(!output.value)return;try{await navigator.clipboard.writeText(output.value)}catch(e){output.select();document.execCommand('copy')}setStatus('Copied','success')});
document.getElementById('downloadJsonEscape').addEventListener('click',()=>{if(!output.value)return;const url=URL.createObjectURL(new Blob([output.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='json-string.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)});
})();