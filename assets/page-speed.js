(()=>{
  const form=document.getElementById('speedForm');
  const input=document.getElementById('speedUrl');
  const results=document.getElementById('speedResults');
  const progress=document.getElementById('speedProgress');
  const errorEl=document.getElementById('speedError');
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
  const tabs=[...document.querySelectorAll('[data-strategy]')];
  const state={url:'',strategy:'mobile',cache:{}};

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
    const v=Number(n); if(v<1024) return Math.round(v)+' B';
    if(v<1048576) return (v/1024).toFixed(1)+' KB';
    return (v/1048576).toFixed(2)+' MB';
  };
  const metricValue=m=>{
    if(m.unit==='score') return Number(m.value).toFixed(3);
    const v=Number(m.value);
    return v>=1000?(v/1000).toFixed(2)+' s':Math.round(v)+' ms';
  };
  const categoryLabel=k=>({performance:'Performance',accessibility:'Accessibility',best_practices:'Best Practices',seo:'SEO'}[k]||k);

  function setStrategy(strategy){
    state.strategy=strategy;
    tabs.forEach(btn=>{
      const active=btn.dataset.strategy===strategy;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',String(active));
    });
  }

  function renderScores(data){
    scoresEl.innerHTML=Object.entries(data.categories||{}).map(([key,score])=>
      '<article class="speed-score-card '+tone(score)+'"><div class="speed-score-ring" style="--score:'+(score??0)+'"><strong>'+esc(score??'—')+'</strong><span>/ 100</span></div><h3>'+esc(categoryLabel(key))+'</h3></article>'
    ).join('');
  }

  function renderField(data){
    const field=data.field||data.origin_field;
    if(!field){
      fieldSummary.textContent='No sufficient real-user field dataset was returned for this page or origin.';
      fieldEl.innerHTML='<div class="speed-empty"><strong>Field data unavailable</strong><p>This is common for new, low-traffic or insufficiently sampled pages. The lab test below is still valid as a synthetic diagnostic.</p></div>';
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
    let savings=[];
    if(Number(item.savings_ms)>0) savings.push('up to '+(Number(item.savings_ms)/1000).toFixed(2)+' s');
    if(Number(item.savings_bytes)>0) savings.push(bytes(Number(item.savings_bytes)));
    return '<article class="speed-audit-item"><div class="speed-audit-top"><h3>'+esc(item.title)+'</h3>'+(item.display?'<span>'+esc(item.display)+'</span>':'')+'</div>'+
      (savings.length?'<div class="speed-saving">Estimated savings: '+esc(savings.join(' · '))+'</div>':'')+
      '<p>'+esc(item.description||'Review this Lighthouse diagnostic and the affected resources in your implementation.')+'</p></article>';
  }

  function renderAudits(data){
    oppEl.innerHTML=(data.opportunities||[]).map(auditCard).join('') || '<div class="speed-empty"><strong>No major load opportunities were returned.</strong><p>Review diagnostics and repeat the test after meaningful site changes.</p></div>';
    diagEl.innerHTML=(data.diagnostics||[]).map(auditCard).join('') || '<div class="speed-empty">No additional performance diagnostics were returned.</div>';
  }

  function renderResources(data){
    const rows=(data.resources||[]).filter(r=>r.type!=='total');
    resourcesEl.innerHTML=rows.map(r=>'<tr><td>'+esc(r.label||r.type)+'</td><td>'+esc(r.requests??'—')+'</td><td>'+esc(bytes(r.transfer_bytes))+'</td></tr>').join('') || '<tr><td colspan="3">No resource summary returned.</td></tr>';
  }

  function renderPassed(data){
    passedEl.innerHTML=(data.passed||[]).map(p=>'<span class="speed-pass">✓ '+esc(p.title)+'</span>').join('') || '<p>No passed-audit list returned.</p>';
  }

  function render(data){
    results.hidden=false;
    titleEl.textContent='Speed test for '+new URL(data.final_url||data.url).hostname;
    metaEl.textContent=(data.strategy==='mobile'?'Mobile':'Desktop')+' · '+(data.lighthouse_version?'Lighthouse '+data.lighthouse_version+' · ':'')+(data.fetch_time?new Date(data.fetch_time).toLocaleString():'Fresh analysis');
    renderScores(data); renderField(data); renderLab(data); renderAudits(data); renderResources(data); renderPassed(data);
    notesEl.innerHTML=(data.notes||[]).map(n=>'<p>'+esc(n)+'</p>').join('')+'<p><strong>Provider:</strong> '+esc(data.provider||'PageSpeed Insights / Lighthouse')+'</p>';
    results.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function run(strategy){
    if(!state.url) return;
    setStrategy(strategy);
    if(state.cache[strategy]){ render(state.cache[strategy]); return; }
    errorEl.hidden=true; progress.hidden=false;
    progress.textContent='Running '+(strategy==='mobile'?'mobile':'desktop')+' Lighthouse analysis… this can take several seconds.';
    tabs.forEach(b=>b.disabled=true);
    try{
      const res=await fetch('/api/page-speed.php?url='+encodeURIComponent(state.url)+'&strategy='+strategy,{headers:{Accept:'application/json'}});
      const data=await res.json().catch(()=>({error:'Invalid response from the speed test service.'}));
      if(!res.ok) throw new Error(data.error||'Speed test could not be completed.');
      state.cache[strategy]=data;
      render(data);
    }catch(err){
      errorEl.textContent=err.message||'Speed test could not be completed.';
      errorEl.hidden=false;
    }finally{
      progress.hidden=true; tabs.forEach(b=>b.disabled=false);
    }
  }

  form.addEventListener('submit',e=>{
    e.preventDefault();
    const url=cleanUrl(input.value);
    if(!url){ errorEl.textContent='Enter a public website URL.'; errorEl.hidden=false; return; }
    try{ new URL(url); }catch{ errorEl.textContent='Enter a valid website URL.'; errorEl.hidden=false; return; }
    input.value=url; state.url=url; state.cache={}; results.hidden=true;
    run('mobile');
  });
  tabs.forEach(btn=>btn.addEventListener('click',()=>run(btn.dataset.strategy)));

  copyBtn.addEventListener('click',async()=>{
    const data=state.cache[state.strategy]; if(!data) return;
    const lines=[
      'Website Speed Test — '+data.strategy.toUpperCase(),
      data.final_url||data.url,
      '',
      ...Object.entries(data.categories||{}).map(([k,v])=>categoryLabel(k)+': '+(v??'—')+'/100'),
      '',
      'Lab metrics:',
      ...(data.lab||[]).map(m=>m.label+': '+(m.display||'—')),
      '',
      'Top opportunities:',
      ...(data.opportunities||[]).slice(0,6).map(o=>'- '+o.title+(o.display?' — '+o.display:''))
    ];
    try{await navigator.clipboard.writeText(lines.join('\n')); copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy report',1500);}catch{}
  });

  const q=new URLSearchParams(location.search).get('url');
  if(q){ input.value=q; state.url=cleanUrl(q); run('mobile'); }
})();