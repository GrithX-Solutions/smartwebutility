(() => {
'use strict';
const $=id=>document.getElementById(id);
const title=$('metaTitle'), desc=$('metaDescription'), canonical=$('metaCanonical'), robots=$('metaRobots'), author=$('metaAuthor'), output=$('metaOutput'), preview=$('metaPreview'), year=$('year');
if(year)year.textContent=new Date().getFullYear();
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function build(){
  const lines=[];
  if(title.value) lines.push('<title>'+esc(title.value)+'</title>');
  if(desc.value) lines.push('<meta name="description" content="'+esc(desc.value)+'">');
  if(canonical.value) lines.push('<link rel="canonical" href="'+esc(canonical.value)+'">');
  if(robots.value) lines.push('<meta name="robots" content="'+esc(robots.value)+'">');
  if(author.value) lines.push('<meta name="author" content="'+esc(author.value)+'">');
  output.value=lines.join('\n');
  preview.innerHTML='<div><strong>'+esc(title.value||'Page title preview')+'</strong><div style="color:var(--brand2);word-break:break-all">'+esc(canonical.value||'https://example.com/page')+'</div><p style="color:var(--muted);margin-bottom:0">'+esc(desc.value||'Meta description preview will appear here.')+'</p></div>';
}
document.querySelectorAll('#metaTitle,#metaDescription,#metaCanonical,#metaRobots,#metaAuthor').forEach(el=>el.addEventListener('input',build));
$('copyMeta').addEventListener('click',async e=>{if(!output.value)return;await navigator.clipboard.writeText(output.value);const b=e.currentTarget,o=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=o,1200)});
$('clearMeta').addEventListener('click',()=>{[title,desc,canonical,author].forEach(x=>x.value='');robots.value='index,follow';build();title.focus()});
$('exampleMeta').addEventListener('click',()=>{title.value='Fast Free Online Web Tools | Smart Web Utility';desc.value='Useful online tools for developers, website owners and marketers. Fast, free and privacy-friendly.';canonical.value='https://smartwebutility.com/';robots.value='index,follow';author.value='Smart Web Utility';build()});
build();
})();