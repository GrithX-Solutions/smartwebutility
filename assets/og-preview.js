(() => {
'use strict';
const title=document.getElementById('ogTitle'), desc=document.getElementById('ogDescription'), url=document.getElementById('ogUrl'), image=document.getElementById('ogImage'), site=document.getElementById('ogSite'), output=document.getElementById('ogOutput'), card=document.getElementById('ogCard'), year=document.getElementById('year');
if(year)year.textContent=new Date().getFullYear();
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function build(){
 const tags=[];
 if(title.value)tags.push('<meta property="og:title" content="'+esc(title.value)+'">');
 if(desc.value)tags.push('<meta property="og:description" content="'+esc(desc.value)+'">');
 if(url.value)tags.push('<meta property="og:url" content="'+esc(url.value)+'">');
 if(image.value)tags.push('<meta property="og:image" content="'+esc(image.value)+'">');
 if(site.value)tags.push('<meta property="og:site_name" content="'+esc(site.value)+'">');
 tags.push('<meta property="og:type" content="website">');
 output.value=tags.join('\n');
 card.innerHTML=(image.value?'<div style="aspect-ratio:1.91/1;background:#0a1725 url('+esc(image.value)+') center/cover;border-bottom:1px solid var(--line)"></div>':'')+'<div style="padding:16px"><small style="color:var(--muted)">'+esc(site.value||'Example Site')+'</small><h3 style="margin:6px 0">'+esc(title.value||'Open Graph title preview')+'</h3><p style="color:var(--muted);margin:0">'+esc(desc.value||'Description preview')+'</p></div>';
}
document.querySelectorAll('#ogTitle,#ogDescription,#ogUrl,#ogImage,#ogSite').forEach(el=>el.addEventListener('input',build));
document.getElementById('copyOg').addEventListener('click',async e=>{await navigator.clipboard.writeText(output.value);const b=e.currentTarget,o=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=o,1200)});
document.getElementById('exampleOg').addEventListener('click',()=>{title.value='Smart Web Utility';desc.value='Fast, free and privacy-friendly online web tools.';url.value='https://smartwebutility.com/';site.value='Smart Web Utility';image.value='';build()});
document.getElementById('clearOg').addEventListener('click',()=>{title.value='';desc.value='';url.value='';site.value='';image.value='';build()});
build();
})();