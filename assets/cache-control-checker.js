(()=>{
'use strict';
const form=document.getElementById('cacheControlForm'); if(!form)return;
const input=document.getElementById('cacheControlUrl');
const results=document.getElementById('cacheControlResults');
const progress=document.getElementById('cacheControlProgress');
const errorEl=document.getElementById('cacheControlError');
const titleEl=document.getElementById('cacheControlTitle');
const metaEl=document.getElementById('cacheControlMeta');
const policyEl=document.getElementById('cachePolicy');
const requestsEl=document.getElementById('cacheRequests');
const headersEl=document.getElementById('cacheHeaders');
const findingsEl=document.getElementById('cacheFindings');
const redirectsEl=document.getElementById('cacheRedirects');
const methodologyEl=document.getElementById('cacheMethodology');
const copyBtn=document.getElementById('cacheControlCopy');
const submitBtn=form.querySelector('button[type="submit"]');
const counters={present:document.getElementById('cachePresent'),review:document.getElementById('cacheReview'),informational:document.getElementById('cacheInfo')};
let lastData=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cleanUrl=v=>{v=v.trim();if(v&&!/^https?:\/\//i.test(v))v='https://'+v;return v};
const statusLabel=s=>({present:'Present',review:'Review',informational:'Informational'}[s]||s);
const ttl=v=>v==null?'—':(v<60?v+' sec':v<3600?Math.round(v/60)+' min':v<86400?(v/3600).toFixed(v%3600?1:0)+' hr':(v/86400).toFixed(v%86400?1:0)+' days');

function renderSummary(data){
 Object.entries(counters).forEach(([k,el])=>el.textContent=String(data.summary?.[k]??0));
}
function policyCard(title,mode,ttlValue,extra){
 return '<article><span class="kicker">'+esc(title)+'</span><strong>'+esc(mode||'unspecified')+'</strong><p>Freshness: '+esc(ttl(ttlValue))+'</p>'+(extra?'<small>'+esc(extra)+'</small>':'')+'</article>';
}
function renderPolicy(data){
 const p=data.policy||{};
 policyEl.innerHTML=
  policyCard('Browser cache',p.browser_mode,p.browser_ttl_seconds,p.cache_control||'No Cache-Control header')+
  policyCard('Shared / CDN cache',p.shared_mode,p.shared_ttl_seconds,p.cdn_cache_control||p.cloudflare_cdn_cache_control||p.cache_control||'No explicit shared-cache TTL')+
  '<article><span class="kicker">Current Age</span><strong>'+esc(p.age??'—')+'</strong><p>Proxy-cache seconds</p><small>'+esc(p.expires?'Expires: '+p.expires:'No Expires header')+'</small></article>';
}
function requestCard(label,r,signal){
 const h=r?.headers||{};
 return '<article><div class="cache-request-head"><h3>'+esc(label)+'</h3><span>HTTP '+esc(r?.status??'—')+'</span></div>'+
 '<div class="cache-request-metrics"><div><small>Time</small><strong>'+esc(r?.time_ms??'—')+' ms</strong></div><div><small>Age</small><strong>'+esc(h.age??'—')+'</strong></div><div><small>Cache signal</small><strong>'+esc(signal?.value??'None')+'</strong></div><div><small>Downloaded</small><strong>'+esc(r?.downloaded_bytes??'—')+' B</strong></div></div>'+
 (r?.truncated?'<p class="cache-note">Body sampling stopped after the safety limit; header analysis remains available.</p>':'')+
 '</article>';
}
function renderRequests(data){
 requestsEl.innerHTML=requestCard('First request',data.first_request,data.policy?.first_hit_signal)+requestCard('Second request',data.second_request,data.policy?.second_hit_signal);
}
function renderHeaders(data){
 const p=data.policy||{};
 const rows=[
  ['Cache-Control',p.cache_control],
  ['CDN-Cache-Control',p.cdn_cache_control],
  ['Cloudflare-CDN-Cache-Control',p.cloudflare_cdn_cache_control],
  ['Age',p.age],['Expires',p.expires],['ETag',p.etag],['Last-Modified',p.last_modified],['Vary',p.vary]
 ];
 (p.cdn_headers||[]).forEach(x=>rows.push([x.header,x.value]));
 headersEl.innerHTML='<div class="cache-table-wrap"><table class="record-table"><tbody>'+rows.map(([k,v])=>'<tr><th>'+esc(k)+'</th><td class="record-value">'+esc(v??'—')+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderFindings(data){
 const list=data.findings||[];
 findingsEl.innerHTML=list.length?list.map(f=>'<article class="cache-finding '+esc(f.status)+'"><div class="cache-finding-head"><span>'+esc(statusLabel(f.status))+'</span><h3>'+esc(f.title)+'</h3></div><div class="cache-finding-copy"><div><strong>Why it matters</strong><p>'+esc(f.why)+'</p></div><div><strong>What to do</strong><p>'+esc(f.fix)+'</p></div></div>'+(f.evidence?'<details><summary>Evidence</summary><pre>'+esc(JSON.stringify(f.evidence,null,2))+'</pre></details>':'')+'</article>').join(''):'<div class="cache-empty">No findings returned.</div>';
}
function renderRedirects(data){
 const chain=data.redirect_chain||[];
 redirectsEl.innerHTML=chain.length?'<div class="cache-chain">'+chain.map((x,i)=>'<article><span>'+(i+1)+'</span><div><strong>HTTP '+esc(x.status)+'</strong><code>'+esc(x.url)+'</code>'+(x.location?'<small>Location: '+esc(x.location)+'</small>':'')+'</div><em>'+esc(x.time_ms)+' ms</em></article>').join('')+'</div>':'<div class="cache-empty">No redirect data.</div>';
}
function renderMethodology(data){
 methodologyEl.innerHTML=(data.methodology||[]).map(x=>'<p>'+esc(x)+'</p>').join('');
}
function render(data){
 lastData=data;results.hidden=false;
 const host=(()=>{try{return new URL(data.final_url||data.requested_url).hostname}catch{return data.final_url||data.requested_url}})();
 titleEl.textContent='Cache policy for '+host;
 metaEl.textContent='Final URL: '+(data.final_url||data.requested_url)+' · HTTP '+(data.second_request?.status??'—');
 renderSummary(data);renderPolicy(data);renderRequests(data);renderHeaders(data);renderFindings(data);renderRedirects(data);renderMethodology(data);
 results.scrollIntoView({behavior:'smooth',block:'start'});
}
form.addEventListener('submit',async e=>{
 e.preventDefault();errorEl.hidden=true;results.hidden=true;
 const url=cleanUrl(input.value); if(!url){errorEl.textContent='Enter a public HTTP or HTTPS URL.';errorEl.hidden=false;return}
 try{new URL(url)}catch{errorEl.textContent='Enter a valid public website URL.';errorEl.hidden=false;return}
 input.value=url;submitBtn.disabled=true;const old=submitBtn.textContent;submitBtn.textContent='Checking…';progress.hidden=false;
 try{
  const res=await fetch('/api/cache-control-check.php?url='+encodeURIComponent(url),{headers:{Accept:'application/json'},cache:'no-store'});
  const data=await res.json().catch(()=>({error:'Invalid response from cache checker.'}));
  if(!res.ok||data.error)throw new Error(data.error||'Cache check failed.');
  render(data);history.replaceState(null,'','?url='+encodeURIComponent(url));
 }catch(err){errorEl.textContent=err.message||'Cache check failed.';errorEl.hidden=false}
 finally{progress.hidden=true;submitBtn.disabled=false;submitBtn.textContent=old}
});
copyBtn.addEventListener('click',async()=>{
 if(!lastData)return;
 const p=lastData.policy||{};
 const lines=['Cache-Control Checker',lastData.final_url||lastData.requested_url,'Browser mode: '+(p.browser_mode||'—')+' · TTL '+ttl(p.browser_ttl_seconds),'Shared mode: '+(p.shared_mode||'—')+' · TTL '+ttl(p.shared_ttl_seconds),'Cache-Control: '+(p.cache_control||'—'),'Second request signal: '+(p.second_hit_signal?.value||'None'),'',
 ...(lastData.findings||[]).map(f=>'['+statusLabel(f.status)+'] '+f.title+'\n'+f.why+'\nAction: '+f.fix)];
 try{await navigator.clipboard.writeText(lines.join('\n\n'));copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent='Copy report',1400)}catch{}
});
const q=new URLSearchParams(location.search).get('url')||new URLSearchParams(location.search).get('target');
if(q){input.value=q;form.requestSubmit()}
})();