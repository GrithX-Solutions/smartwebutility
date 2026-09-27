(()=>{
  const form=document.getElementById('speedForm');
  const input=document.getElementById('speedUrl');
  const results=document.getElementById('speedResults');
  const live=document.getElementById('speedProgress');
  const errorEl=document.getElementById('speedError');
  const liveBadge=document.getElementById('speedLiveBadge');
  const liveTitle=document.getElementById('speedLiveTitle');
  const liveMessage=document.getElementById('speedLiveMessage');
  const liveElapsed=document.getElementById('speedElapsed');
  const liveBar=document.getElementById('speedProgressBar');
  const titleEl=document.getElementById('speedReportTitle');
  const metaEl=document.getElementById('speedMeta');
  const scoresEl=document.getElementById('speedScores');
  const fieldEl=document.getElementById('speedField');
  const fieldSummary=document.getElementById('fieldSummary');
  const labEl=document.getElementById('speedLab');
  const oppEl=document.getElementById('speedOpportunities');
  const diagEl=document.getElementById('speedDiagnostics');
  const resourcesEl=document.getElementById('speedResources');
  const passedEl=document.getElementById('speedPassed');
  const notesEl=document.getElementById('speedNotes');
  const copyBtn=document.getElementById('speedCopy');
  const submitBtn=form?.querySelector('button[type="submit"]');
  const tabs=[...document.querySelectorAll('[data-strategy]')];
  const steps=[...document.querySelectorAll('.speed-step')];

  const state={
    url:'',
    strategy:'mobile',
    cache:{},
    jobs:{},
    jobStatus:{},
    started:{},
    polling:{}
  };

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cleanUrl=value=>{
    let v=value.trim();
    if(v && !/^https?:\/\//i.test(v)) v='https://'+v;
    return v;
  };
  const tone=score=>score==null?'na':score>=90?'good':score>=50?'average':'poor';
  const fieldTone=category=>category==='FAST'?'good':category==='AVERAGE'?'average':category==='SLOW'?'poor':'na';
  const bytes=n=>{
    if(n==null || !Number.isFinite(Number(n))) return '—';
    const v=Number(n);
    if(v<1024) return Math.round(v)+' B';
    if(v<1048576) return (v/1024).toFixed(1)+' KB';
    return (v/1048576).toFixed(2)+' MB';
  };
  const metricValue=m=>{
    if(m.unit==='score') return Number(m.value).toFixed(3);
    const v=Number(m.value);
    return v>=1000?(v/1000).toFixed(2)+' s':Math.round(v)+' ms';
  };
  const categoryLabel=k=>({performance:'Performance',accessibility:'Accessibility',best_practices:'Best Practices',seo:'SEO'}[k]||k);
  const stageOrder={queued:1,preparing:2,measuring:3,processing:4,complete:5,failed:5,expired:5};

  function setStrategy(strategy){
    state.strategy=strategy;
    tabs.forEach(btn=>{
      const active=btn.dataset.strategy===strategy;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',String(active));
      const status=state.jobStatus[btn.dataset.strategy];
      btn.classList.toggle('is-running',!!status && !['complete','failed'].includes(status.state));
    });
  }

  function skeletonCards(count=4){
    return Array.from({length:count},()=>'<article class="speed-skeleton-card"><span></span><strong></strong><i></i></article>').join('');
  }

  function prepareShell(strategy){
    results.hidden=false;
    const host=(()=>{try{return new URL(state.url).hostname}catch{return state.url}})();
    titleEl.textContent='Speed test for '+host;
    metaEl.textContent=(strategy==='mobile'?'Mobile':'Desktop')+' · live analysis in progress';
    scoresEl.innerHTML=skeletonCards(4);
    labEl.innerHTML=skeletonCards(6);
    fieldSummary.textContent='Real-user field data is separate from the local lab run.';
    fieldEl.innerHTML='<div class="speed-empty speed-pending"><strong>Field data check</strong><p>The lab audit runs immediately. Real-user CrUX data appears only when a provider source is configured.</p></div>';
    oppEl.innerHTML='<div class="speed-empty speed-pending"><strong>Optimization opportunities</strong><p>Will appear after Lighthouse finishes evaluating the trace.</p></div>';
    diagEl.innerHTML='<div class="speed-empty speed-pending"><strong>Diagnostics</strong><p>Technical findings will fill in without reloading the page.</p></div>';
    resourcesEl.innerHTML='<tr><td colspan="3">Resource summary will appear when measurement completes.</td></tr>';
    passedEl.innerHTML='<span class="speed-pass muted">Passed audits will appear here.</span>';
    notesEl.innerHTML='<p>The heavy browser audit runs in a single isolated worker; this page receives small status updates while it runs.</p>';
  }

  function updateLive(info,strategy=state.strategy){
    state.jobStatus[strategy]=info;
    if(strategy!==state.strategy) { setStrategy(state.strategy); return; }

    live.hidden=false;
    const stage=info.stage||info.state||'queued';
    const current=stageOrder[stage]||1;
    const label=stage==='preparing'?'Preparing':stage==='measuring'?'Measuring':stage==='processing'?'Processing':stage==='complete'?'Complete':stage==='failed'?'Failed':'Queued';
    liveBadge.textContent=label;
    liveBadge.className='speed-live-badge '+(stage==='complete'?'good':stage==='failed'?'poor':'active');
    liveTitle.textContent=(strategy==='mobile'?'Mobile':'Desktop')+' performance test';
    liveMessage.textContent=info.message||'Performance test is running.';
    liveBar.style.width=Math.max(6,Math.min(100,Number(info.progress)||8))+'%';

    steps.forEach((el,index)=>{
      const n=index+1;
      el.classList.toggle('done',n<current || stage==='complete');
      el.classList.toggle('active',n===current && !['complete','failed'].includes(stage));
      el.classList.toggle('failed',stage==='failed' && n===5);
    });
    setStrategy(strategy);
  }

  function renderScores(data){
    scoresEl.innerHTML=Object.entries(data.categories||{}).map(([key,score])=>
      '<article class="speed-score-card '+tone(score)+'"><div class="speed-score-main"><div class="speed-score-ring" style="--score:'+(score??0)+'%"><strong>'+esc(score??'—')+'</strong></div><div><h3>'+esc(categoryLabel(key))+'</h3><span>'+esc(score==null?'No score':score>=90?'Good':score>=50?'Needs work':'Poor')+'</span></div></div></article>'
    ).join('');
  }

  function renderField(data){
    const field=data.field||data.origin_field;
    if(!field){
      fieldSummary.textContent='No real-user field dataset is attached to this local Lighthouse report.';
      fieldEl.innerHTML='<div class="speed-empty"><strong>Lab report ready; field data unavailable</strong><p>Core Web Vitals field data requires a CrUX/PageSpeed provider source. This does not affect the synthetic Lighthouse measurements below.</p></div>';
      return;
    }
    const fallback=!data.field && !!data.origin_field;
    const assessment=field.assessment==='passed'?'Core Web Vitals passed':field.assessment==='needs-improvement'?'Core Web Vitals need improvement':'Not enough Core Web Vitals data';
    const period=field.collection_period;
    const fmtDate=d=>d&&d.year?d.year+'-'+String(d.month).padStart(2,'0')+'-'+String(d.day).padStart(2,'0'):'';
    const periodText=period&&period.firstDate&&period.lastDate?' · '+fmtDate(period.firstDate)+' to '+fmtDate(period.lastDate):'';
    const sourceText=field.source?' · '+field.source:'';
    fieldSummary.textContent=(fallback?'Origin-level field data · ':'URL-level field data · ')+assessment+sourceText+periodText;
    fieldEl.innerHTML='<div class="speed-field-head '+(field.assessment==='passed'?'good':field.assessment==='needs-improvement'?'average':'na')+'"><strong>'+esc(assessment)+'</strong><span>75th-percentile experience'+(fallback?' · origin fallback':'')+'</span></div>'+
      '<div class="speed-metric-grid">'+(field.metrics||[]).map(m=>
        '<article class="speed-metric '+fieldTone(m.category)+'"><span>'+esc(m.label)+'</span><strong>'+esc(metricValue(m))+'</strong><small>'+esc(m.category==='FAST'?'Good':m.category==='AVERAGE'?'Needs improvement':m.category==='SLOW'?'Poor':'No category')+'</small></article>'
      ).join('')+'</div>';
  }

  function renderLab(data){
    labEl.innerHTML=(data.lab||[]).map(m=>
      '<article class="speed-metric '+tone(m.score)+'"><span>'+esc(m.label)+'</span><strong>'+esc(m.display||'—')+'</strong><small>'+(m.score==null?'Diagnostic metric':esc(m.score)+' / 100 audit score')+'</small></article>'
    ).join('') || '<div class="speed-empty">No lab metrics returned.</div>';
  }

  function auditCard(item){
    const savings=[];
    if(Number(item.savings_ms)>0) savings.push('up to '+(Number(item.savings_ms)/1000).toFixed(2)+' s');
    if(Number(item.savings_bytes)>0) savings.push(bytes(Number(item.savings_bytes)));
    return '<article class="speed-audit-item"><div class="speed-audit-top"><h3>'+esc(item.title)+'</h3>'+(item.display?'<span>'+esc(item.display)+'</span>':'')+'</div>'+
      (savings.length?'<div class="speed-saving">Estimated savings: '+esc(savings.join(' · '))+'</div>':'')+
      '<p>'+esc(item.description||'Review this Lighthouse diagnostic and the affected resources in your implementation.')+'</p></article>';
  }

  function renderAudits(data){
    oppEl.innerHTML=(data.opportunities||[]).map(auditCard).join('') || '<div class="speed-empty"><strong>No major load opportunities were returned.</strong><p>Review diagnostics and compare repeated tests after meaningful site changes.</p></div>';
    diagEl.innerHTML=(data.diagnostics||[]).map(auditCard).join('') || '<div class="speed-empty">No additional performance diagnostics were returned.</div>';
  }

  function renderResources(data){
    const rows=(data.resources||[]).filter(r=>r.type!=='total');
    resourcesEl.innerHTML=rows.map(r=>'<tr><td>'+esc(r.label||r.type)+'</td><td>'+esc(r.requests??'—')+'</td><td>'+esc(bytes(r.transfer_bytes))+'</td></tr>').join('') || '<tr><td colspan="3">No resource summary returned.</td></tr>';
  }

  function renderPassed(data){
    passedEl.innerHTML=(data.passed||[]).map(p=>'<span class="speed-pass">✓ '+esc(p.title)+'</span>').join('') || '<p>No passed-audit list returned.</p>';
  }

  function renderComplete(data,strategy){
    state.cache[strategy]=data;
    if(strategy!==state.strategy) return;

    const host=(()=>{try{return new URL(data.final_url||data.url).hostname}catch{return data.final_url||data.url}})();
    titleEl.textContent='Speed test for '+host;
    metaEl.textContent=(data.strategy==='mobile'?'Mobile':'Desktop')+' · '+(data.lighthouse_version?'Lighthouse '+data.lighthouse_version+' · ':'')+(data.fetch_time?new Date(data.fetch_time).toLocaleString():'Fresh analysis')+(data.cache?.status==='fresh'?' · cached':'');
    renderScores(data);
    requestAnimationFrame(()=>renderLab(data));
    setTimeout(()=>renderField(data),40);
    setTimeout(()=>renderAudits(data),80);
    setTimeout(()=>renderResources(data),120);
    setTimeout(()=>renderPassed(data),150);
    setTimeout(()=>{
      notesEl.innerHTML=(data.notes||[]).map(n=>'<p>'+esc(n)+'</p>').join('')+'<p><strong>Provider:</strong> '+esc(data.provider||'Lighthouse')+'</p>';
    },170);
  }

  async function pollJob(strategy,jobId){
    if(state.polling[strategy]) return;
    state.polling[strategy]=true;
    try{
      while(state.jobs[strategy]===jobId){
        const res=await fetch('/api/page-speed-job.php?action=status&job='+encodeURIComponent(jobId),{headers:{Accept:'application/json'},cache:'no-store'});
        const data=await res.json().catch(()=>({state:'failed',error:'Invalid status response.'}));
        if(data.state==='complete' && data.result){
          state.jobs[strategy]=null;
          updateLive(data,strategy);
          renderComplete(data.result,strategy);
          break;
        }
        if(data.state==='failed' || !res.ok){
          state.jobs[strategy]=null;
          updateLive({state:'failed',stage:'failed',progress:100,message:data.error||'Performance test failed.'},strategy);
          if(strategy===state.strategy){
            errorEl.textContent=data.error||'Performance test could not be completed.';
            errorEl.hidden=false;
          }
          break;
        }
        updateLive(data,strategy);
        await new Promise(r=>setTimeout(r,1100));
      }
    }catch(err){
      state.jobs[strategy]=null;
      if(strategy===state.strategy){
        errorEl.textContent=err.message||'Live performance status could not be read.';
        errorEl.hidden=false;
      }
    }finally{
      state.polling[strategy]=false;
      if(submitBtn) submitBtn.disabled=false;
    }
  }

  async function run(strategy){
    if(!state.url) return;
    setStrategy(strategy);
    errorEl.hidden=true;

    if(state.cache[strategy]){
      updateLive({state:'complete',stage:'complete',progress:100,message:'Report ready.'},strategy);
      renderComplete(state.cache[strategy],strategy);
      return;
    }

    if(state.jobs[strategy]){
      prepareShell(strategy);
      updateLive(state.jobStatus[strategy]||{state:'queued',stage:'queued',progress:8,message:'Test is queued.'},strategy);
      return;
    }

    prepareShell(strategy);
    state.started[strategy]=Date.now();
    updateLive({state:'queued',stage:'queued',progress:5,message:'Sending the test to the isolated performance queue.'},strategy);
    if(submitBtn) submitBtn.disabled=true;

    try{
      const res=await fetch('/api/page-speed-job.php?action=start&url='+encodeURIComponent(state.url)+'&strategy='+strategy,{headers:{Accept:'application/json'},cache:'no-store'});
      const data=await res.json().catch(()=>({error:'Invalid response from the performance queue.'}));
      if(data.state==='complete' && data.result){
        updateLive(data,strategy);
        renderComplete(data.result,strategy);
        if(submitBtn) submitBtn.disabled=false;
        return;
      }
      if(!res.ok || !data.job_id) throw new Error(data.error||'Speed test could not be queued.');
      state.jobs[strategy]=data.job_id;
      updateLive(data,strategy);
      pollJob(strategy,data.job_id);
    }catch(err){
      updateLive({state:'failed',stage:'failed',progress:100,message:err.message||'Could not start the speed test.'},strategy);
      errorEl.textContent=err.message||'Speed test could not be started.';
      errorEl.hidden=false;
      if(submitBtn) submitBtn.disabled=false;
    }
  }

  form.addEventListener('submit',e=>{
    e.preventDefault();
    const url=cleanUrl(input.value);
    if(!url){ errorEl.textContent='Enter a public website URL.'; errorEl.hidden=false; return; }
    try{ new URL(url); }catch{ errorEl.textContent='Enter a valid website URL.'; errorEl.hidden=false; return; }
    input.value=url;
    state.url=url;
    state.cache={};
    state.jobs={};
    state.jobStatus={};
    state.started={};
    run('mobile');
  });

  tabs.forEach(btn=>btn.addEventListener('click',()=>{
    const strategy=btn.dataset.strategy;
    setStrategy(strategy);
    if(state.cache[strategy]){
      updateLive({state:'complete',stage:'complete',progress:100,message:'Report ready.'},strategy);
      renderComplete(state.cache[strategy],strategy);
    }else{
      run(strategy);
    }
  }));

  setInterval(()=>{
    const started=state.started[state.strategy];
    if(!started || !liveElapsed || live.hidden) return;
    if(state.cache[state.strategy]){ liveElapsed.textContent='Done'; return; }
    liveElapsed.textContent=Math.max(0,Math.floor((Date.now()-started)/1000))+'s';
  },1000);

  copyBtn.addEventListener('click',async()=>{
    const data=state.cache[state.strategy];
    if(!data) return;
    const lines=[
      'Website Speed Test — '+data.strategy.toUpperCase(),
      data.final_url||data.url,'',
      ...Object.entries(data.categories||{}).map(([k,v])=>categoryLabel(k)+': '+(v??'—')+'/100'),
      '','Lab metrics:',
      ...(data.lab||[]).map(m=>m.label+': '+(m.display||'—')),
      '','Top opportunities:',
      ...(data.opportunities||[]).slice(0,6).map(o=>'- '+o.title+(o.display?' — '+o.display:''))
    ];
    try{
      await navigator.clipboard.writeText(lines.join('\n'));
      copyBtn.textContent='Copied';
      setTimeout(()=>copyBtn.textContent='Copy report',1500);
    }catch{}
  });

  const q=new URLSearchParams(location.search).get('url');
  if(q){
    input.value=q;
    state.url=cleanUrl(q);
    run('mobile');
  }
})();