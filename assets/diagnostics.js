(() => {
'use strict';
const form=document.getElementById('diagForm'); if(!form)return;
const tool=form.dataset.tool, input=document.getElementById('target'), type=document.getElementById('recordType'), headerMethod=document.getElementById('headerMethod'), result=document.getElementById('result'), body=document.getElementById('resultBody'), title=document.getElementById('resultTitle'), error=document.getElementById('error'), copy=document.getElementById('copyBtn'), year=document.getElementById('year');
if(year)year.textContent=new Date().getFullYear();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const row=(k,v)=>'<tr><th>'+esc(k)+'</th><td class="record-value">'+esc(v??'—')+'</td></tr>';
function endpoint(v){
 if(tool==='sitemap')return '/api/sitemap-check.php?url='+encodeURIComponent(v);
 if(tool==='meta')return '/api/page-inspect.php?mode=meta&url='+encodeURIComponent(v);
 if(tool==='og')return '/api/page-inspect.php?mode=og&url='+encodeURIComponent(v);
 if(tool==='headers')return '/api/http-status.php?mode=headers&method='+encodeURIComponent(headerMethod?.value||'auto')+'&url='+encodeURIComponent(v);
 return '/api/dns-propagation.php?host='+encodeURIComponent(v.replace(/^https?:\/\//i,'').split('/')[0])+'&type='+encodeURIComponent(type.value);
}
function render(data){
 if(tool==='sitemap'){
  const r=data.result;
  const bytes=Number.isFinite(Number(r.bytes_checked))?Math.round(Number(r.bytes_checked)/1024).toLocaleString()+' KB':'—';
  const issueBlock=(r.issues?.length?'<div class="result-sub"><strong>Protocol issue samples</strong><div class="chips">'+r.issues.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>':'');
  const warningBlock=(r.warnings?.length?'<div class="result-sub"><strong>Warning samples</strong><div class="chips">'+r.warnings.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>':'');
  title.textContent='Sitemap check';
  body.innerHTML='<table class="record-table"><tbody>'
   +row('HTTP status',r.status)
   +row('Content type',r.content_type)
   +row('Final URL',r.final_url)
   +row('Redirects followed',r.redirect_count)
   +row('Type',r.type)
   +row('Protocol status',r.protocol_valid?'Valid':'Issues found')
   +row('Sitemap namespace',r.namespace_ok?'Valid':'Missing / incorrect')
   +row('Entries',r.entries)
   +row('Valid locations',r.valid_locs)
   +row('Invalid locations',r.invalid_locs)
   +row('Duplicate locations',r.duplicates)
   +row('Hosts represented',(r.hosts||[]).length)
   +row('lastmod coverage',(r.lastmod_count||0)+' / '+r.entries)
   +row('Invalid lastmod',r.invalid_lastmod||0)
   +row('Future lastmod',r.future_lastmod||0)
   +row('Bytes checked',bytes)
   +'</tbody></table>'
   +issueBlock+warningBlock
   +(r.sample?.length?'<div class="result-sub"><strong>Sample entries</strong><div class="chips">'+r.sample.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>':'');
 } else if(tool==='meta'){
  const r=data.result;
  const findings=(r.findings||[]).length
   ? '<div class="result-sub"><strong>Review findings</strong><div class="chips">'+r.findings.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>'
   : '<div class="result-sub"><strong>Review findings</strong><p>No basic metadata conflicts were detected in the fetched HTML.</p></div>';
  const redirects=(r.redirects||[]).length
   ? '<div class="result-sub"><strong>Redirect path</strong><div class="chips">'+r.redirects.map(x=>'<span>'+esc(x.status+' '+x.from+' → '+x.to)+'</span>').join('')+'</div></div>'
   : '';
  title.textContent='Meta tag check';
  body.innerHTML='<table class="record-table"><tbody>'
   +row('Requested URL',r.url)
   +row('Final URL',r.final_url||r.url)
   +row('Redirects followed',r.redirect_count||0)
   +row('HTTP status',r.status)
   +row('Content type',r.content_type)
   +row('Title',r.title)
   +row('Title characters',r.title_length)
   +row('Title elements',r.title_count)
   +row('Meta description',r.description)
   +row('Description characters',r.description_length)
   +row('Description tags',r.description_count)
   +row('Canonical',r.canonical)
   +row('Canonical links',r.canonical_count)
   +row('Meta robots',r.robots)
   +row('Googlebot',r.googlebot)
   +row('X-Robots-Tag',r.x_robots_tag)
   +row('Direct noindex detected',r.noindex_detected?'Yes':'No')
   +row('HTML lang',r.html_lang)
   +row('Viewport',r.viewport)
   +row('H1 count',r.h1_count)
   +row('First H1',r.first_h1)
   +'</tbody></table>'+findings+redirects;
 } else if(tool==='og'){
  const r=data.result, og=r.open_graph||{}, img=r.primary_image||{}, probe=img.probe||null;
  const findings=(r.findings||[]).length
   ? '<div class="result-sub"><strong>Review findings</strong><div class="chips">'+r.findings.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>'
   : '<div class="result-sub"><strong>Review findings</strong><p>No basic Open Graph protocol conflicts were detected in the fetched HTML.</p></div>';
  const redirects=(r.redirects||[]).length
   ? '<div class="result-sub"><strong>Page redirect path</strong><div class="chips">'+r.redirects.map(x=>'<span>'+esc(x.status+' '+x.from+' → '+x.to)+'</span>').join('')+'</div></div>'
   : '';
  const imageRedirects=probe?.redirects?.length
   ? '<div class="result-sub"><strong>Image redirect path</strong><div class="chips">'+probe.redirects.map(x=>'<span>'+esc(x.status+' '+x.from+' → '+x.to)+'</span>').join('')+'</div></div>'
   : '';
  const imageDimensions=probe?.dimensions ? probe.dimensions.width+' × '+probe.dimensions.height : '—';
  const allTags=Object.entries(r.open_graph_all||{}).length
   ? '<div class="result-sub"><strong>All Open Graph properties</strong><table class="record-table"><tbody>'+Object.entries(r.open_graph_all).map(([k,v])=>row(k,(v||[]).join(' | '))).join('')+'</tbody></table></div>'
   : '<div class="result-sub"><strong>All Open Graph properties</strong><p>No Open Graph properties were found in the HTML head.</p></div>';
  title.textContent='Open Graph check';
  body.innerHTML='<table class="record-table"><tbody>'
   +row('Requested URL',r.url)
   +row('Final URL',r.final_url||r.url)
   +row('Page redirects',r.redirect_count||0)
   +row('HTTP status',r.status)
   +row('Content type',r.content_type)
   +row('Core properties',String(r.core_present??0)+' / '+String(r.core_required??4))
   +row('OG tags found',r.og_tag_count??0)
   +row('Unique OG properties',r.og_property_count??0)
   +row('OG tags outside head',r.outside_head_count??0)
   +row('og:title',og['og:title'])
   +row('og:type',og['og:type'])
   +row('og:url',og['og:url'])
   +row('og:image',og['og:image'])
   +row('og:description',og['og:description'])
   +row('og:site_name',og['og:site_name'])
   +row('og:locale',og['og:locale'])
   +'</tbody></table>'
   +'<div class="result-sub"><strong>Primary image diagnostics</strong><table class="record-table"><tbody>'
   +row('Image URL',img.url)
   +row('Secure image URL',img.secure_url)
   +row('Declared type',img.type)
   +row('Declared width',img.width)
   +row('Declared height',img.height)
   +row('Image alt',img.alt)
   +row('Image check',probe?(probe.ok?'Fetched':'Could not validate'):'Not run')
   +row('Image HTTP status',probe?.status)
   +row('Image content type',probe?.content_type)
   +row('Image final URL',probe?.final_url)
   +row('Image redirects',probe?.redirect_count??0)
   +row('Detected dimensions',imageDimensions)
   +'</tbody></table></div>'
   +findings+redirects+imageRedirects+allTags;
 } else if(tool==='dnsprop'){
  const results=data.results||[], agreement=data.agreement||{};
  const yesNo=v=>v===true?'Yes':v===false?'No':'—';
  const publicAgreement=agreement.public_resolvers_agree===true?'Agree':agreement.public_resolvers_agree===false?'Disagree':'Unknown';
  const allAgreement=agreement.all_answer_sets_agree===true?'Agree':agreement.all_answer_sets_agree===false?'Disagree':'Unknown';
  const findings=(data.findings||[]).length
   ? '<div class="result-sub"><strong>Resolver findings</strong><div class="chips">'+data.findings.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>'
   : '';
  const resolverRows=results.map(r=>{
    const status=r.ok===false?'Request failed':(r.status_name||'—');
    const answers=(r.answers||[]).length?(r.answers||[]).join(' | '):'No requested-type answer';
    const ttls=(r.ttls||[]).length?(r.ttls||[]).join(' / '):'—';
    return '<tr><td>'+esc(r.resolver)+'</td><td>'+esc(status)+'</td><td>'+esc(yesNo(r.dnssec_authenticated))+'</td><td>'+esc((r.latency_ms??0)+' ms')+'</td><td>'+esc(ttls)+'</td><td class="record-value">'+esc(answers)+'</td></tr>';
  }).join('');
  const recordBlocks=results.map(r=>{
    const records=r.records||[];
    if(!records.length)return '';
    const rows=records.map(x=>'<tr><td>'+esc(x.type_name||x.type)+'</td><td>'+esc(x.ttl??'—')+'</td><td class="record-value">'+esc(x.data??'')+'</td></tr>').join('');
    return '<div class="result-sub"><strong>'+esc(r.resolver)+' returned records</strong><table class="record-table"><thead><tr><th>Type</th><th>TTL</th><th>Data</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }).join('');
  title.textContent='DNS resolver comparison';
  body.innerHTML='<table class="record-table"><tbody>'
   +row('Hostname',data.host)
   +row('Record type',data.type)
   +row('Google vs Cloudflare',publicAgreement)
   +row('All resolver answer sets',allAgreement)
   +row('Distinct answer sets',agreement.distinct_answer_sets??'—')
   +'</tbody></table>'
   +'<div class="result-sub"><strong>Resolver results</strong><table class="record-table"><thead><tr><th>Resolver</th><th>DNS status</th><th>DNSSEC AD</th><th>Latency</th><th>TTL (s)</th><th>Requested-type answers</th></tr></thead><tbody>'+resolverRows+'</tbody></table></div>'
   +findings+recordBlocks
   +'<div class="result-sub"><strong>Methodology</strong><p>Google and Cloudflare are queried through their public DNS-over-HTTPS JSON endpoints. The server row uses the Smart Web Utility server resolver. This is a named-resolver comparison, not a worldwide propagation percentage.</p></div>';
 } else if(tool==='headers'){
  const r=data.result, all=r.headers_all||{};
  const redirects=(r.redirects||[]).length
   ? '<div class="result-sub"><strong>Redirect path</strong><div class="chips">'+r.redirects.map(x=>'<span>'+esc(x.status+' '+x.method+' '+x.from+' → '+x.to)+'</span>').join('')+'</div></div>'
   : '';
  const duplicates=Object.entries(r.duplicate_headers||{}).length
   ? Object.entries(r.duplicate_headers).map(([k,v])=>k+' × '+v).join(', ')
   : 'None';
  const keyNames=['content-type','content-length','content-encoding','cache-control','etag','last-modified','vary','location','server','strict-transport-security','content-security-policy','access-control-allow-origin'];
  const keyRows=keyNames.filter(k=>all[k]?.length).map(k=>row(k,all[k].join(' | '))).join('');
  const rawRows=Object.entries(all).map(([k,v])=>row(k,(v||[]).join(' | '))).join('');
  title.textContent='HTTP header check';
  body.innerHTML='<table class="record-table"><tbody>'
   +row('Requested URL',r.url)
   +row('Final URL',r.final_url||r.url)
   +row('Redirects followed',r.redirect_count||0)
   +row('Requested method',String(r.requested_method||'auto').toUpperCase())
   +row('Method used',r.method_used||'HEAD')
   +row('HEAD → GET fallback',r.method_fallback?'Yes':'No')
   +row('HTTP status',r.status)
   +row('Resolved IP',r.ip)
   +row('Final response time',(r.time_ms??0)+' ms')
   +row('Total diagnostic time',(r.total_time_ms??r.time_ms??0)+' ms')
   +row('Content type',r.content_type)
   +row('Header fields received',r.header_count??0)
   +row('Unique header names',r.unique_header_count??Object.keys(all).length)
   +row('Repeated header names',duplicates)
   +'</tbody></table>'
   +(keyRows?'<div class="result-sub"><strong>Common response headers</strong><table class="record-table"><tbody>'+keyRows+'</tbody></table></div>':'')
   +redirects
   +'<div class="result-sub"><strong>All final response headers</strong>'+(rawRows?'<table class="record-table"><tbody>'+rawRows+'</tbody></table>':'<p>No response headers were returned.</p>')+'</div>';
 } else {
  title.textContent='DNS result';
  body.innerHTML='<div class="empty">No renderer is available for this diagnostic.</div>';
 }
 result.hidden=false;
}
form.addEventListener('submit',async e=>{e.preventDefault();error.hidden=true;result.hidden=true;const v=input.value.trim();if(!v){error.textContent='Enter a valid URL or domain.';error.hidden=false;return}const b=form.querySelector('button[type=submit]'),old=b.textContent;b.disabled=true;b.textContent='Checking…';try{const res=await fetch(endpoint(v),{headers:{accept:'application/json'}});const data=await res.json().catch(()=>({error:'The server returned an unreadable response (HTTP '+res.status+'). Please try again later.'}));if(!res.ok||data.error)throw new Error(data.error||'Check failed');render(data);history.replaceState(null,'','?target='+encodeURIComponent(v)+(type?'&type='+encodeURIComponent(type.value):'')+(headerMethod?'&method='+encodeURIComponent(headerMethod.value):''))}catch(err){error.textContent=err.message||'Check failed.';error.hidden=false}finally{b.disabled=false;b.textContent=old}});
copy?.addEventListener('click',async()=>{if(!body.innerText)return;await navigator.clipboard.writeText(body.innerText);copy.textContent='Copied';setTimeout(()=>copy.textContent='Copy',1200)});
const p=new URLSearchParams(location.search);if(p.get('target')){input.value=p.get('target');if(type&&p.get('type'))type.value=p.get('type');if(headerMethod&&p.get('method'))headerMethod.value=p.get('method');form.requestSubmit()}
})();