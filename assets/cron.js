(() => {
 'use strict';
 const input=document.getElementById('cronInput'), desc=document.getElementById('cronDescription'), status=document.getElementById('cronStatus'), error=document.getElementById('cronError'), year=document.getElementById('year');
 if(year)year.textContent=new Date().getFullYear();
 const presets={'* * * * *':'Every minute','*/5 * * * *':'Every 5 minutes','0 * * * *':'Every hour at minute 0','0 0 * * *':'Every day at midnight','0 9 * * 1-5':'At 09:00 on weekdays','0 0 1 * *':'At midnight on the first day of every month','0 0 * * 0':'Every Sunday at midnight'};
 function describe(v){
   if(presets[v]) return presets[v];
   const p=v.trim().split(/\s+/);
   if(p.length!==5) throw new Error('Use a standard 5-field cron expression: minute hour day month weekday.');
   const [m,h,d,mo,w]=p;
   const parts=[];
   parts.push(m==='*'?'every minute':m.startsWith('*/')?'every '+m.slice(2)+' minutes':'at minute '+m);
   if(h!=='*') parts.push('of hour '+h);
   if(d!=='*') parts.push('on day '+d);
   if(mo!=='*') parts.push('in month '+mo);
   if(w!=='*') parts.push('weekday '+w);
   return parts.join(', ')+'.';
 }
 function run(){error.hidden=true;try{desc.textContent=describe(input.value);status.textContent='Parsed';status.dataset.kind='success'}catch(e){error.textContent=e.message;error.hidden=false;desc.textContent='';status.textContent='Invalid';status.dataset.kind='error'}}
 document.getElementById('parseCron').addEventListener('click',run);
 document.getElementById('clearCron').addEventListener('click',()=>{input.value='';desc.textContent='';error.hidden=true;status.textContent='Ready';input.focus()});
 document.querySelectorAll('[data-cron]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.cron;run()}));
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run()}});
})();