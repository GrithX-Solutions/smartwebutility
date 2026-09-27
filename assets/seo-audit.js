(() => {
  'use strict';

  const form=document.getElementById('seoAuditForm');
  if(!form)return;

  const urlEl=document.getElementById('seoAuditUrl');
  const modeEl=document.getElementById('seoAuditMode');
  const errorEl=document.getElementById('seoAuditError');
  const progressEl=document.getElementById('seoAuditProgress');
  const resultsEl=document.getElementById('seoAuditResults');
  const summaryEl=document.getElementById('seoAuditSummary');
  const issuesEl=document.getElementById('seoAuditIssues');
  const passesEl=document.getElementById('seoAuditPasses');
  const pagesBody=document.getElementById('seoAuditPagesBody');
  const scopeEl=document.getElementById('seoAuditScope');
  const reportTitle=document.getElementById('seoAuditReportTitle');
  const copyBtn=document.getElementById('seoAuditCopy');
  const filterButtons=[...document.querySelectorAll('[data-audit-filter]')];

  let lastData=null;
  let activeFilter='all';

  const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const cleanUrl=(raw)=>{
    let value=String(raw||'').trim();
    if(!value)return '';
    if(!/^https?:\/\//i.test(value)) value='https://'+value;
    return value;
  };

  const statusClass=(status)=>{
    if(status>=200&&status<300)return 'ok';
    if(status>=300&&status<400)return 'warn';
    return 'bad';
  };

  function summaryCard(label,value,kind=''){
    return '<div class="audit-stat '+esc(kind)+'"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
  }

  function renderSummary(data){
    const a=data.audit||{}, s=data.summary||{};
    summaryEl.innerHTML=[
      summaryCard(a.mode==='page'?'Page audited':'Pages crawled',a.pages_crawled||0),
      summaryCard('Critical',s.critical||0,(s.critical||0)>0?'critical':'ok'),
      summaryCard('Warnings',s.warnings||0,(s.warnings||0)>0?'warning':'ok'),
      summaryCard('Passed checks',s.passed_checks||0,'ok')
    ].join('');

    reportTitle.textContent='SEO audit for '+(a.host||a.final_url||'website');
    scopeEl.innerHTML=
      '<strong>'+esc(a.pages_crawled||0)+'</strong> pages crawled · '+
      '<strong>'+esc(a.sitemap_urls_found||0)+'</strong> sitemap URLs found · '+
      '<strong>'+esc(a.discovered_urls||0)+'</strong> URLs discovered · '+
      '<strong>'+esc(Math.round((a.elapsed_ms||0)/1000))+'s</strong> audit time'+
      (a.mode==='crawl'&&a.max_pages?' · <strong>'+esc(a.max_pages)+'</strong> page scope':'')+
      (a.stopped_early?' · <span class="audit-scope-note">selected scope or execution budget reached</span>':'');
  }

  function issueCard(issue){
    const urls=(issue.urls||[]).map(u=>'<li><code>'+esc(u)+'</code></li>').join('');
    const ref=issue.reference
      ? '<a class="audit-reference" href="'+esc(issue.reference)+'" rel="noopener noreferrer">Official reference ↗</a>'
      : '';
    return '<article class="audit-issue" data-severity="'+esc(issue.severity)+'">'+
      '<div class="audit-issue-head">'+
        '<div><span class="audit-severity '+esc(issue.severity)+'">'+esc(issue.severity)+'</span>'+
        '<span class="audit-category">'+esc(issue.category)+'</span></div>'+
        '<span class="audit-affected">'+esc(issue.affected_count||0)+' affected</span>'+
      '</div>'+
      '<h3>'+esc(issue.title)+'</h3>'+
      '<div class="audit-issue-grid">'+
        '<div><b>Why it matters</b><p>'+esc(issue.why)+'</p></div>'+
        '<div><b>How to fix</b><p>'+esc(issue.fix)+'</p>'+ref+'</div>'+
      '</div>'+
      (urls?'<details><summary>Sample affected URLs</summary><ul class="audit-url-list">'+urls+'</ul></details>':'')+
    '</article>';
  }

  function renderIssues(data){
    const issues=data.issues||[];
    issuesEl.innerHTML=issues.length
      ? issues.map(issueCard).join('')
      : '<div class="audit-empty"><strong>No crawl issues were detected in the checks run.</strong><p>This is not a ranking guarantee; review the audit scope and limits below.</p></div>';
    applyFilter();
  }

  function renderPasses(data){
    const passes=data.passes||[];
    passesEl.innerHTML=passes.length
      ? passes.map(p=>'<li><span>✓</span><div><b>'+esc(p.title)+'</b><small>'+esc(p.category)+'</small></div></li>').join('')
      : '<li><div>No passed checks were returned.</div></li>';
  }

  function renderPages(data){
    const pages=data.pages||[];
    pagesBody.innerHTML=pages.map(p=>{
      const title=p.title||'—';
      const indexable=p.noindex===true?'No':(p.noindex===false?'Yes':'—');
      return '<tr>'+
        '<td><div class="audit-page-url"><code>'+esc(p.url)+'</code><small>'+esc(title)+'</small></div></td>'+
        '<td><span class="audit-http '+statusClass(Number(p.status||0))+'">'+esc(p.status||'—')+'</span></td>'+
        '<td>'+esc(indexable)+'</td>'+
        '<td>'+esc(p.h1_count??'—')+'</td>'+
        '<td>'+esc(p.word_count??'—')+'</td>'+
        '<td>'+esc(p.internal_links??'—')+'</td>'+
        '<td>'+esc(p.time_ms!=null?p.time_ms+' ms':'—')+'</td>'+
      '</tr>';
    }).join('');
  }

  function renderMethodology(data){
    const m=data.methodology||{};
    const limits=(m.limits||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
    document.getElementById('seoAuditMethodology').innerHTML=
      '<p>'+esc(m.scope||'')+'</p>'+
      (limits?'<ul>'+limits+'</ul>':'');
  }

  function applyFilter(){
    document.querySelectorAll('.audit-issue').forEach(card=>{
      card.hidden=activeFilter!=='all'&&card.dataset.severity!==activeFilter;
    });
    filterButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.auditFilter===activeFilter));
  }

  filterButtons.forEach(btn=>btn.addEventListener('click',()=>{
    activeFilter=btn.dataset.auditFilter||'all';
    applyFilter();
  }));

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    const target=cleanUrl(urlEl.value);
    if(!target){
      errorEl.textContent='Enter a public website URL.';
      errorEl.hidden=false;
      return;
    }
    urlEl.value=target;
    errorEl.hidden=true;
    resultsEl.hidden=true;

    const button=form.querySelector('button[type="submit"]');
    const old=button.textContent;
    button.disabled=true;
    button.textContent='Auditing…';
    progressEl.hidden=false;

    const started=Date.now();
    const timer=setInterval(()=>{
      const sec=Math.max(1,Math.round((Date.now()-started)/1000));
      progressEl.textContent=(modeEl?.value==='page'?'Auditing this page… ':'Auditing up to '+modeEl.value+' same-host pages… ')+sec+'s';
    },1000);
    progressEl.textContent='Starting crawl and site-level checks…';

    try{
      const scope=modeEl?.value||'25';
      const mode=scope==='page'?'page':'crawl';
      const endpoint='/api/seo-audit.php?url='+encodeURIComponent(target)+'&mode='+encodeURIComponent(mode)+(mode==='crawl'?'&pages='+encodeURIComponent(scope):'');
      const response=await fetch(endpoint,{headers:{accept:'application/json'}});
      const data=await response.json().catch(()=>({error:'Invalid audit response'}));
      if(!response.ok||data.error)throw new Error(data.error||'Audit failed.');

      lastData=data;
      renderSummary(data);
      renderIssues(data);
      renderPasses(data);
      renderPages(data);
      renderMethodology(data);
      resultsEl.hidden=false;

      const u=new URL(location.href);
      u.searchParams.set('url',target);
      history.replaceState(null,'',u.pathname+u.search);
    }catch(err){
      errorEl.textContent=err.message||'The audit could not be completed.';
      errorEl.hidden=false;
    }finally{
      clearInterval(timer);
      progressEl.hidden=true;
      button.disabled=false;
      button.textContent=old;
    }
  });

  copyBtn?.addEventListener('click',async()=>{
    if(!lastData)return;
    const s=lastData.summary||{}, a=lastData.audit||{};
    const lines=[
      'Smart Web Utility SEO Audit',
      'Site: '+(a.final_url||a.requested_url||''),
      'Pages crawled: '+(a.pages_crawled||0),
      'Critical: '+(s.critical||0),
      'Warnings: '+(s.warnings||0),
      'Notices: '+(s.notices||0),
      ''
    ];
    (lastData.issues||[]).forEach(i=>{
      lines.push('['+String(i.severity||'').toUpperCase()+'] '+i.title);
      lines.push('Why: '+i.why);
      lines.push('Fix: '+i.fix);
      if(i.urls?.length)lines.push('URLs: '+i.urls.join(', '));
      lines.push('');
    });
    try{
      await navigator.clipboard.writeText(lines.join('\n'));
      copyBtn.textContent='Copied';
      setTimeout(()=>copyBtn.textContent='Copy report',1300);
    }catch{
      copyBtn.textContent='Copy unavailable';
    }
  });

  const params=new URLSearchParams(location.search);
  if(params.get('url')){
    urlEl.value=params.get('url');
  }
})();