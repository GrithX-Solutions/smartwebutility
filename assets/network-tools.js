(()=>{
const $=id=>document.getElementById(id); const form=$('toolForm'); if(!form)return;
const input=$('target'); const result=$('result'); const body=$('resultBody'); const title=$('resultTitle'); const err=$('error'); const copy=$('copyBtn');
const year=$('year'); if(year)year.textContent=new Date().getFullYear();
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const tool=form.dataset.tool;
function urlFor(v){return tool==='ssl'?`/api/ssl-check.php?host=${encodeURIComponent(v.replace(/^https?:\/\//i,'').split('/')[0])}`:tool==='redirect'?`/api/redirect-check.php?url=${encodeURIComponent(v)}`:`/api/http-status.php?url=${encodeURIComponent(v)}`}
function table(rows){return `<table class="record-table"><tbody>${rows.map(([k,v])=>`<tr><th>${esc(k)}</th><td class="record-value">${esc(v)}</td></tr>`).join('')}</tbody></table>`}
function render(data,v){
 if(tool==='ssl'){
  const r=data.result; title.textContent=`SSL certificate for ${r.host}`;
  body.innerHTML=table([['Status',r.valid_now?'Valid':'Not currently valid'],['Subject',r.subject],['Issuer',r.issuer],['Valid from',r.valid_from],['Expires',r.valid_to],['Days remaining',r.days_remaining],['IP',r.ip],['Signature',r.signature_type],['TLS connect',`${r.connect_time_ms} ms`]])+(r.sans?.length?`<div class="result-sub"><strong>Subject Alternative Names</strong><div class="chips">${r.sans.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>`:'');
 } else if(tool==='redirect'){
  title.textContent=`Redirect chain (${data.redirects} redirect${data.redirects===1?'':'s'})`;
  body.innerHTML=`<table class="record-table"><thead><tr><th>#</th><th>Status</th><th>URL</th><th>Location</th></tr></thead><tbody>${data.chain.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.status??'—')}</td><td class="record-value">${esc(r.url)}</td><td class="record-value">${esc(r.location??'Final')}</td></tr>`).join('')}</tbody></table>`;
 } else {
  const r=data.result; title.textContent=`HTTP ${r.status} — ${new URL(r.url).hostname}`;
  const rows=[['Status',r.status],['URL',r.url],['Response time',`${r.time_ms} ms`],['Resolved IP',r.ip],['Content type',r.content_type||'—'],['Server',r.headers?.server||'—'],['Location',r.headers?.location||'—']]; body.innerHTML=table(rows);
 }
 result.hidden=false;
}
form.addEventListener('submit',async e=>{e.preventDefault();err.hidden=true;result.hidden=true;const v=input.value.trim();if(!v){err.textContent='Enter a domain or URL.';err.hidden=false;return}const b=form.querySelector('button[type=submit]'),old=b.textContent;b.disabled=true;b.textContent='Checking…';try{const res=await fetch(urlFor(v),{headers:{accept:'application/json'}});const data=await res.json().catch(()=>({error:`HTTP ${res.status}`}));if(!res.ok||data.error)throw new Error(data.error||`HTTP ${res.status}`);render(data,v);const key=tool==='ssl'?'host':'url';history.replaceState(null,'',`?${key}=${encodeURIComponent(v)}`)}catch(e){err.textContent=e.message||'Check failed.';err.hidden=false}finally{b.disabled=false;b.textContent=old}});
copy?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(body.innerText);copy.textContent='Copied';setTimeout(()=>copy.textContent='Copy',1200)}catch{copy.textContent='Select & copy'}});
const p=new URLSearchParams(location.search),q=p.get(tool==='ssl'?'host':'url');if(q){input.value=q;form.requestSubmit()}
})();
