(() => {
  'use strict';

  const mode = document.body.dataset.fileConverter;
  if (!mode) return;

  const $ = id => document.getElementById(id);
  const MAX_FILE_BYTES = 5 * 1024 * 1024;

  function setText(el, value) { if (el) el.textContent = value; }
  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }
  function clearError(el) {
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          quoted = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { quoted = true; i++; continue; }
      if (ch === delimiter) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
        i++; continue;
      }
      field += ch; i++;
    }
    if (quoted) throw new Error('Unclosed quoted field detected.');
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function parseWhitespace(text) {
    return text.split(/\r?\n/).filter(line => line.length).map(line => {
      const fields = [];
      let field = '';
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quoted) {
          if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; continue; }
          if (ch === '"') { quoted = false; continue; }
          field += ch; continue;
        }
        if (ch === '"') { quoted = true; continue; }
        if (/\s/.test(ch)) {
          if (field !== '') { fields.push(field); field = ''; }
          while (i + 1 < line.length && /\s/.test(line[i + 1])) i++;
          continue;
        }
        field += ch;
      }
      if (quoted) throw new Error('Unclosed quoted field detected.');
      if (field !== '' || !fields.length) fields.push(field);
      return fields;
    });
  }

  function delimiterLabel(delimiter) {
    if (delimiter === '\t') return 'tab';
    if (delimiter === ' ') return 'whitespace';
    if (delimiter === ',') return 'comma';
    if (delimiter === ';') return 'semicolon';
    if (delimiter === '|') return 'pipe';
    return 'delimiter';
  }

  function autoDetectDelimiter(text) {
    const sample = text.split(/\r?\n/).filter(Boolean).slice(0, 20);
    if (sample.length < 2) throw new Error('Auto-detection needs at least two non-empty lines. Choose the delimiter manually.');
    const candidates = ['\t', ',', ';', '|'];
    let best = null;
    for (const delimiter of candidates) {
      const counts = sample.map(line => {
        let count = 0, quoted = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (quoted && line[i + 1] === '"') { i++; continue; }
            quoted = !quoted; continue;
          }
          if (!quoted && ch === delimiter) count++;
        }
        return count;
      });
      const positive = counts.filter(n => n > 0);
      if (!positive.length) continue;
      const freq = new Map();
      positive.forEach(n => freq.set(n, (freq.get(n) || 0) + 1));
      const [sepCount, consistent] = [...freq.entries()].sort((a,b)=>b[1]-a[1] || b[0]-a[0])[0];
      const score = (consistent / sample.length) * 100 + Math.min(sepCount, 20);
      if (!best || score > best.score) best = {delimiter, score};
    }
    if (best && best.score >= 70) return best.delimiter;

    const whitespaceCounts = sample.map(line => line.trim().split(/\s+/).length);
    const freq = new Map();
    whitespaceCounts.filter(n=>n>1).forEach(n=>freq.set(n,(freq.get(n)||0)+1));
    if (freq.size) {
      const [cols, consistent] = [...freq.entries()].sort((a,b)=>b[1]-a[1])[0];
      if (consistent / sample.length >= 0.8 && cols > 1) return ' ';
    }
    throw new Error('Could not reliably detect a delimiter. Choose Tab, Comma, Semicolon, Pipe or Whitespace manually.');
  }

  function quoteField(value, delimiter) {
    const text = String(value ?? '');
    const mustQuote = text.includes('"') || text.includes('\n') || text.includes('\r') ||
      text.includes(delimiter) || /^\s|\s$/.test(text);
    return mustQuote ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function rowsToDelimited(rows, delimiter) {
    return rows.map(row => row.map(value => quoteField(value, delimiter)).join(delimiter)).join('\n');
  }

  function normalizeRows(rows, trim) {
    const clean = rows.filter(row => row.some(cell => String(cell).length));
    if (!trim) return clean;
    return clean.map(row => row.map(cell => String(cell).trim()));
  }

  if (mode === 'txt-csv') {
    const input = $('txtCsvInput');
    const output = $('txtCsvOutput');
    const direction = $('txtCsvDirection');
    const sourceDelimiter = $('txtSourceDelimiter');
    const targetDelimiter = $('txtTargetDelimiter');
    const sourceWrap = $('txtSourceDelimiterWrap');
    const targetWrap = $('txtTargetDelimiterWrap');
    const trim = $('txtTrimFields');
    const status = $('txtCsvStatus');
    const error = $('txtCsvError');
    const stats = $('txtCsvStats');
    const fileInput = $('txtCsvFile');

    const delimiterFromValue = value => ({
      tab:'\t', comma:',', semicolon:';', pipe:'|', space:' '
    })[value] || value;

    function syncDirection() {
      const toCsv = direction.value === 'txt-to-csv';
      sourceWrap.hidden = !toCsv;
      targetWrap.hidden = toCsv;
      input.placeholder = toCsv
        ? 'name\tage\tcity\nAda\t37\tLondon\nLinus\t56\tHelsinki'
        : 'name,age,city\nAda,37,London\nLinus,56,Helsinki';
      output.placeholder = toCsv ? 'CSV output will appear here' : 'Text output will appear here';
      setText(status, 'Ready');
    }

    function convert() {
      clearError(error);
      const raw = input.value;
      if (!raw.trim()) { output.value=''; stats.hidden=true; setText(status,'Add input'); return; }
      try {
        let rows, outDelimiter, detected = '';
        if (direction.value === 'txt-to-csv') {
          let delimiter = sourceDelimiter.value === 'auto' ? autoDetectDelimiter(raw) : delimiterFromValue(sourceDelimiter.value);
          rows = delimiter === ' ' ? parseWhitespace(raw) : parseDelimited(raw, delimiter);
          rows = normalizeRows(rows, trim.checked);
          outDelimiter = ',';
          detected = ' · source: ' + delimiterLabel(delimiter);
        } else {
          rows = normalizeRows(parseDelimited(raw, ','), trim.checked);
          outDelimiter = delimiterFromValue(targetDelimiter.value);
        }
        if (!rows.length) throw new Error('No data rows were found.');
        const widths = rows.map(row => row.length);
        const minCols = Math.min(...widths), maxCols = Math.max(...widths);
        output.value = rowsToDelimited(rows, outDelimiter);
        stats.hidden = false;
        stats.innerHTML = '<span><b>'+rows.length.toLocaleString()+'</b> rows</span><span><b>'+maxCols.toLocaleString()+'</b> max columns</span><span><b>'+output.value.length.toLocaleString()+'</b> characters</span>';
        if (minCols !== maxCols) {
          setText(status, 'Converted with uneven rows' + detected);
          showError(error, 'Rows contain different column counts ('+minCols+'–'+maxCols+'). Review the preview before using the file.');
        } else {
          setText(status, 'Converted' + detected);
        }
      } catch (e) {
        output.value=''; stats.hidden=true;
        showError(error, e && e.message ? e.message : String(e));
        setText(status, 'Fix input');
      }
    }

    $('txtCsvConvert')?.addEventListener('click', convert);
    direction?.addEventListener('change', syncDirection);
    $('txtCsvExample')?.addEventListener('click', () => {
      if (direction.value === 'txt-to-csv') {
        sourceDelimiter.value='tab';
        input.value='name\tage\tcity\nAda\t37\tLondon\nLinus\t56\tHelsinki';
      } else {
        targetDelimiter.value='tab';
        input.value='name,age,city\nAda,37,London\nLinus,56,Helsinki';
      }
      convert();
    });
    $('txtCsvClear')?.addEventListener('click', () => {
      input.value=''; output.value=''; clearError(error); stats.hidden=true; setText(status,'Ready'); input.focus();
    });
    $('txtCsvCopy')?.addEventListener('click', async () => {
      if (!output.value) return;
      try { await navigator.clipboard.writeText(output.value); } catch { output.select(); document.execCommand('copy'); }
      setText(status,'Copied');
    });
    $('txtCsvDownload')?.addEventListener('click', () => {
      if (!output.value) return;
      const toCsv = direction.value === 'txt-to-csv';
      const blob = new Blob([output.value], {type: toCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=toCsv?'converted.csv':'converted.txt';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    fileInput?.addEventListener('change', async () => {
      const file=fileInput.files && fileInput.files[0]; if(!file) return;
      if(file.size>MAX_FILE_BYTES){ showError(error,'Please choose a file smaller than 5 MB.'); fileInput.value=''; return; }
      input.value=await file.text();
      if (/\.csv$/i.test(file.name)) direction.value='csv-to-txt';
      else if (/\.txt$/i.test(file.name)) direction.value='txt-to-csv';
      syncDirection(); convert();
    });
    input?.addEventListener('keydown', e => {
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();convert();}
    });
    syncDirection();
  }

  if (mode === 'xml-excel') {
    const input=$('xmlExcelInput');
    const output=$('xmlExcelOutput');
    const status=$('xmlExcelStatus');
    const error=$('xmlExcelError');
    const stats=$('xmlExcelStats');
    const fileInput=$('xmlExcelFile');
    const inferTypes=$('xmlInferTypes');
    const download=$('downloadXlsxBtn');
    let currentRows=null, currentHeaders=null, recordLabel='record';

    function scalar(text) {
      const value=String(text ?? '').trim();
      if (!inferTypes.checked) return value;
      if (/^(true|false)$/i.test(value)) return value.toLowerCase()==='true';
      if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && !/^0\d+/.test(value)) return Number(value);
      return value;
    }

    function elementObject(node) {
      const obj={};
      [...node.attributes].forEach(a=>{obj['@'+a.name]=a.value;});
      const groups=new Map();
      [...node.children].forEach(ch=>{
        if(!groups.has(ch.nodeName)) groups.set(ch.nodeName,[]);
        groups.get(ch.nodeName).push(ch);
      });
      for(const [name,nodes] of groups){
        const vals=nodes.map(n=>n.children.length ? elementObject(n) : scalar(n.textContent));
        obj[name]=vals.length===1?vals[0]:vals;
      }
      const directText=[...node.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE||n.nodeType===Node.CDATA_SECTION_NODE).map(n=>n.nodeValue.trim()).filter(Boolean).join(' ');
      if(directText) obj['#text']=scalar(directText);
      return obj;
    }

    function flatten(node, prefix='', out={}) {
      [...node.attributes].forEach(a=>{out[(prefix?prefix+'.':'')+'@'+a.name]=scalar(a.value);});
      const groups=new Map();
      [...node.children].forEach(ch=>{
        if(!groups.has(ch.nodeName)) groups.set(ch.nodeName,[]);
        groups.get(ch.nodeName).push(ch);
      });
      for(const [name,nodes] of groups){
        const key=prefix?prefix+'.'+name:name;
        const allLeaves=nodes.every(n=>n.children.length===0);
        if(allLeaves){
          const values=nodes.map(n=>scalar(n.textContent));
          out[key]=values.length===1?values[0]:values.join(' | ');
        } else if(nodes.length===1){
          flatten(nodes[0],key,out);
        } else {
          out[key]=JSON.stringify(nodes.map(elementObject));
        }
      }
      if(!node.children.length && !node.attributes.length) out[prefix||'value']=scalar(node.textContent);
      return out;
    }

    function findRecordNodes(root) {
      let best=null;
      function walk(parent, depth) {
        const groups=new Map();
        [...parent.children].forEach(ch=>{
          if(!groups.has(ch.nodeName)) groups.set(ch.nodeName,[]);
          groups.get(ch.nodeName).push(ch);
        });
        for(const [name,nodes] of groups){
          if(nodes.length<2) continue;
          const complex=nodes.filter(n=>n.children.length>0).length;
          if(!complex) continue;
          const score=nodes.length*100 + complex*10 - depth;
          if(!best || score>best.score) best={nodes,name,score};
        }
        [...parent.children].forEach(ch=>walk(ch,depth+1));
      }
      walk(root,0);
      return best || {nodes:[root],name:root.nodeName,score:0};
    }

    function convert() {
      clearError(error);
      download.disabled=true;
      const raw=input.value.trim();
      if(!raw){output.value='';stats.hidden=true;setText(status,'Add XML');return;}
      try{
        const doc=new DOMParser().parseFromString(raw,'application/xml');
        const parserError=doc.querySelector('parsererror');
        if(parserError) throw new Error('Invalid XML: '+parserError.textContent.replace(/\s+/g,' ').trim().slice(0,260));
        if(!doc.documentElement) throw new Error('No XML root element found.');
        const picked=findRecordNodes(doc.documentElement);
        recordLabel=picked.name;
        currentRows=picked.nodes.map(n=>flatten(n));
        currentHeaders=[];
        const seen=new Set();
        currentRows.forEach(row=>Object.keys(row).forEach(k=>{if(!seen.has(k)){seen.add(k);currentHeaders.push(k);}}));
        if(!currentHeaders.length) currentHeaders=['value'];
        const preview=[currentHeaders.join('\t')];
        currentRows.slice(0,50).forEach(row=>preview.push(currentHeaders.map(h=>String(row[h]??'')).join('\t')));
        output.value=preview.join('\n');
        stats.hidden=false;
        stats.innerHTML='<span><b>'+currentRows.length.toLocaleString()+'</b> rows</span><span><b>'+currentHeaders.length.toLocaleString()+'</b> columns</span><span>record: <b>&lt;'+recordLabel+'&gt;</b></span>';
        setText(status,currentRows.length>50?'Previewing first 50 rows':'Ready to download .xlsx');
        download.disabled=false;
      }catch(e){
        currentRows=null;currentHeaders=null;output.value='';stats.hidden=true;
        showError(error,e&&e.message?e.message:String(e));setText(status,'Fix XML');
      }
    }

    $('xmlExcelConvert')?.addEventListener('click',convert);
    $('xmlExcelExample')?.addEventListener('click',()=>{
      input.value='<catalog><product sku="A-100"><name>Keyboard</name><price>79.99</price><stock>true</stock></product><product sku="B-200"><name>Mouse</name><price>39.50</price><stock>false</stock></product></catalog>';
      convert();
    });
    $('xmlExcelClear')?.addEventListener('click',()=>{
      input.value='';output.value='';currentRows=null;currentHeaders=null;clearError(error);stats.hidden=true;download.disabled=true;setText(status,'Ready');input.focus();
    });
    fileInput?.addEventListener('change',async()=>{
      const file=fileInput.files&&fileInput.files[0];if(!file)return;
      if(file.size>MAX_FILE_BYTES){showError(error,'Please choose an XML file smaller than 5 MB.');fileInput.value='';return;}
      input.value=await file.text();convert();
    });
    input?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();convert();}});
    download?.addEventListener('click',()=>{
      clearError(error);
      if(!currentRows||!currentHeaders) return;
      if(!window.XLSX){
        showError(error,'Spreadsheet export library did not load. Check your network connection and reload the page.');
        setText(status,'XLSX library unavailable');
        return;
      }
      const ws=window.XLSX.utils.json_to_sheet(currentRows,{header:currentHeaders});
      ws['!cols']=currentHeaders.map(header=>{
        let max=String(header).length;
        currentRows.slice(0,200).forEach(row=>{max=Math.max(max,String(row[header]??'').length);});
        return {wch:Math.min(Math.max(max+2,10),40)};
      });
      const wb=window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb,ws,'Converted Data');
      window.XLSX.writeFile(wb,'xml-to-excel.xlsx',{compression:true});
      setText(status,'Downloaded .xlsx');
    });
  }
})();