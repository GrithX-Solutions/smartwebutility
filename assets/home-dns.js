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
  const rowsEl=document.getElementById('homeDnsRows');
  const summaryEl=document.getElementById('homeDnsSummary');
  const errorEl=document.getElementById('homeDnsError');
  const progressEl=document.getElementById('homeDnsProgress');
  if(!form||!domainEl||!typeEl||!resultsEl||!rowsEl)return;

  let lastResults=[];

  const escapeHtml=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

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
      return value.includes('.')&&value.split('.').every(label=>label.length>0&&label.length<=63&&!label.startsWith('-')&&!label.endsWith('-'));
    }
    return /^(?:_[a-z0-9-]+\.)+(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i.test(value);
  }

  function answerValue(answer){
    const value=answer?.value;
    if(value===null||value===undefined)return '';
    return typeof value==='object'?JSON.stringify(value):String(value);
  }

  function answerSignature(item){
    const result=item?.result||{};
    const answers=Array.isArray(result.answers)?result.answers:[];
    if(!answers.length)return 'STATUS:'+String(result.statusCodeName||result.status||'UNKNOWN');
    return answers.map(a=>`${String(a.type||'').toUpperCase()}:${answerValue(a)}`).sort().join('|');
  }

  function answerHtml(result){
    const answers=Array.isArray(result?.answers)?result.answers:[];
    if(!answers.length){
      return `<span class="dns-static-empty">${escapeHtml(result?.statusCodeName||'No result')}</span>`;
    }
    return `<span class="dns-static-values">${answers.map(a=>`<code>${escapeHtml(answerValue(a))}</code>`).join('')}</span>`;
  }

  function setRowsLoading(){
    LOCATIONS.forEach(({country})=>{
      const answer=document.querySelector(`[data-answer-country="${country}"]`);
      const network=document.querySelector(`[data-network-country="${country}"]`);
      if(answer){
        answer.classList.add('is-loading');
        answer.innerHTML='<span class="dns-static-checking">Checking…</span>';
      }
      if(network)network.textContent='Contacting live probe…';
    });
    if(summaryEl){
      summaryEl.hidden=true;
      summaryEl.textContent='';
    }
  }

  function setRowsError(){
    LOCATIONS.forEach(({country})=>{
      const answer=document.querySelector(`[data-answer-country="${country}"]`);
      const network=document.querySelector(`[data-network-country="${country}"]`);
      if(answer){
        answer.classList.remove('is-loading');
        answer.innerHTML='<span class="dns-static-empty">Unavailable</span>';
      }
      if(network)network.textContent='Live probe';
    });
  }

  function render(data,target,type){
    const results=Array.isArray(data?.results)?data.results:[];
    const byCountry=new Map();
    results.forEach(item=>{
      const code=String(item?.probe?.country||'').toUpperCase();
      if(code&&!byCountry.has(code))byCountry.set(code,item);
    });

    LOCATIONS.forEach(({country})=>{
      const item=byCountry.get(country);
      const answer=document.querySelector(`[data-answer-country="${country}"]`);
      const network=document.querySelector(`[data-network-country="${country}"]`);
      if(!answer)return;

      answer.classList.remove('is-loading');
      if(!item){
        answer.innerHTML='<span class="dns-static-empty">No probe result</span>';
        if(network)network.textContent='Probe unavailable';
        return;
      }

      const probe=item.probe||{};
      const result=item.result||{};
      answer.innerHTML=answerHtml(result);

      if(network){
        const place=[probe.city,probe.state].filter(Boolean).join(', ');
        const provider=[probe.network,probe.asn?`AS${probe.asn}`:null].filter(Boolean).join(' · ');
        network.textContent=[place,provider].filter(Boolean).join(' · ')||'Live probe';
      }
    });

    const successful=results.filter(item=>item?.result?.status==='finished');
    const uniqueSets=new Set(successful.map(answerSignature)).size;
    if(summaryEl){
      summaryEl.hidden=false;
      summaryEl.textContent=`${type} lookup for ${target} · ${successful.length}/${LOCATIONS.length} probes returned · ${uniqueSets||0} answer set${uniqueSets===1?'':'s'}`;
    }

    lastResults=results;
    progressEl.hidden=true;
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
      const message=data?.message||data?.error?.message||`Global DNS service returned HTTP ${response.status}`;
      const error=new Error(message);
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
    button.textContent='Checking…';
    progressEl.hidden=false;
    progressEl.textContent='Starting distributed DNS lookup…';
    setRowsLoading();

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
      setRowsError();
      const limited=error?.status===429||/limit|allowance|rate/i.test(error?.message||'');
      setError(
        limited
          ? 'The free global probe allowance for this network is temporarily exhausted.'
          : `Global DNS lookup failed: ${error.message||'Unknown error'}.`,
        limited
      );
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

  const params=new URLSearchParams(location.search);
  if(params.get('domain')){
    domainEl.value=params.get('domain');
    const type=String(params.get('type')||'A').toUpperCase();
    if(TYPES.has(type))typeEl.value=type;
    document.querySelectorAll('[data-home-dns-type]').forEach(x=>x.classList.toggle('active',x.dataset.homeDnsType===typeEl.value));
    form.requestSubmit();
  }
})();