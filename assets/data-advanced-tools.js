(() => {
  'use strict';
  const mode = document.body.dataset.advancedDataTool;
  if (!mode) return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const download=(name,type,text)=>{const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)};

  if(mode==='xml-to-csv'){
    const input=document.getElementById('xmlCsvInput'), output=document.getElementById('xmlCsvOutput'), status=document.getElementById('xmlCsvStatus'), error=document.getElementById('xmlCsvError'), stats=document.getElementById('xmlCsvStats'), file=document.getElementById('xmlCsvFile');
    const setStatus=(t,k='neutral')=>{status.textContent=t;status.dataset.kind=k};
    const csvEscape=v=>{const t=v==null?'':String(v);return /[",\n\r]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};
    const scalar=node=>[...node.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE||n.nodeType===Node.CDATA_SECTION_NODE).map(n=>n.nodeValue.trim()).filter(Boolean).join(' ');
    function flatten(node,prefix='',out={}){
      [...node.attributes].forEach(a=>{out[prefix?prefix+'.@'+a.name:'@'+a.name]=a.value});
      const children=[...node.children];
      if(!children.length){out[prefix||node.nodeName]=scalar(node);return out}
      const groups={};children.forEach(ch=>(groups[ch.nodeName]??=[]).push(ch));
      Object.entries(groups).forEach(([name,nodes])=>nodes.forEach((ch,i)=>flatten(ch,(prefix?prefix+'.':'')+name+(nodes.length>1?'['+i+']':''),out)));
      const txt=scalar(node); if(txt&&prefix) out[prefix+'.#text']=txt;
      return out;
    }
    function rowsFor(root){
      const children=[...root.children]; if(!children.length)return[root];
      const counts={};children.forEach(ch=>counts[ch.nodeName]=(counts[ch.nodeName]||0)+1);
      const repeated=Object.entries(counts).sort((a,b)=>b[1]-a[1]).find(([,n])=>n>1)?.[0];
      return repeated?children.filter(ch=>ch.nodeName===repeated):children;
    }
    function convert(){
      error.hidden=true;error.textContent='';
      const raw=input.value.trim(); if(!raw){output.value='';stats.hidden=true;setStatus('Add XML');return}
      const doc=new DOMParser().parseFromString(raw,'application/xml'); const pe=doc.querySelector('parsererror');
      if(pe)throw new Error('Invalid XML: '+pe.textContent.replace(/\s+/g,' ').trim().slice(0,260));
      const rows=rowsFor(doc.documentElement).map(n=>flatten(n)); const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))];
      if(!headers.length)throw new Error('No tabular values could be extracted from this XML.');
      const csv=[headers.map(csvEscape).join(','),...rows.map(r=>headers.map(h=>csvEscape(r[h])).join(','))].join('\n');
      output.value=csv;stats.hidden=false;stats.innerHTML='<span><b>'+rows.length+'</b> data rows</span><span><b>'+headers.length+'</b> columns</span>';setStatus('Converted','success');
    }
    const fail=e=>{output.value='';stats.hidden=true;error.textContent=e?.message||String(e);error.hidden=false;setStatus('Fix input','error')};
    document.getElementById('convertXmlCsv').addEventListener('click',()=>{try{convert()}catch(e){fail(e)}});
    document.getElementById('exampleXmlCsv').addEventListener('click',()=>{input.value='<users><user id="1"><name>Ada</name><role>admin</role></user><user id="2"><name>Linus</name><role>developer</role></user></users>';try{convert()}catch(e){fail(e)}});
    document.getElementById('clearXmlCsv').addEventListener('click',()=>{input.value='';output.value='';file.value='';error.hidden=true;stats.hidden=true;setStatus('Ready');input.focus()});
    document.getElementById('copyXmlCsv').addEventListener('click',async()=>{if(!output.value)return;try{await navigator.clipboard.writeText(output.value)}catch{output.select();document.execCommand('copy')}setStatus('Copied','success')});
    document.getElementById('downloadXmlCsv').addEventListener('click',()=>{if(output.value)download('converted.csv','text/csv;charset=utf-8',output.value)});
    file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f)return;if(f.size>5*1024*1024){file.value='';fail(new Error('Please choose an XML file smaller than 5 MB.'));return}input.value=await f.text();try{convert()}catch(e){fail(e)}});
  }


  if(mode==='xml-formatter-validator'){
    const input=document.getElementById('xmlFormatInput'), output=document.getElementById('xmlFormatOutput'), status=document.getElementById('xmlFormatStatus'), error=document.getElementById('xmlFormatError'), stats=document.getElementById('xmlFormatStats'), file=document.getElementById('xmlFormatFile'), indent=document.getElementById('xmlFormatIndent');
    const serializer=new XMLSerializer();
    const setStatus=(t,k='neutral')=>{status.textContent=t;status.dataset.kind=k};
    const declaration=raw=>raw.match(/^\s*(<\?xml[\s\S]*?\?>)/i)?.[1]||'';
    function parse(raw){
      if(!raw.trim())throw new Error('Add XML to validate or format.');
      const doc=new DOMParser().parseFromString(raw,'application/xml');
      const pe=doc.querySelector('parsererror');
      if(pe){
        const detail=pe.textContent.replace(/\s+/g,' ').trim();
        const location=detail.match(/line\s+(\d+)(?:\s*(?:,|at)?\s*column\s+(\d+))?/i);
        const where=location
          ? ' at line '+location[1]+(location[2]?', column '+location[2]:'')
          : '';
        throw new Error('Invalid XML'+where+': '+detail.slice(0,320));
      }
      return doc;
    }
    function xmlSpacePreserve(el){
      return el?.nodeType===Node.ELEMENT_NODE && ((el.getAttributeNS('http://www.w3.org/XML/1998/namespace','space')||el.getAttribute('xml:space'))==='preserve');
    }
    function prettyElement(el,depth,unit){
      const children=[...el.childNodes];
      const serialized=serializer.serializeToString(el);
      if(!children.length||xmlSpacePreserve(el))return unit.repeat(depth)+serialized;
      const meaningfulText=children.some(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim()!=='');
      if(meaningfulText)return unit.repeat(depth)+serialized;
      const shallow=serializer.serializeToString(el.cloneNode(false));
      const open=shallow.endsWith('/>')?shallow.slice(0,-2)+'>':shallow.replace(/><\/[^>]+>$/,'>');
      const lines=[unit.repeat(depth)+open];
      children.forEach(ch=>{
        if(ch.nodeType===Node.ELEMENT_NODE)lines.push(prettyElement(ch,depth+1,unit));
        else if(ch.nodeType===Node.TEXT_NODE){if(ch.nodeValue.trim())lines.push(unit.repeat(depth+1)+esc(ch.nodeValue))}
        else lines.push(unit.repeat(depth+1)+serializer.serializeToString(ch));
      });
      lines.push(unit.repeat(depth)+'</'+el.nodeName+'>');
      return lines.join('\n');
    }
    function formatted(doc,raw){
      const unit=' '.repeat(Number(indent.value)||2), parts=[], decl=declaration(raw);
      if(decl)parts.push(decl);
      [...doc.childNodes].forEach(ch=>{
        if(ch.nodeType===Node.ELEMENT_NODE)parts.push(prettyElement(ch,0,unit));
        else if(ch.nodeType!==Node.TEXT_NODE||ch.nodeValue.trim())parts.push(serializer.serializeToString(ch));
      });
      return parts.join('\n');
    }
    function compact(doc,raw){
      const clone=doc.cloneNode(true);
      function strip(node,preserve=false){
        const keep=preserve||xmlSpacePreserve(node);
        if(!keep&&(node.nodeType===Node.DOCUMENT_NODE||node.nodeType===Node.ELEMENT_NODE)){
          const kids=[...node.childNodes];
          const meaningful=kids.some(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim()!=='');
          if(!meaningful)kids.filter(n=>n.nodeType===Node.TEXT_NODE&&!n.nodeValue.trim()).forEach(n=>node.removeChild(n));
          [...node.childNodes].forEach(ch=>strip(ch,keep));
        }
      }
      strip(clone,false);
      const decl=declaration(raw), body=serializer.serializeToString(clone);
      return decl?(decl+body.replace(/^\s*<\?xml[\s\S]*?\?>/i,'')):body;
    }
    function metrics(doc){
      let elements=0,attributes=0,maxDepth=0;
      function walk(el,depth){elements++;attributes+=el.attributes.length;maxDepth=Math.max(maxDepth,depth);[...el.children].forEach(ch=>walk(ch,depth+1))}
      if(doc.documentElement)walk(doc.documentElement,1);
      stats.hidden=false;stats.innerHTML='<span><b>'+elements+'</b> elements</span><span><b>'+attributes+'</b> attributes</span><span><b>'+maxDepth+'</b> max depth</span>';
    }
    function run(kind){
      error.hidden=true;error.textContent='';
      const raw=input.value, doc=parse(raw);metrics(doc);
      if(kind==='validate'){output.value='';setStatus('Valid XML','success');return}
      output.value=kind==='minify'?compact(doc,raw):formatted(doc,raw);
      setStatus(kind==='minify'?'Minified':'Formatted','success');
    }
    const fail=e=>{output.value='';stats.hidden=true;error.textContent=e?.message||String(e);error.hidden=false;setStatus('Fix XML','error')};
    document.getElementById('formatXml').addEventListener('click',()=>{try{run('format')}catch(e){fail(e)}});
    document.getElementById('validateXml').addEventListener('click',()=>{try{run('validate')}catch(e){fail(e)}});
    document.getElementById('minifyXml').addEventListener('click',()=>{try{run('minify')}catch(e){fail(e)}});
    document.getElementById('exampleXmlFormat').addEventListener('click',()=>{input.value='<?xml version="1.0" encoding="UTF-8"?><catalog><item id="1"><name>Monitor</name><price currency="USD">199.00</price></item><item id="2"><name>Keyboard</name><price currency="USD">89.00</price></item></catalog>';try{run('format')}catch(e){fail(e)}});
    document.getElementById('clearXmlFormat').addEventListener('click',()=>{input.value='';output.value='';file.value='';error.hidden=true;stats.hidden=true;setStatus('Ready');input.focus()});
    document.getElementById('copyXmlFormat').addEventListener('click',async()=>{if(!output.value)return;try{await navigator.clipboard.writeText(output.value)}catch{output.select();document.execCommand('copy')}setStatus('Copied','success')});
    document.getElementById('downloadXmlFormat').addEventListener('click',()=>{if(output.value)download('formatted.xml','application/xml;charset=utf-8',output.value)});
    file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f)return;if(f.size>5*1024*1024){file.value='';fail(new Error('Please choose an XML file smaller than 5 MB.'));return}input.value=await f.text();try{run('format')}catch(e){fail(e)}});
    input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();try{run('format')}catch(err){fail(err)}}});
  }

  if(mode==='json-diff'){
    const left=document.getElementById('jsonDiffLeft'), right=document.getElementById('jsonDiffRight'), result=document.getElementById('jsonDiffResult'), status=document.getElementById('jsonDiffStatus'), error=document.getElementById('jsonDiffError'), stats=document.getElementById('jsonDiffStats'), ignore=document.getElementById('jsonDiffIgnoreOrder');
    const setStatus=(t,k='neutral')=>{status.textContent=t;status.dataset.kind=k};
    function stable(v){if(Array.isArray(v)){const a=v.map(stable);return ignore.checked?a.sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y))):a}if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v}
    const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
    const repr=v=>v===undefined?'—':typeof v==='string'?v:JSON.stringify(v);
    function walk(a,b,path='$',rows=[]){
      if(same(a,b))return rows;
      const ao=a&&typeof a==='object', bo=b&&typeof b==='object';
      if(ao&&bo&&!Array.isArray(a)&&!Array.isArray(b)){[...new Set([...Object.keys(a),...Object.keys(b)])].sort().forEach(k=>walk(a[k],b[k],path+'.'+k,rows));return rows}
      if(Array.isArray(a)&&Array.isArray(b)&&!ignore.checked){for(let i=0;i<Math.max(a.length,b.length);i++)walk(a[i],b[i],path+'['+i+']',rows);return rows}
      rows.push({path,kind:a===undefined?'added':b===undefined?'removed':'changed',left:a,right:b});return rows;
    }
    function compare(){
      error.hidden=true;error.textContent='';
      let a,b;try{a=JSON.parse(left.value)}catch(e){throw new Error('Left JSON is invalid: '+e.message)}try{b=JSON.parse(right.value)}catch(e){throw new Error('Right JSON is invalid: '+e.message)}
      const rows=walk(a,b);
      if(!rows.length){result.innerHTML='<div class="json-diff-equal">No semantic differences found.</div>';stats.hidden=false;stats.innerHTML='<span><b>0</b> differences</span>';setStatus('Equal','success');return}
      result.innerHTML='<table class="json-diff-table"><thead><tr><th>Path</th><th>Status</th><th>Left</th><th>Right</th></tr></thead><tbody>'+rows.map(r=>'<tr data-kind="'+r.kind+'"><td><code>'+esc(r.path)+'</code></td><td><span class="diff-badge">'+r.kind+'</span></td><td><pre>'+esc(repr(r.left))+'</pre></td><td><pre>'+esc(repr(r.right))+'</pre></td></tr>').join('')+'</tbody></table>';
      const c=rows.reduce((m,r)=>(m[r.kind]=(m[r.kind]||0)+1,m),{});stats.hidden=false;stats.innerHTML='<span><b>'+rows.length+'</b> differences</span><span><b>'+(c.added||0)+'</b> added</span><span><b>'+(c.removed||0)+'</b> removed</span><span><b>'+(c.changed||0)+'</b> changed</span>';setStatus('Compared','success');
    }
    const fail=e=>{result.innerHTML='';stats.hidden=true;error.textContent=e?.message||String(e);error.hidden=false;setStatus('Fix JSON','error')};
    document.getElementById('compareJson').addEventListener('click',()=>{try{compare()}catch(e){fail(e)}});
    document.getElementById('exampleJsonDiff').addEventListener('click',()=>{left.value='{"service":"api","port":8080,"regions":["us","eu"],"debug":false}';right.value='{"service":"api","port":8443,"regions":["us","apac"],"enabled":true}';try{compare()}catch(e){fail(e)}});
    document.getElementById('clearJsonDiff').addEventListener('click',()=>{left.value='';right.value='';result.innerHTML='';error.hidden=true;stats.hidden=true;setStatus('Ready');left.focus()});
    ignore.addEventListener('change',()=>{if(left.value.trim()&&right.value.trim()){try{compare()}catch(e){fail(e)}}});
  }
})();