(()=>{
'use strict';
const form=document.getElementById('securityHeadersForm');
if(!form)return;
const input=document.getElementById('securityHeadersUrl');
const results=document.getElementById('securityHeadersResults');
const progress=document.getElementById('securityHeadersProgress');
const errorEl=document.getElementById('securityHeadersError');
const titleEl=document.getElementById('securityHeadersTitle');
const metaEl=document.getElementById('securityHeadersMeta');
const findingsEl=document.getElementById('securityFindings');
const rawEl=document.getElementById('securityRawHeaders');
const redirectsEl=document.getElementById('securityRedirects');
const redirectsWrap=document.getElementById('securityRedirectsWrap');
const methodologyEl=document.getElementById('securityMethodology');
const copyBtn=document.getElementById('securityHeadersCopy');
const submitBtn=form.querySelector('button[type="submit"]');
const counters={
  present:document.getElementById('securityPresent'),
  review:document.getElementById('securityReview'),
  missing:document.getElementById('securityMissing'),
  informational:document.getElementById('securityInfo')
};
const filterButtons=[...document.querySelectorAll('[data-security-filter]')];
let lastData=null;
let activeFilter='all';

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cleanUrl=value=>{
  let v=value.trim();
  if(v&&!/^https?:\/\//i.test(v))v='https://'+v;
  return v;
};
const statusLabel=s=>({present:'Present',review:'Review',missing:'Missing',informational:'Informational'}[s]||s);
const statusIcon=s=>({present:'✓',review:'!',missing:'×',informational:'i'}[s]||'•');

function renderSummary(data){
  Object.entries(counters).forEach(([key,el])=>{el.textContent=String(data.summary?.[key]??0)});
}

function findingCard(item){
  return '<article class="security-finding" data-status="'+esc(item.status)+'">'+
    '<div class="security-finding-top"><span class="security-status '+esc(item.status)+'"><b>'+esc(statusIcon(item.status))+'</b>'+esc(statusLabel(item.status))+'</span>'+
    '<div><h3>'+esc(item.title)+'</h3><code>'+esc(item.header)+'</code></div></div>'+
    (item.value?'<div class="security-header-value"><span>Observed value</span><code>'+esc(item.value)+'</code></div>':'')+
    '<div class="security-finding-copy"><div><strong>Why it matters</strong><p>'+esc(item.why)+'</p></div><div><strong>What to do</strong><p>'+esc(item.fix)+'</p></div></div>'+
    (item.reference?'<a class="security-ref" href="'+esc(item.reference)+'" rel="noopener">Primary reference ↗</a>':'')+
  '</article>';
}

function applyFilter(filter){
  activeFilter=filter;
  filterButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.securityFilter===filter));
  [...findingsEl.querySelectorAll('.security-finding')].forEach(card=>{
    card.hidden=filter!=='all'&&card.dataset.status!==filter;
  });
  const visible=[...findingsEl.querySelectorAll('.security-finding')].filter(x=>!x.hidden).length;
  findingsEl.classList.toggle('is-empty',visible===0);
}

function renderFindings(data){
  findingsEl.innerHTML=(data.findings||[]).map(findingCard).join('')||'<div class="security-empty">No findings were returned.</div>';
  applyFilter(activeFilter);
}

function renderRaw(data){
  const rows=Object.entries(data.raw_headers||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  rawEl.innerHTML=rows.length?rows.map(([k,v])=>'<tr><th>'+esc(k)+'</th><td class="record-value">'+esc(v)+'</td></tr>').join(''):'<tr><td colspan="2">No response headers were returned.</td></tr>';
}

function renderRedirects(data){
  const chain=data.redirect_chain||[];
  redirectsWrap.hidden=chain.length<=1&&!data.redirect_loop;
  redirectsEl.innerHTML='<div class="security-chain">'+chain.map((hop,i)=>
    '<article><span>'+(i+1)+'</span><div><strong>'+esc(hop.status)+'</strong><code>'+esc(hop.url)+'</code>'+(hop.location?'<small>Location: '+esc(hop.location)+'</small>':'')+'</div><em>'+esc(hop.time_ms)+' ms</em></article>'
  ).join('')+(data.redirect_loop?'<p class="security-loop">A redirect loop was detected before a final stable response.</p>':'')+'</div>';
}

function renderMethodology(data){
  methodologyEl.innerHTML=(data.methodology||[]).map(x=>'<p>'+esc(x)+'</p>').join('');
}

function render(data){
  lastData=data;
  results.hidden=false;
  const host=(()=>{try{return new URL(data.final_url||data.requested_url).hostname}catch{return data.final_url||data.requested_url}})();
  titleEl.textContent='Security headers for '+host;
  metaEl.textContent='HTTP '+(data.status??'—')+' · '+(data.content_type||'content type unavailable')+' · '+(data.time_ms??'—')+' ms · '+(data.resolved_ip||'IP unavailable');
  renderSummary(data);
  renderFindings(data);
  renderRaw(data);
  renderRedirects(data);
  renderMethodology(data);
  results.scrollIntoView({behavior:'smooth',block:'start'});
}

form.addEventListener('submit',async e=>{
  e.preventDefault();
  errorEl.hidden=true;
  const url=cleanUrl(input.value);
  if(!url){errorEl.textContent='Enter a public HTTP or HTTPS URL.';errorEl.hidden=false;return}
  try{new URL(url)}catch{errorEl.textContent='Enter a valid public website URL.';errorEl.hidden=false;return}
  input.value=url;
  submitBtn.disabled=true;
  const old=submitBtn.textContent;
  submitBtn.textContent='Checking…';
  progress.hidden=false;
  try{
    const res=await fetch('/api/security-headers.php?url='+encodeURIComponent(url),{headers:{Accept:'application/json'},cache:'no-store'});
    const data=await res.json().catch(()=>({error:'Invalid response from the security header service.'}));
    if(!res.ok||data.error)throw new Error(data.error||'Security header check failed.');
    render(data);
    history.replaceState(null,'','?url='+encodeURIComponent(url));
  }catch(err){
    errorEl.textContent=err.message||'Security header check failed.';
    errorEl.hidden=false;
  }finally{
    progress.hidden=true;
    submitBtn.disabled=false;
    submitBtn.textContent=old;
  }
});

filterButtons.forEach(btn=>btn.addEventListener('click',()=>applyFilter(btn.dataset.securityFilter)));

copyBtn.addEventListener('click',async()=>{
  if(!lastData)return;
  const lines=[
    'Security Headers Checker',
    lastData.final_url||lastData.requested_url,
    'HTTP '+(lastData.status??'—')+' · '+(lastData.resolved_ip||''),
    '',
    'Summary: '+Object.entries(lastData.summary||{}).map(([k,v])=>statusLabel(k)+' '+v).join(' · '),
    '',
    ...(lastData.findings||[]).map(f=>'['+statusLabel(f.status)+'] '+f.title+'\n'+(f.value?'Value: '+f.value+'\n':'')+'Why: '+f.why+'\nAction: '+f.fix)
  ];
  try{
    await navigator.clipboard.writeText(lines.join('\n\n'));
    copyBtn.textContent='Copied';
    setTimeout(()=>copyBtn.textContent='Copy report',1400);
  }catch{}
});

const q=new URLSearchParams(location.search).get('url')||new URLSearchParams(location.search).get('target');
if(q){input.value=q;form.requestSubmit()}
})();