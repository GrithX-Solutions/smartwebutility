(() => {
  'use strict';
  const form=document.getElementById('bulkRedirectForm');
  if(!form) return;
  const input=document.getElementById('bulkRedirectInput');
  const result=document.getElementById('bulkRedirectResult');
  const body=document.getElementById('bulkRedirectBody');
  const status=document.getElementById('bulkRedirectStatus');
  const error=document.getElementById('bulkRedirectError');
  const copy=document.getElementById('bulkRedirectCopy');
  const clear=document.getElementById('bulkRedirectClear');
  const submit=form.querySelector('button[type="submit"]');
  let lastRows=[];

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const normalize=v=>{
    let s=v.trim();
    if(!s) return '';
    if(!/^https?:\/\//i.test(s)) s='https://'+s;
    return s;
  };
  const collect=()=>{
    const seen=new Set(), urls=[];
    for(const line of input.value.split(/\r?\n/)){
      const url=normalize(line);
      if(!url || seen.has(url)) continue;
      try { new URL(url); } catch { continue; }
      seen.add(url); urls.push(url);
      if(urls.length===10) break;
    }
    return urls;
  };
  const render=rows=>{
    lastRows=rows;
    body.innerHTML='<table class="record-table"><thead><tr><th>#</th><th>Start URL</th><th>Redirects</th><th>Final status</th><th>Final URL</th></tr></thead><tbody>'+
      rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td class="record-value">'+esc(r.input)+'</td><td>'+esc(r.redirects??'—')+'</td><td>'+esc(r.status??'—')+'</td><td class="record-value">'+esc(r.final_url||r.error||'—')+'</td></tr>').join('')+
      '</tbody></table>';
    result.hidden=false;
  };

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    error.hidden=true; result.hidden=true;
    const urls=collect();
    if(!urls.length){
      error.textContent='Enter at least one valid public URL, one per line.';
      error.hidden=false; return;
    }
    submit.disabled=true;
    const old=submit.textContent;
    submit.textContent='Checking…';
    status.textContent='0 / '+urls.length+' complete';
    const rows=[];
    for(let i=0;i<urls.length;i++){
      const inputUrl=urls[i];
      try{
        const res=await fetch('/api/redirect-check.php?url='+encodeURIComponent(inputUrl),{headers:{accept:'application/json'}});
        const data=await res.json().catch(()=>({error:'Unreadable server response (HTTP '+res.status+').'}));
        if(!res.ok || data.error) throw new Error(data.error||'Check failed');
        const last=Array.isArray(data.chain)&&data.chain.length?data.chain[data.chain.length-1]:null;
        rows.push({input:inputUrl,redirects:data.redirects,final_url:data.final_url,status:last?.status??null});
      }catch(err){
        rows.push({input:inputUrl,error:err.message||'Check failed'});
      }
      status.textContent=(i+1)+' / '+urls.length+' complete';
      render(rows);
    }
    submit.disabled=false; submit.textContent=old;
    status.textContent='Completed '+urls.length+' URL'+(urls.length===1?'':'s');
  });

  copy.addEventListener('click',async()=>{
    if(!lastRows.length) return;
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const csv=['Start URL,Redirects,Final status,Final URL / Error',...lastRows.map(r=>[r.input,r.redirects??'',r.status??'',r.final_url||r.error||''].map(q).join(','))].join('\n');
    try{
      await navigator.clipboard.writeText(csv);
      copy.textContent='Copied CSV';
      setTimeout(()=>copy.textContent='Copy CSV',1200);
    }catch{
      copy.textContent='Copy unavailable';
    }
  });
  clear.addEventListener('click',()=>{
    input.value=''; body.innerHTML=''; result.hidden=true; error.hidden=true; status.textContent='Ready'; lastRows=[]; input.focus();
  });
})();