(() => {
 'use strict';
 const input=document.getElementById('urlInput'), output=document.getElementById('urlOutput'), mode=document.getElementById('urlMode'), component=document.getElementById('urlComponent'), status=document.getElementById('urlStatus'), error=document.getElementById('urlError'), year=document.getElementById('year');
 if(year)year.textContent=new Date().getFullYear();
 const set=(m,k='neutral')=>{status.textContent=m;status.dataset.kind=k};
 const fail=m=>{error.textContent=m;error.hidden=false;output.value='';set('Error','error')};
 function run(){error.hidden=true;try{const v=input.value;if(!v){output.value='';return set('Ready')}if(mode.value==='encode'){output.value=component.checked?encodeURIComponent(v):encodeURI(v);set('Encoded','success')}else{output.value=component.checked?decodeURIComponent(v):decodeURI(v);set('Decoded','success')}}catch(e){fail(e.message||'Could not process URL text.')}}
 document.getElementById('runUrlCodec').addEventListener('click',run);
 document.getElementById('clearUrlCodec').addEventListener('click',()=>{input.value='';output.value='';error.hidden=true;set('Ready');input.focus()});
 document.getElementById('swapUrlCodec').addEventListener('click',()=>{if(output.value)input.value=output.value;mode.value=mode.value==='encode'?'decode':'encode';run()});
 document.getElementById('copyUrlCodec').addEventListener('click',async e=>{if(!output.value)return;await navigator.clipboard.writeText(output.value);const b=e.currentTarget,o=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=o,1200)});
 [mode,component].forEach(el=>el.addEventListener('change',run));
 input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run()}});
})();