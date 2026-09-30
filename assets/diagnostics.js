(() => {
'use strict';
const form=document.getElementById('diagForm'); if(!form)return;
const tool=form.dataset.tool, input=document.getElementById('target'), type=document.getElementById('recordType'), result=document.getElementById('result'), body=document.getElementById('resultBody'), title=document.getElementById('resultTitle'), error=document.getElementById('error'), copy=document.getElementById('copyBtn'), year=document.getElementById('year');
if(year)year.textContent=new Date().getFullYear();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const row=(k,v)=>'<tr><th>'+esc(k)+'</th><td class="record-value">'+esc(v??'—')+'</td></tr>';
function endpoint(v){
 if(tool==='sitemap')return '/api/sitemap-check.php?url='+encodeURIComponent(v);
 if(tool==='meta')return '/api/page-inspect.php?mode=meta&url='+encodeURIComponent(v);
 if(tool==='og')return '/api/page-inspect.php?mode=og&url='+encodeURIComponent(v);
 if(tool==='headers')return '/api/http-status.php?url='+encodeURIComponent(v);
 return '/api/dns-propagation.php?host='+encodeURIComponent(v.replace(/^https?:\/\//i,'').split('/')[0])+'&type='+encodeURIComponent(type.value);
}
function render(data){
 if(tool==='sitemap'){
  const r=data.result; title.textContent='Sitemap check'; body.innerHTML='<table class="record-table"><tbody>'+row('Status',r.status)+row('Type',r.type)+row('Entries',r.entries)+row('Response truncated',r.truncated?'Yes':'No')+'</tbody></table>'+(r.sample?.length?'<div class="result-sub"><strong>Sample entries</strong><div class="chips">'+r.sample.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>':'');
 } else if(tool==='meta'){
  const r=data.result; title.textContent='Meta tag check'; body.innerHTML='<table class="record-table"><tbody>'+row('Status',r.status)+row('Title',r.title)+row('Description',r.description)+row('Canonical',r.canonical)+row('Robots',r.robots)+row('H1 count',r.h1_count)+'</tbody></table>';
 } else if(tool==='og'){
  const r=data.result.open_graph; title.textContent='Open Graph check'; body.innerHTML='<table class="record-table"><tbody>'+Object.entries(r).map(([k,v])=>row(k,v)).join('')+'</tbody></table>';
 } else if(tool==='headers'){
  const r=data.result; title.textContent='HTTP headers'; body.innerHTML='<table class="record-table"><tbody>'+row('Status',r.status)+row('Resolved IP',r.ip)+row('Response time',r.time_ms+' ms')+Object.entries(r.headers||{}).map(([k,v])=>row(k,v)).join('')+'</tbody></table>';
 } else {
  title.textContent=data.type+' propagation / resolver comparison';
  body.innerHTML='<table class="record-table"><thead><tr><th>Resolver</th><th>Status</th><th>Answers</th></tr></thead><tbody>'+data.results.map(r=>'<tr><td>'+esc(r.resolver)+'</td><td>'+(r.ok?'OK':'Error')+'</td><td class="record-value">'+esc((r.answers||[]).join(' | ')||r.error||'No answer')+'</td></tr>').join('')+'</tbody></table>';
 }
 result.hidden=false;
}
form.addEventListener('submit',async e=>{e.preventDefault();error.hidden=true;result.hidden=true;const v=input.value.trim();if(!v){error.textContent='Enter a valid URL or domain.';error.hidden=false;return}const b=form.querySelector('button[type=submit]'),old=b.textContent;b.disabled=true;b.textContent='Checking…';try{const res=await fetch(endpoint(v),{headers:{accept:'application/json'}});const data=await res.json().catch(()=>({error:'The server returned an unreadable response (HTTP '+res.status+'). Please try again later.'}));if(!res.ok||data.error)throw new Error(data.error||'Check failed');render(data);history.replaceState(null,'','?target='+encodeURIComponent(v)+(type?'&type='+encodeURIComponent(type.value):''))}catch(err){error.textContent=err.message||'Check failed.';error.hidden=false}finally{b.disabled=false;b.textContent=old}});
copy?.addEventListener('click',async()=>{if(!body.innerText)return;await navigator.clipboard.writeText(body.innerText);copy.textContent='Copied';setTimeout(()=>copy.textContent='Copy',1200)});
const p=new URLSearchParams(location.search);if(p.get('target')){input.value=p.get('target');if(type&&p.get('type'))type.value=p.get('type');form.requestSubmit()}
})();