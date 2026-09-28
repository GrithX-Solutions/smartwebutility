(()=>{
'use strict';
const form=document.getElementById('robotsTesterForm'); if(!form)return;
const site=document.getElementById('robotsSiteUrl'), paste=document.getElementById('robotsPasteText'), crawler=document.getElementById('robotsCrawler'), customWrap=document.getElementById('robotsCustomWrap'), custom=document.getElementById('robotsCustomCrawler'), paths=document.getElementById('robotsPaths');
const livePanel=document.getElementById('robotsLivePanel'), pastePanel=document.getElementById('robotsPastePanel'), progress=document.getElementById('robotsProgress'), errorEl=document.getElementById('robotsError'), results=document.getElementById('robotsResults');
const titleEl=document.getElementById('robotsReportTitle'), metaEl=document.getElementById('robotsReportMeta'), pathResults=document.getElementById('robotsPathResults'), selectionText=document.getElementById('robotsSelectionText'), rulesEl=document.getElementById('robotsRules'), warningsEl=document.getElementById('robotsWarnings'), sitemapsEl=document.getElementById('robotsSitemaps'), sourceEl=document.getElementById('robotsSource'), methodologyEl=document.getElementById('robotsMethodology'), copyBtn=document.getElementById('robotsCopy');
const modeButtons=[...document.querySelectorAll('[data-robots-mode]')];
const counts={allowed:document.getElementById('robotsAllowedCount'),blocked:document.getElementById('robotsBlockedCount'),warnings:document.getElementById('robotsWarningCount'),groups:document.getElementById('robotsGroupCount')};
let mode='live', lastData=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cleanUrl=v=>{v=v.trim();if(v&&!/^https?:\/\//i.test(v))v='https://'+v;return v};

function setMode(next){
 mode=next; const live=next==='live';
 livePanel.hidden=!live; pastePanel.hidden=live;
 modeButtons.forEach(b=>{const a=b.dataset.robotsMode===next;b.classList.toggle('active',a);b.setAttribute('aria-selected',String(a))});
}
modeButtons.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.robotsMode)));
crawler.addEventListener('change',()=>customWrap.hidden=crawler.value!=='custom');

function selectedUA(){return crawler.value==='custom'?(custom.value.trim()||'CustomBot'):crawler.value}
function pathList(){return paths.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,100)}

