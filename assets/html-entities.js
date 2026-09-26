(() => {
 'use strict';
 const input=document.getElementById('htmlEntityInput'), output=document.getElementById('htmlEntityOutput'), mode=document.getElementById('htmlEntityMode'), status=document.getElementById('htmlEntityStatus'), year=document.getElementById('year');
 if(year)year.textContent=new Date().getFullYear();
 const encode=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 const decode=s=>{const t=document.createElement('textarea');t.innerHTML=s;return t.value};
 function run(){output.value=mode.value==='encode'?encode(input.value):decode(input.value);status.textContent=mode.value==='encode'?'Encoded':'Decoded';status.dataset.kind='success'}
 document.getElementById('runHtmlEntity').addEventListener('click',run);
 document.getElementById('clearHtmlEntity').addEventListener('click',()=>{input.value='';output.value='';status.textContent='Ready';input.focus()});
 document.getElementById('swapHtmlEntity').addEventListener('click',()=>{if(output.value)input.value=output.value;mode.value=mode.value==='encode'?'decode':'encode';run()});
 document.getElementById('copyHtmlEntity').addEventListener('click',async e=>{if(!output.value)return;await navigator.clipboard.writeText(output.value);const b=e.currentTarget,o=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=o,1200)});
 mode.addEventListener('change',()=>{if(input.value)run()});
})();