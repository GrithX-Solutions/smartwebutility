(()=>{
'use strict';
const form=document.getElementById('dnssecForm'); if(!form)return;
const input=document.getElementById('dnssecDomain');
const results=document.getElementById('dnssecResults');
const progress=document.getElementById('dnssecProgress');
const errorEl=document.getElementById('dnssecError');
const titleEl=document.getElementById('dnssecTitle');
const metaEl=document.getElementById('dnssecMeta');
const verdictEl=document.getElementById('dnssecVerdict');
const resolversEl=document.getElementById('dnssecResolvers');
const dsEl=document.getElementById('dnssecDs');
const keysEl=document.getElementById('dnssecKeys');
const findingsEl=document.getElementById('dnssecFindings');
const methodologyEl=document.getElementById('dnssecMethodology');
const copyBtn=document.getElementById('dnssecCopy');
const submitBtn=form.querySelector('button[type="submit"]');
const counters={
 present:document.getElementById('dnssecPresent'),
 review:document.getElementById('dnssecReview'),
 critical:document.getElementById('dnssecCritical'),
 informational:document.getElementById('dnssecInfo')
};
let lastData=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cleanDomain=v=>v.trim().replace(/^https?:\/\//i,'').split('/')[0].replace(/:\d+$/,'').replace(/\.$/,'');
const statusLabel=s=>({present:'Present',review:'Review',critical:'Critical',informational:'Informational'}[s]||s);

function renderVerdict(data){
 const cls=({secure:'secure',bogus:'critical',unsigned:'neutral',partial:'review',unsigned_or_island:'review'}[data.verdict]||'neutral');
 verdictEl.className='dnssec-verdict '+cls;
 verdictEl.innerHTML='<div><span class="dnssec-verdict-icon">'+(cls==='secure'?'✓':cls==='critical'?'!':cls==='review'?'?':'i')+'</span><div><strong>'+esc(data.verdict_label)+'</strong><p>'+esc(data.verdict_explanation)+'</p></div></div>';
}

function renderSummary(data){
 Object.entries(counters).forEach(([k,el])=>el.textContent=String(data.summary?.[k]??0));
}

function renderResolvers(data){
 const rows=data.resolver_summary||[];
 resolversEl.innerHTML=rows.map(r=>{
  const state=r.validation_passed?'secure':r.validation_failure_pattern?'critical':r.ad===false?'neutral':'review';
  return '<article class="dnssec-resolver '+state+'"><div class="dnssec-resolver-head"><h3>'+esc(r.resolver)+'</h3><span>'+esc(r.validated_status_name)+'</span></div>'+
    '<div class="dnssec-resolver-grid"><div><small>AD flag</small><strong>'+esc(r.ad===true?'true':r.ad===false?'false':'—')+'</strong></div>'+
    '<div><small>Validation</small><strong>'+esc(r.validation_passed?'Passed':r.validation_failure_pattern?'Failed':'Not authenticated')+'</strong></div>'+
    '<div><small>CD=1 response</small><strong>'+esc(r.unchecked_status_name)+'</strong></div>'+
    '<div><small>Response</small><strong>'+esc(r.time_ms)+' ms</strong></div></div>'+
    (r.comment?'<p>'+esc(r.comment)+'</p>':'')+
  '</article>';
 }).join('')||'<div class="dnssec-empty">No resolver evidence returned.</div>';
}

function renderDs(data){
 const rows=data.ds_records||[];
 if(!rows.length){dsEl.innerHTML='<div class="dnssec-empty">No DS records were returned.</div>';return}
 dsEl.innerHTML='<div class="dnssec-table-wrap"><table class="record-table"><thead><tr><th>Key tag</th><th>Algorithm</th><th>Digest</th><th>TTL</th><th>Digest value</th></tr></thead><tbody>'+
 rows.map(r=>'<tr><td>'+esc(r.key_tag)+'</td><td>'+esc(r.algorithm_name||r.algorithm)+'</td><td>'+esc(r.digest_name||r.digest_type)+'</td><td>'+esc(r.ttl??'—')+'</td><td class="record-value dnssec-break">'+esc(r.digest||'—')+'</td></tr>').join('')+
 '</tbody></table></div>';
}

function renderKeys(data){
 const rows=data.dnskey_records||[];
 if(!rows.length){keysEl.innerHTML='<div class="dnssec-empty">No DNSKEY records were returned.</div>';return}
 keysEl.innerHTML='<div class="dnssec-table-wrap"><table class="record-table"><thead><tr><th>Role</th><th>Flags</th><th>Algorithm</th><th>TTL</th><th>Public key</th></tr></thead><tbody>'+
 rows.map(r=>'<tr><td>'+esc(r.role)+'</td><td>'+esc(r.flags)+'</td><td>'+esc(r.algorithm_name||r.algorithm)+'</td><td>'+esc(r.ttl??'—')+'</td><td class="record-value dnssec-break">'+esc(r.public_key||'—')+'</td></tr>').join('')+
 '</tbody></table></div>';
}

function renderFindings(data){
 const list=data.findings||[];
 findingsEl.innerHTML=list.length?list.map(f=>
  '<article class="dnssec-finding '+esc(f.status)+'"><div class="dnssec-finding-head"><span>'+esc(statusLabel(f.status))+'</span><h3>'+esc(f.title)+'</h3></div>'+
  '<div class="dnssec-finding-copy"><div><strong>Why it matters</strong><p>'+esc(f.why)+'</p></div><div><strong>What to do</strong><p>'+esc(f.fix)+'</p></div></div>'+
  (f.evidence?'<details><summary>Evidence</summary><pre>'+esc(JSON.stringify(f.evidence,null,2))+'</pre></details>':'')+
  '</article>'
 ).join(''):'<div class="dnssec-empty">No findings returned.</div>';
}

function renderMethodology(data){
 methodologyEl.innerHTML=(data.methodology||[]).map(x=>'<p>'+esc(x)+'</p>').join('');
}

function render(data){
 lastData=data; results.hidden=false;
 titleEl.textContent='DNSSEC analysis for '+data.domain;
 metaEl.textContent=(data.resolver_summary||[]).length+' validating resolvers · '+(data.ds_records||[]).length+' DS · '+(data.dnskey_records||[]).length+' DNSKEY';
 renderVerdict(data); renderSummary(data); renderResolvers(data); renderDs(data); renderKeys(data); renderFindings(data); renderMethodology(data);
 results.scrollIntoView({behavior:'smooth',block:'start'});
}

form.addEventListener('submit',async e=>{
 e.preventDefault(); errorEl.hidden=true; results.hidden=true;
 const domain=cleanDomain(input.value);
 if(!domain){errorEl.textContent='Enter a public domain name.';errorEl.hidden=false;return}
 input.value=domain; submitBtn.disabled=true; const old=submitBtn.textContent; submitBtn.textContent='Checking…'; progress.hidden=false;
 try{
  const res=await fetch('/api/dnssec-check.php?domain='+encodeURIComponent(domain),{headers:{Accept:'application/json'},cache:'no-store'});
  const data=await res.json().catch(()=>({error:'Invalid response from DNSSEC checker.'}));
  if(!res.ok||data.error)throw new Error(data.error||'DNSSEC check failed.');
  render(data); history.replaceState(null,'','?domain='+encodeURIComponent(domain));
 }catch(err){errorEl.textContent=err.message||'DNSSEC check failed.';errorEl.hidden=false}
 finally{progress.hidden=true;submitBtn.disabled=false;submitBtn.textContent=old}
});

copyBtn.addEventListener('click',async()=>{
 if(!lastData)return;
 const lines=['DNSSEC Checker',lastData.domain,lastData.verdict_label,lastData.verdict_explanation,'',
 ...(lastData.resolver_summary||[]).map(r=>r.resolver+': '+r.validated_status_name+' · AD='+String(r.ad)),
 '','DS records: '+(lastData.ds_records||[]).length,'DNSKEY records: '+(lastData.dnskey_records||[]).length,'',
 ...(lastData.findings||[]).map(f=>'['+statusLabel(f.status)+'] '+f.title+'\n'+f.why+'\nAction: '+f.fix)];
 try{await navigator.clipboard.writeText(lines.join('\n\n'));copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent='Copy report',1400)}catch{}
});

const q=new URLSearchParams(location.search).get('domain')||new URLSearchParams(location.search).get('host');
if(q){input.value=q;form.requestSubmit()}
})();