function renderTests(data){
 const tests=data.tests||[]; counts.allowed.textContent=tests.filter(x=>x.allowed).length; counts.blocked.textContent=tests.filter(x=>!x.allowed).length;
 pathResults.innerHTML=tests.map(t=>{
   const cls=t.allowed?'allowed':'blocked',label=t.allowed?'Allowed':'Blocked',r=t.matched;
   return '<article class="robots-path-card '+cls+'"><div class="robots-path-top"><span class="robots-decision '+cls+'">'+(t.allowed?'✓':'×')+' '+label+'</span><code>'+esc(t.path)+'</code></div>'+
     '<p>'+esc(t.reason)+'</p>'+
     (r?'<div class="robots-winner"><span>Winning rule</span><code>Line '+esc(r.line)+': '+esc(r.type)+': '+esc(r.path)+'</code></div>':'<div class="robots-winner neutral"><span>Winning rule</span><code>No matching rule</code></div>')+
     ((t.matching_rules||[]).length>1?'<details><summary>'+esc(t.matching_rules.length)+' matching rules considered</summary><div class="robots-rule-mini">'+t.matching_rules.map(x=>'<code>Line '+esc(x.line)+': '+esc(x.type)+': '+esc(x.path)+'</code>').join('')+'</div></details>':'')+
   '</article>';
 }).join('')||'<div class="robots-empty">No paths were tested.</div>';
}
function renderSelection(data){
 const s=data.selection||{}; counts.groups.textContent=(s.groups||[]).length;
 const tokens=(s.tokens||[]).join(', ')||'none';
 selectionText.textContent=(s.groups||[]).length?'Matched '+tokens+' using group'+((s.groups||[]).length===1?' ':'s ')+(s.groups||[]).join(', ')+'.':'No specific or global group matched; crawling is allowed by default.';
 rulesEl.innerHTML=(s.rules||[]).map(r=>'<article><span class="'+esc(r.type)+'">'+esc(r.type.toUpperCase())+'</span><code>'+esc(r.path)+'</code><small>line '+esc(r.line)+' · specificity '+esc(r.specificity)+'</small></article>').join('')||'<div class="robots-empty">No applicable Allow/Disallow rules.</div>';
}
function renderWarnings(data){
 const list=data.parse?.warnings||[]; counts.warnings.textContent=list.length;
 warningsEl.innerHTML=list.length?'<div class="robots-warning-list">'+list.map(w=>'<article><strong>Line '+esc(w.line)+' · '+esc(w.type)+'</strong><p>'+esc(w.message)+'</p><code>'+esc(w.source)+'</code></article>').join('')+'</div>':'<div class="robots-empty good">No parser warnings found.</div>';
}
function renderSitemaps(data){
 const list=data.parse?.sitemaps||[];
 sitemapsEl.innerHTML=list.length?'<div class="robots-sitemap-list">'+list.map(x=>'<article><span>'+(x.valid_absolute_url?'✓':'!')+'</span><a href="'+esc(x.url)+'" rel="noopener">'+esc(x.url)+'</a><small>line '+esc(x.line)+'</small></article>').join('')+'</div>':'<div class="robots-empty">No Sitemap directives found.</div>';
}
function render(data){
 lastData=data; results.hidden=false; renderTests(data); renderSelection(data); renderWarnings(data); renderSitemaps(data);
 sourceEl.textContent=data.source_text||'(No robots.txt content returned.)';
 methodologyEl.innerHTML=(data.methodology||[]).map(x=>'<p>'+esc(x)+'</p>').join('');
 const source=data.mode==='live'?(data.fetch?.final_url||data.fetch?.robots_url||'live robots.txt'):'pasted rules';
 titleEl.textContent='Robots test for '+selectedUA();
 metaEl.textContent=source+(data.fetch?.status?' · HTTP '+data.fetch.status:'')+' · '+(data.parse?.line_count??0)+' lines';
 results.scrollIntoView({behavior:'smooth',block:'start'});
}
async function run(){
 errorEl.hidden=true; const ua=selectedUA(), list=pathList();
 if(!list.length){errorEl.textContent='Add at least one URL or path to test.';errorEl.hidden=false;return}
 const body={mode,user_agent:ua,paths:list};
 if(mode==='live'){
   const url=cleanUrl(site.value); if(!url){errorEl.textContent='Enter a public website URL.';errorEl.hidden=false;return}
   try{new URL(url)}catch{errorEl.textContent='Enter a valid public website URL.';errorEl.hidden=false;return}
   site.value=url; body.url=url;
 }else{
   if(!paste.value.trim()){errorEl.textContent='Paste robots.txt content to test.';errorEl.hidden=false;return}
   body.text=paste.value;
 }
 progress.textContent=mode==='live'?'Fetching and parsing robots.txt…':'Parsing pasted robots.txt…'; progress.hidden=false;
 [...form.querySelectorAll('button[type="submit"]')].forEach(b=>b.disabled=true);
 try{
   const res=await fetch('/api/robots-txt-test.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),cache:'no-store'});
   const data=await res.json().catch(()=>({error:'Invalid response from robots.txt tester.'}));
   if(!res.ok||data.error)throw new Error(data.error||'Robots.txt test failed.');
   render(data);
   if(mode==='live')history.replaceState(null,'','?url='+encodeURIComponent(site.value)+'&bot='+encodeURIComponent(ua));
 }catch(err){errorEl.textContent=err.message||'Robots.txt test failed.';errorEl.hidden=false}
 finally{progress.hidden=true;[...form.querySelectorAll('button[type="submit"]')].forEach(b=>b.disabled=false)}
}
form.addEventListener('submit',e=>{e.preventDefault();run()});
document.getElementById('robotsExample').addEventListener('click',()=>{
 setMode('paste'); paste.value='User-agent: *\nDisallow: /private/\nDisallow: /*.pdf$\nAllow: /private/public/\n\nUser-agent: Googlebot\nDisallow: /tmp/\nAllow: /tmp/public/\n\nSitemap: https://example.com/sitemap.xml'; paths.value='/\n/private/account/\n/private/public/help\n/report.pdf\n/tmp/file\n/tmp/public/page'; crawler.value='Googlebot'; customWrap.hidden=true;
});
document.getElementById('robotsClear').addEventListener('click',()=>{site.value='';paste.value='';paths.value='/';results.hidden=true;errorEl.hidden=true});
copyBtn.addEventListener('click',async()=>{
 if(!lastData)return; const lines=['Robots.txt Tester','Crawler: '+lastData.user_agent,'Source: '+(lastData.fetch?.final_url||'Pasted rules'),'',
 ...(lastData.tests||[]).map(t=>(t.allowed?'ALLOWED ':'BLOCKED ')+t.path+(t.matched?' — line '+t.matched.line+' '+t.matched.type+': '+t.matched.path:'')),
 '','Warnings:',...(lastData.parse?.warnings||[]).map(w=>'Line '+w.line+': '+w.message)];
 try{await navigator.clipboard.writeText(lines.join('\n'));copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent='Copy report',1400)}catch{}
});
const q=new URLSearchParams(location.search); if(q.get('url')){site.value=q.get('url');const bot=q.get('bot');if(bot&&[...crawler.options].some(o=>o.value===bot)){crawler.value=bot}run()}
})();