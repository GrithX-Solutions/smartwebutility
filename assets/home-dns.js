(() => {
  'use strict';

  const API='https://api.globalping.io/v1/measurements';
  const LOCATIONS=[
    {country:'US',label:'United States'},
    {country:'CA',label:'Canada'},
    {country:'BR',label:'Brazil'},
    {country:'GB',label:'United Kingdom'},
    {country:'DE',label:'Germany'},
    {country:'NL',label:'Netherlands'},
    {country:'ZA',label:'South Africa'},
    {country:'IN',label:'India'},
    {country:'SG',label:'Singapore'},
    {country:'JP',label:'Japan'},
    {country:'AU',label:'Australia'},
    {country:'AE',label:'United Arab Emirates'}
  ];
  const TYPES=new Set(['A','AAAA','CNAME','MX','NS','TXT','CAA','SOA','SRV']);

  const form=document.getElementById('homeDnsForm');
  const domainEl=document.getElementById('homeDnsDomain');
  const typeEl=document.getElementById('homeDnsType');
  const resultsEl=document.getElementById('homeDnsResults');
  const tbody=document.getElementById('homeDnsRows');
  const summaryEl=document.getElementById('homeDnsSummary');
  const headlineEl=document.getElementById('homeDnsResultTitle');
  const errorEl=document.getElementById('homeDnsError');
  const progressEl=document.getElementById('homeDnsProgress');
  const copyBtn=document.getElementById('homeDnsCopy');
  const shareBtn=document.getElementById('homeDnsShare');
  if(!form||!domainEl||!typeEl||!resultsEl||!tbody)return;

  let lastResults=[];

  const escapeHtml=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

  function flag(code){
    return code.toUpperCase().replace(/./g,ch=>String.fromCodePoint(127397+ch.charCodeAt()));
  }

  function cleanTarget(raw){
    let value=String(raw||'').trim();
    if(!value)return '';
    try{
      const url=/^[a-z][a-z0-9+.-]*:\/\//i.test(value)?new URL(value):new URL('https://'+value);
      value=url.hostname||value;
    }catch{
      value=value.split('/')[0];
    }
    return value.toLowerCase().replace(/\.$/,'');
  }

  function validTarget(value){
    if(!value||value.length>253)return false;
    if(/^[a-z0-9.-]+$/i.test(value)){
      return value.includes('.') && value.split('.').every(label=>label.length>0&&label.length<=63&&!label.startsWith('-')&&!label.endsWith('-'));
    }
    return /^(?:_[a-z0-9-]+\.)+(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i.test(value);
  }

  function answerValue(answer){
    const v=answer?.value;
    if(v===null||v===undefined)return '';
    return typeof v==='object'?JSON.stringify(v):String(v);
  }

  function answerSignature(item){
    const result=item?.result||{};
    const answers=Array.isArray(result.answers)?result.answers:[];
    if(!answers.length)return 'STATUS:'+String(result.statusCodeName||result.status||'UNKNOWN');
    return answers.map(a=>`${String(a.type||'').toUpperCase()}:${answerValue(a)}`).sort().join('|');
  }

  function locationLabel(probe){
    return [probe?.city,probe?.state,probe?.country].filter(Boolean).join(', ');
  }

  function renderAnswers(result){
    const answers=Array.isArray(result?.answers)?result.answers:[];
    if(!answers.length){
      const status=escapeHtml(result?.statusCodeName||'No answer');
      return `<span class="dns-answer-empty">${status}</span>`;
    }
    return `<div class="dns-answer-list">${answers.map(a=>`<code>${escapeHtml(answerValue(a))}</code>`).join('')}</div>`;
  }

  function render(data,target,type){
    const rows=Array.isArray(data?.results)?data.results:[];
    const successful=rows.filter(r=>r?.result?.status==='finished');
    const signatures=new Set(successful.map(answerSignature));
    const uniqueSets=signatures.size;
    const allSame=successful.length>0&&uniqueSets===1;
    const hasFailures=successful.length!==rows.length;

    headlineEl.textContent=`${type} results for ${target}`;

    const state=hasFailures?'Partial results':allSame?'Consistent across tested probes':'Different answers detected';
    summaryEl.innerHTML=`
      <div><span class="dns-summary-label">Result</span><strong>${escapeHtml(state)}</strong></div>
      <div><span class="dns-summary-label">Probes</span><strong>${rows.length}</strong></div>
      <div><span class="dns-summary-label">Successful</span><strong>${successful.length}</strong></div>
      <div><span class="dns-summary-label">Answer sets</span><strong>${uniqueSets||'—'}</strong></div>
    `;

    tbody.innerHTML=rows.map(item=>{
      const probe=item.probe||{};
      const result=item.result||{};
      const ttls=[...new Set((result.answers||[]).map(a=>a.ttl).filter(v=>Number.isFinite(v)))];
      const status=result.statusCodeName||result.status||'Unknown';
      const resolver=result.resolver==='private'?'Probe resolver':(result.resolver||'—');
      const network=[probe.network,probe.asn?`AS${probe.asn}`:null].filter(Boolean).join(' · ');
      const time=Number.isFinite(result?.timings?.total)?`${result.timings.total} ms`:'—';
      const loc=locationLabel(probe)||probe.country||'Unknown location';
      const statusClass=String(status).toUpperCase()==='NOERROR'?'ok':'warn';
      return `<tr>
        <td data-label="Location">
          <div class="dns-location"><span class="dns-flag" aria-hidden="true">${escapeHtml(flag(probe.country||''))}</span><span><strong>${escapeHtml(loc)}</strong><small>${escapeHtml(network||'Network unavailable')}</small></span></div>
        </td>
        <td data-label="DNS answer">${renderAnswers(result)}</td>
        <td data-label="Status"><span class="dns-status ${statusClass}">${escapeHtml(status)}</span></td>
        <td data-label="TTL" class="record-value">${escapeHtml(ttls.length?ttls.map(v=>v+'s').join(', '):'—')}</td>
        <td data-label="Resolver" class="record-value">${escapeHtml(resolver)}</td>
        <td data-label="Query time" class="record-value">${escapeHtml(time)}</td>
      </tr>`;
    }).join('');

    lastResults=rows;
    resultsEl.hidden=false;
    progressEl.hidden=true;
    document.body.classList.add('dns-results-active');
    if(window.matchMedia('(max-width: 760px)').matches){
      requestAnimationFrame(()=>resultsEl.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  }

  async function createMeasurement(target,type){
    const response=await fetch(API,{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({
        target,
        type:'dns',
        locations:LOCATIONS.map(({country})=>({country})),
        measurementOptions:{query:{type}}
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const msg=data?.message||data?.error?.message||`Global DNS service returned HTTP ${response.status}`;
      const error=new Error(msg);
      error.status=response.status;
      throw error;
    }
    if(!data.id)throw new Error('Global DNS service did not return a measurement ID.');
    return data.id;
  }

  async function getMeasurement(id){
    for(let attempt=0;attempt<12;attempt++){
      if(attempt>0)await sleep(Math.min(700+attempt*180,1800));
      const response=await fetch(`${API}/${encodeURIComponent(id)}`,{headers:{accept:'application/json'}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.message||`Result request returned HTTP ${response.status}`);
      if(data.status&&data.status!=='in-progress')return data;
      progressEl.textContent=`Waiting for live probe results… ${Math.min(attempt+1,12)}/12`;
    }
    throw new Error('The distributed lookup is taking longer than expected. Please try again.');
  }

  function setError(message,rateLimited=false){
    errorEl.innerHTML=`${escapeHtml(message)}${rateLimited?' <a href="/dns-checker/">Use the single-resolver DNS Checker instead.</a>':''}`;
    errorEl.hidden=false;
  }

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    const target=cleanTarget(domainEl.value);
    const type=String(typeEl.value||'A').toUpperCase();
    domainEl.value=target;
    errorEl.hidden=true;
    resultsEl.hidden=true;
    lastResults=[];

    if(!validTarget(target)){
      setError('Enter a valid public domain or hostname, such as example.com.');
      domainEl.focus();
      return;
    }
    if(!TYPES.has(type)){
      setError('Choose a supported DNS record type.');
      return;
    }

    const button=form.querySelector('button[type="submit"]');
    const old=button.textContent;
    button.disabled=true;
    button.textContent='Checking 12 locations…';
    progressEl.hidden=false;
    progressEl.textContent='Starting distributed DNS lookup…';

    try{
      const id=await createMeasurement(target,type);
      progressEl.textContent='Live probes are checking DNS…';
      const data=await getMeasurement(id);
      render(data,target,type);
      const url=new URL(location.href);
      url.searchParams.set('domain',target);
      url.searchParams.set('type',type);
      history.replaceState(null,'',url.pathname+url.search);
    }catch(error){
      progressEl.hidden=true;
      const limited=error?.status===429||/limit|allowance|rate/i.test(error?.message||'');
      setError(limited?'The free global probe allowance for this network is temporarily exhausted.':`Global DNS lookup failed: ${error.message||'Unknown error'}.`,limited);
    }finally{
      button.disabled=false;
      button.textContent=old;
    }
  });

  document.querySelectorAll('[data-home-dns-type]').forEach(button=>{
    button.addEventListener('click',()=>{
      typeEl.value=button.dataset.homeDnsType;
      document.querySelectorAll('[data-home-dns-type]').forEach(x=>x.classList.toggle('active',x===button));
      if(domainEl.value.trim())form.requestSubmit();
    });
  });

  copyBtn?.addEventListener('click',async()=>{
    if(!lastResults.length)return;
    const lines=['Location\tNetwork\tAnswer\tStatus\tTTL\tResolver\tTime'];
    lastResults.forEach(item=>{
      const p=item.probe||{},r=item.result||{};
      const answers=(r.answers||[]).map(answerValue).join(' | ')||'—';
      const ttl=[...new Set((r.answers||[]).map(a=>a.ttl).filter(v=>Number.isFinite(v)))].join(', ')||'—';
      lines.push([
        locationLabel(p)||p.country||'Unknown',
        [p.network,p.asn?`AS${p.asn}`:null].filter(Boolean).join(' '),
        answers,
        r.statusCodeName||r.status||'Unknown',
        ttl,
        r.resolver||'—',
        Number.isFinite(r?.timings?.total)?r.timings.total+' ms':'—'
      ].join('\t'));
    });
    try{
      await navigator.clipboard.writeText(lines.join('\n'));
      copyBtn.textContent='Copied';
      setTimeout(()=>copyBtn.textContent='Copy results',1400);
    }catch{
      copyBtn.textContent='Select & copy';
    }
  });

  shareBtn?.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(location.href);
      shareBtn.textContent='Link copied';
      setTimeout(()=>shareBtn.textContent='Copy link',1400);
    }catch{
      shareBtn.textContent='Copy from address bar';
    }
  });

  const params=new URLSearchParams(location.search);
  if(params.get('domain')){
    domainEl.value=params.get('domain');
    const t=String(params.get('type')||'A').toUpperCase();
    if(TYPES.has(t))typeEl.value=t;
    document.querySelectorAll('[data-home-dns-type]').forEach(x=>x.classList.toggle('active',x.dataset.homeDnsType===typeEl.value));
    form.requestSubmit();
  }
})();