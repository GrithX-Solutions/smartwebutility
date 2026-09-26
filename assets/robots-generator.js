(() => {
'use strict';
const ua=document.getElementById('robotsUserAgent'), disallow=document.getElementById('robotsDisallow'), allow=document.getElementById('robotsAllow'), sitemap=document.getElementById('robotsSitemap'), crawl=document.getElementById('robotsCrawlDelay'), output=document.getElementById('robotsOutput'), year=document.getElementById('year');
if(year)year.textContent=new Date().getFullYear();
function lines(v,prefix){return v.split(/\n/).map(x=>x.trim()).filter(Boolean).map(x=>prefix+': '+x)}
function build(){const out=['User-agent: '+(ua.value.trim()||'*'),...lines(disallow.value,'Disallow'),...lines(allow.value,'Allow')];if(crawl.value.trim())out.push('Crawl-delay: '+crawl.value.trim());if(sitemap.value.trim())out.push('', 'Sitemap: '+sitemap.value.trim());output.value=out.join('\n')}
document.querySelectorAll('#robotsUserAgent,#robotsDisallow,#robotsAllow,#robotsSitemap,#robotsCrawlDelay').forEach(el=>el.addEventListener('input',build));
document.getElementById('copyRobots').addEventListener('click',async e=>{await navigator.clipboard.writeText(output.value);const b=e.currentTarget,o=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=o,1200)});
document.getElementById('exampleRobots').addEventListener('click',()=>{ua.value='*';disallow.value='/admin/\n/private/';allow.value='/';crawl.value='';sitemap.value='https://example.com/sitemap.xml';build()});
document.getElementById('clearRobots').addEventListener('click',()=>{ua.value='*';disallow.value='';allow.value='';crawl.value='';sitemap.value='';build()});
build();
})();