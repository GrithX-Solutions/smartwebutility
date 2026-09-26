const form=document.getElementById('dnsForm');
const domainEl=document.getElementById('domain');
const typeEl=document.getElementById('type');
const result=document.getElementById('result');
const resultTitle=document.getElementById('resultTitle');
const resultBody=document.getElementById('resultBody');
const errorBox=document.getElementById('error');
const copyBtn=document.getElementById('copyBtn');
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

const cleanDomain=(v)=>{
  let value=v.trim().toLowerCase();
  if(!value) return '';
  try{ if(/^https?:\/\//.test(value)) value=new URL(value).hostname; }catch{}
  return value.replace(/^www\./,'').replace(/\.$/,'').split('/')[0];
};
const validDomain=(v)=> /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(v) || /^localhost$/i.test(v);
const escapeHtml=(s)=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function lookup(domain,type){
  const url=`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  const response=await fetch(url,{headers:{accept:'application/dns-json'}});
  if(!response.ok) throw new Error(`Resolver returned HTTP ${response.status}`);
  return response.json();
}

function render(data,domain,type){
  const answers=Array.isArray(data.Answer)?data.Answer:[];
  resultTitle.textContent=`${type} records for ${domain}`;
  if(!answers.length){
    resultBody.innerHTML=`<div class="empty">No ${escapeHtml(type)} records were returned. DNS status code: ${escapeHtml(data.Status ?? 'unknown')}.</div>`;
  } else {
    const rows=answers.map(a=>`<tr><td>${escapeHtml(a.name||domain)}</td><td class="record-value">${escapeHtml(a.data||'')}</td><td>${escapeHtml(a.TTL??'—')}</td></tr>`).join('');
    resultBody.innerHTML=`<table class="record-table"><thead><tr><th>Name</th><th>Value</th><th>TTL</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  result.hidden=false;
}

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  errorBox.hidden=true; result.hidden=true;
  const domain=cleanDomain(domainEl.value); const type=typeEl.value;
  domainEl.value=domain;
  if(!validDomain(domain)){errorBox.textContent='Enter a valid domain such as example.com.';errorBox.hidden=false;domainEl.focus();return;}
  const button=form.querySelector('button[type="submit"]'); const old=button.textContent; button.disabled=true; button.textContent='Checking…';
  try{const data=await lookup(domain,type);render(data,domain,type);history.replaceState(null,'',`?domain=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`)}
  catch(err){errorBox.textContent=`DNS lookup failed: ${err.message}. Please try again.`;errorBox.hidden=false;}
  finally{button.disabled=false;button.textContent=old;}
});

document.querySelectorAll('[data-type]').forEach(btn=>btn.addEventListener('click',()=>{typeEl.value=btn.dataset.type;if(domainEl.value)form.requestSubmit();}));
copyBtn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(resultBody.innerText);copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent='Copy',1200)}catch{copyBtn.textContent='Select & copy'}});
const params=new URLSearchParams(location.search);if(params.get('domain')){domainEl.value=params.get('domain');if(params.get('type'))typeEl.value=params.get('type');form.requestSubmit();}
