(() => {
  'use strict';
  const pattern=document.getElementById('regexPattern');
  const flags=document.getElementById('regexFlags');
  const input=document.getElementById('regexInput');
  const replace=document.getElementById('regexReplace');
  const matches=document.getElementById('regexMatches');
  const output=document.getElementById('regexOutput');
  const status=document.getElementById('regexStatus');
  const error=document.getElementById('regexError');
  const year=document.getElementById('year');
  if(year) year.textContent=new Date().getFullYear();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const set=(m,k='neutral')=>{status.textContent=m;status.dataset.kind=k};
  function fail(m){error.textContent=m;error.hidden=false;matches.innerHTML='';output.value='';set('Invalid regex','error')}
  function run(){
    error.hidden=true; error.textContent='';
    try{
      const re=new RegExp(pattern.value,flags.value);
      const allFlags=re.flags.includes('g')?re.flags:re.flags+'g';
      const globalRe=new RegExp(re.source,allFlags);
      const arr=[...input.value.matchAll(globalRe)];
      matches.innerHTML=arr.length
        ? '<table class="record-table"><thead><tr><th>#</th><th>Match</th><th>Index</th><th>Groups</th></tr></thead><tbody>'
          + arr.map((m,i)=>'<tr><td>'+(i+1)+'</td><td class="record-value">'+esc(m[0])+'</td><td>'+m.index+'</td><td class="record-value">'+esc(m.length>1?JSON.stringify(m.slice(1)):'—')+'</td></tr>').join('')
          + '</tbody></table>'
        : '<div class="empty">No matches found.</div>';
      output.value=replace.value ? input.value.replace(re,replace.value) : '';
      set(arr.length+' match'+(arr.length===1?'':'es'),'success');
    }catch(e){ fail(e.message||'Invalid regular expression.'); }
  }
  document.getElementById('runRegex').addEventListener('click',run);
  document.getElementById('clearRegex').addEventListener('click',()=>{pattern.value='';flags.value='g';input.value='';replace.value='';matches.innerHTML='';output.value='';error.hidden=true;set('Ready');pattern.focus()});
  document.getElementById('exampleRegex').addEventListener('click',()=>{pattern.value='\\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})\\b';flags.value='gi';input.value='Email alice@example.com and bob@test.org';replace.value='[email]';run()});
  [pattern,flags,input,replace].forEach(el=>el.addEventListener('input',()=>{if(pattern.value)run()}));
})();