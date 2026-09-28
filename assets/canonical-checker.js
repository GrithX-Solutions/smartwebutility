(()=>{
'use strict';
const form=document.getElementById('canonicalForm'); if(!form)return;
const input=document.getElementById('canonicalUrl');
const results=document.getElementById('canonicalResults');
const progress=document.getElementById('canonicalProgress');
const errorEl=document.getElementById('canonicalError');
const titleEl=document.getElementById('canonicalTitle');
const metaEl=document.getElementById('canonicalMeta');
const annotationsEl=document.getElementById('canonicalAnnotations');
const findingsEl=document.getElementById('canonicalFindings');
const evidenceEl=document.getElementById('canonicalEvidence');
const redirectsEl=document.getElementById('canonicalRedirects');
const methodologyEl=document.getElementById('canonicalMethodology');
const copyBtn=document.getElementById('canonicalCopy');
const submitBtn=form.querySelector('button[type="submit"]');
const counters={
  present:document.getElementById('canonicalPresent'),
  review:document.getElementById('canonicalReview'),
  informational:document.getElementById('canonicalInfo')
};
let lastData=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cleanUrl=v=>{v=v.trim();if(v&&!/^https?:\/\//i.test(v))v='https://'+v;return v};
const statusLabel=s=>({present:'Present',review:'Review',informational:'Informational'}[s]||s);
const statusIcon=s=>({present:'✓',review:'!',informational:'i'}[s]||'•');
const sourceLabel=s=>({html_head:'HTML <head>',html_body:'HTML body',http_header:'HTTP Link header'}[s]||s);

function renderSummary(data){
  Object.entries(counters).forEach(([k,el])=>el.textContent=String(data.summary?.[k]??0));
}

function renderAnnotations(data){
  const list=data.canonical_annotations||[];
  if(!list.length){
    annotationsEl.innerHTML='<div class="canonical-empty">No canonical annotation was found in the fetched HTML or HTTP Link header.</div>';
    return;
  }
  annotationsEl.innerHTML='<div class="canonical-annotation-list">'+list.map((c,i)=>
    '<article><div class="canonical-annotation-top"><span>'+esc(sourceLabel(c.source))+'</span><b>#'+(i+1)+'</b></div>'+
    '<code>'+esc(c.raw)+'</code>'+
    (c.raw!==c.resolved?'<small>Resolved: '+esc(c.resolved)+'</small>':'')+
    '<div class="canonical-chips">'+
      '<em class="'+(c.absolute?'good':'review')+'">'+(c.absolute?'Absolute URL':'Relative URL')+'</em>'+
      (c.has_fragment?'<em class="review">Contains fragment</em>':'')+
    '</div></article>'
  ).join('')+'</div>';
}

function renderFindings(data){
  const list=data.findings||[];
  findingsEl.innerHTML=list.length?list.map(f=>
    '<article class="canonical-finding '+esc(f.status)+'">'+
      '<div class="canonical-finding-head"><span class="canonical-status '+esc(f.status)+'"><b>'+esc(statusIcon(f.status))+'</b>'+esc(statusLabel(f.status))+'</span><h3>'+esc(f.title)+'</h3></div>'+
      '<div class="canonical-finding-copy"><div><strong>Why it matters</strong><p>'+esc(f.why)+'</p></div><div><strong>What to do</strong><p>'+esc(f.fix)+'</p></div></div>'+
      (f.evidence?'<details><summary>Evidence</summary><pre>'+esc(JSON.stringify(f.evidence,null,2))+'</pre></details>':'')+
    '</article>'
  ).join(''):'<div class="canonical-empty">No findings were returned.</div>';
}

const row=(k,v)=>'<tr><th>'+esc(k)+'</th><td class="record-value">'+esc(v??'—')+'</td></tr>';

function renderEvidence(data){
  const s=data.source||{}, t=data.target;
  let html='<div class="canonical-evidence-grid"><article><span class="kicker">Source page</span><table class="record-table"><tbody>'+
    row('Requested URL',s.requested_url)+row('Final URL',s.final_url)+row('HTTP status',s.status)+row('Title',s.title)+row('Meta robots',s.meta_robots)+row('X-Robots-Tag',s.x_robots_tag)+row('Noindex',s.noindex?'Yes':'No')+
    '</tbody></table></article>';
  html+='<article><span class="kicker">Canonical target</span>';
  if(t){
    html+='<table class="record-table"><tbody>'+
      row('Declared target',t.requested_url)+row('Final target',t.final_url)+row('HTTP status',t.status)+row('Redirected',t.redirected?'Yes':'No')+row('Meta robots',t.meta_robots)+row('X-Robots-Tag',t.x_robots_tag)+row('Noindex',t.noindex===true?'Yes':t.noindex===false?'No':'—')+
      '</tbody></table>';
  }else{
    html+='<div class="canonical-empty">No canonical target was available to verify.</div>';
  }
  html+='</article></div>';
  evidenceEl.innerHTML=html;
}

function chainBlock(title,chain){
  if(!chain||!chain.length)return '';
  return '<section><h3>'+esc(title)+'</h3><div class="canonical-chain">'+chain.map((hop,i)=>
    '<article><span>'+(i+1)+'</span><div><strong>HTTP '+esc(hop.status)+'</strong><code>'+esc(hop.url)+'</code>'+(hop.location?'<small>Location: '+esc(hop.location)+'</small>':'')+'</div></article>'
  ).join('')+'</div></section>';
}

function renderRedirects(data){
  const sourceChain=data.source?.redirect_chain||[];
  const targetChain=data.target?.redirect_chain||[];
  redirectsEl.innerHTML=chainBlock('Source request',sourceChain)+chainBlock('Canonical target',targetChain)||
    '<div class="canonical-empty">No redirect data available.</div>';
}

function renderMethodology(data){
  methodologyEl.innerHTML=(data.methodology||[]).map(x=>'<p>'+esc(x)+'</p>').join('');
}

function render(data){
  lastData=data;
  results.hidden=false;
  const source=data.source||{};
  const host=(()=>{try{return new URL(source.final_url||source.requested_url).hostname}catch{return source.final_url||source.requested_url}})();
  titleEl.textContent='Canonical analysis for '+host;
  metaEl.textContent='HTTP '+(source.status??'—')+' · '+(data.preferred_canonical?'Declared canonical found':'No canonical declared');
  renderSummary(data);
  renderAnnotations(data);
  renderFindings(data);
  renderEvidence(data);
  renderRedirects(data);
  renderMethodology(data);
  results.scrollIntoView({behavior:'smooth',block:'start'});
}

form.addEventListener('submit',async e=>{
  e.preventDefault();
  errorEl.hidden=true;
  results.hidden=true;
  const url=cleanUrl(input.value);
  if(!url){errorEl.textContent='Enter a public HTTP or HTTPS URL.';errorEl.hidden=false;return}
  try{new URL(url)}catch{errorEl.textContent='Enter a valid public website URL.';errorEl.hidden=false;return}
  input.value=url;
  submitBtn.disabled=true;
  const old=submitBtn.textContent;
  submitBtn.textContent='Checking…';
  progress.hidden=false;
  try{
    const res=await fetch('/api/canonical-check.php?url='+encodeURIComponent(url),{headers:{Accept:'application/json'},cache:'no-store'});
    const data=await res.json().catch(()=>({error:'Invalid response from canonical checker.'}));
    if(!res.ok||data.error)throw new Error(data.error||'Canonical check failed.');
    render(data);
    history.replaceState(null,'','?url='+encodeURIComponent(url));
  }catch(err){
    errorEl.textContent=err.message||'Canonical check failed.';
    errorEl.hidden=false;
  }finally{
    progress.hidden=true;
    submitBtn.disabled=false;
    submitBtn.textContent=old;
  }
});

copyBtn.addEventListener('click',async()=>{
  if(!lastData)return;
  const s=lastData.source||{};
  const lines=[
    'Canonical Tag Checker',
    s.final_url||s.requested_url||'',
    'Declared canonical: '+(lastData.preferred_canonical||'None'),
    '',
    'Summary: '+Object.entries(lastData.summary||{}).map(([k,v])=>statusLabel(k)+' '+v).join(' · '),
    '',
    ...(lastData.findings||[]).map(f=>'['+statusLabel(f.status)+'] '+f.title+'\nWhy: '+f.why+'\nAction: '+f.fix)
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