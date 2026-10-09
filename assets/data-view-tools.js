(() => {
  'use strict';

  const mode = document.body.dataset.viewToolMode;
  if (!mode) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function readLocalFile(input, maxBytes = 5 * 1024 * 1024) {
    const file = input.files && input.files[0];
    if (!file) return Promise.resolve(null);
    if (file.size > maxBytes) throw new Error('Please choose a file smaller than 5 MB.');
    return file.text();
  }

  if (mode === 'csv-viewer') {
    const input = document.getElementById('csvInput');
    const file = document.getElementById('csvFile');
    const delimiterSelect = document.getElementById('csvDelimiter');
    const hasHeader = document.getElementById('csvHeader');
    const viewBtn = document.getElementById('viewCsv');
    const exampleBtn = document.getElementById('exampleCsv');
    const clearBtn = document.getElementById('clearCsv');
    const filter = document.getElementById('csvFilter');
    const tableWrap = document.getElementById('csvTableWrap');
    const table = document.getElementById('csvTable');
    const status = document.getElementById('csvStatus');
    const error = document.getElementById('csvError');
    const stats = document.getElementById('csvStats');
    let model = {headers:[], rows:[]};
    let sort = {column:-1, direction:1};

    function setStatus(text, kind='neutral') {
      status.textContent = text;
      status.dataset.kind = kind;
    }
    function fail(message) {
      error.textContent = message;
      error.hidden = false;
      tableWrap.hidden = true;
      stats.hidden = true;
      setStatus('Fix input', 'error');
    }
    function resetError() {
      error.hidden = true;
      error.textContent = '';
    }
    function detectDelimiter(text) {
      const sample = text.split(/\r?\n/).slice(0,6).join('\n');
      const candidates = [',','\t',';','|'];
      const score = Object.fromEntries(candidates.map(d => [d,0]));
      let quoted = false;
      for (let i=0;i<sample.length;i++) {
        const ch = sample[i];
        if (ch === '"') {
          if (quoted && sample[i+1] === '"') { i++; continue; }
          quoted = !quoted;
          continue;
        }
        if (!quoted && candidates.includes(ch)) score[ch]++;
      }
      return candidates.sort((a,b) => score[b]-score[a])[0] || ',';
    }
    function parseDelimited(text, delimiter) {
      const rows = [];
      let row = [];
      let field = '';
      let quoted = false;
      for (let i=0;i<text.length;i++) {
        const ch = text[i];
        if (ch === '"') {
          if (quoted && text[i+1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = !quoted;
          }
        } else if (!quoted && ch === delimiter) {
          row.push(field);
          field = '';
        } else if (!quoted && (ch === '\n' || ch === '\r')) {
          if (ch === '\r' && text[i+1] === '\n') i++;
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
        } else {
          field += ch;
        }
      }
      if (quoted) throw new Error('Unclosed quoted field in CSV input.');
      if (field.length || row.length) {
        row.push(field);
        rows.push(row);
      }
      return rows.filter(r => !(r.length === 1 && r[0] === ''));
    }
    function normalize() {
      resetError();
      const raw = input.value;
      if (!raw.trim()) {
        model = {headers:[],rows:[]};
        tableWrap.hidden = true;
        stats.hidden = true;
        setStatus('Add CSV', 'neutral');
        return false;
      }
      const selected = delimiterSelect.value;
      const chosen = selected === 'auto' ? detectDelimiter(raw) : (selected === '\\t' ? '\t' : selected);
      const rows = parseDelimited(raw, chosen);
      if (!rows.length) throw new Error('No CSV rows found.');
      const width = Math.max(...rows.map(r => r.length));
      const normalized = rows.map(r => [...r, ...Array(Math.max(0,width-r.length)).fill('')]);
      let headers;
      let dataRows;
      if (hasHeader.checked) {
        headers = normalized[0].map((v,i) => v.trim() || ('Column ' + (i+1)));
        dataRows = normalized.slice(1);
      } else {
        headers = Array.from({length:width}, (_,i) => 'Column ' + (i+1));
        dataRows = normalized;
      }
      model = {headers,rows:dataRows};
      sort = {column:-1,direction:1};
      filter.value = '';
      filter.disabled = false;
      setStatus('Loaded', 'success');
      render();
      return true;
    }
    function comparable(value) {
      const trimmed = String(value).trim();
      if (trimmed !== '' && Number.isFinite(Number(trimmed))) return Number(trimmed);
      return trimmed.toLocaleLowerCase();
    }
    function getVisibleRows() {
      const q = filter.value.trim().toLocaleLowerCase();
      let rows = model.rows.map((row,index) => ({row,index}));
      if (q) rows = rows.filter(item => item.row.some(cell => String(cell).toLocaleLowerCase().includes(q)));
      if (sort.column >= 0) {
        rows.sort((a,b) => {
          const av = comparable(a.row[sort.column]);
          const bv = comparable(b.row[sort.column]);
          if (typeof av === 'number' && typeof bv === 'number') return (av-bv) * sort.direction;
          return String(av).localeCompare(String(bv), undefined, {numeric:true,sensitivity:'base'}) * sort.direction;
        });
      }
      return rows;
    }
    function render() {
      const rows = getVisibleRows();
      table.innerHTML =
        '<thead><tr>' + model.headers.map((h,i) =>
          '<th scope="col"><button type="button" class="csv-sort" data-col="'+i+'" aria-label="Sort by '+escapeHtml(h)+'">'+escapeHtml(h)+(sort.column===i?(sort.direction===1?' ▲':' ▼'):'')+'</button></th>'
        ).join('') + '</tr></thead>' +
        '<tbody>' + rows.map(item => '<tr>' + item.row.map(cell => '<td>'+escapeHtml(cell)+'</td>').join('') + '</tr>').join('') + '</tbody>';
      tableWrap.hidden = false;
      stats.hidden = false;
      stats.innerHTML = '<span><b>'+rows.length.toLocaleString()+'</b> visible rows</span><span><b>'+model.rows.length.toLocaleString()+'</b> total rows</span><span><b>'+model.headers.length.toLocaleString()+'</b> columns</span>';
      table.querySelectorAll('.csv-sort').forEach(btn => btn.addEventListener('click', () => {
        const col = Number(btn.dataset.col);
        if (sort.column === col) sort.direction *= -1;
        else sort = {column:col,direction:1};
        render();
      }));
    }

    viewBtn.addEventListener('click', () => {
      try { normalize(); } catch (e) { fail(e.message || String(e)); }
    });
    exampleBtn.addEventListener('click', () => {
      input.value = 'name,role,active\nAda,admin,true\nLinus,developer,true\nGrace,architect,false';
      delimiterSelect.value = 'auto';
      hasHeader.checked = true;
      try { normalize(); } catch (e) { fail(e.message || String(e)); }
    });
    clearBtn.addEventListener('click', () => {
      input.value = '';
      file.value = '';
      filter.value = '';
      filter.disabled = true;
      table.innerHTML = '';
      tableWrap.hidden = true;
      stats.hidden = true;
      resetError();
      setStatus('Ready', 'neutral');
      input.focus();
    });
    filter.addEventListener('input', () => model.headers.length && render());
    delimiterSelect.addEventListener('change', () => { if (input.value.trim()) { try { normalize(); } catch(e) { fail(e.message || String(e)); } } });
    hasHeader.addEventListener('change', () => { if (input.value.trim()) { try { normalize(); } catch(e) { fail(e.message || String(e)); } } });
    file.addEventListener('change', async () => {
      try {
        const text = await readLocalFile(file);
        if (text == null) return;
        input.value = text;
        normalize();
      } catch (e) {
        file.value = '';
        fail(e.message || String(e));
      }
    });
    input.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        try { normalize(); } catch (e) { fail(e.message || String(e)); }
      }
    });
  }

  if (mode === 'yaml-formatter') {
    const input = document.getElementById('yamlInput');
    const output = document.getElementById('yamlOutput');
    const file = document.getElementById('yamlFile');
    const indent = document.getElementById('yamlIndent');
    const status = document.getElementById('yamlStatus');
    const error = document.getElementById('yamlError');
    const stats = document.getElementById('yamlStats');

    function setStatus(text, kind='neutral') {
      status.textContent = text;
      status.dataset.kind = kind;
    }
    function fail(message) {
      output.value = '';
      stats.hidden = true;
      error.textContent = message;
      error.hidden = false;
      setStatus('Invalid YAML', 'error');
    }
    function format() {
      error.hidden = true;
      error.textContent = '';
      const raw = input.value.trim();
      if (!raw) {
        output.value = '';
        stats.hidden = true;
        setStatus('Add YAML', 'neutral');
        return;
      }
      if (!window.jsyaml || typeof window.jsyaml.loadAll !== 'function' || typeof window.jsyaml.dump !== 'function') {
        throw new Error('YAML parser failed to load. Refresh the page and try again.');
      }

      const documents = [];
      window.jsyaml.loadAll(raw, document => documents.push(document));
      if (!documents.length) {
        throw new Error('No YAML document was found.');
      }

      const dumpOptions = {
        indent:Number(indent.value) || 2,
        noRefs:true,
        lineWidth:-1,
        sortKeys:false
      };
      const rendered = documents.map(document =>
        window.jsyaml.dump(document === undefined ? null : document, dumpOptions)
      );
      const result = documents.length === 1
        ? rendered[0]
        : rendered.map(document => '---\n' + document).join('');

      output.value = result;
      stats.hidden = false;
      stats.innerHTML =
        '<span><b>'+documents.length.toLocaleString()+'</b> document'+(documents.length === 1 ? '' : 's')+'</span>' +
        '<span><b>'+result.length.toLocaleString()+'</b> characters</span>' +
        '<span><b>'+result.split(/\r?\n/).length.toLocaleString()+'</b> lines</span>';
      setStatus(documents.length === 1 ? 'Valid · formatted' : 'Valid · formatted stream', 'success');
    }

    document.getElementById('formatYaml').addEventListener('click', () => {
      try { format(); } catch(e) { fail(e.message || String(e)); }
    });
    document.getElementById('exampleYaml').addEventListener('click', () => {
      input.value = 'service:\n  name: api\n  port: 8080\n  enabled: true\nregions:\n  - us-east\n  - eu-west';
      try { format(); } catch(e) { fail(e.message || String(e)); }
    });
    document.getElementById('clearYaml').addEventListener('click', () => {
      input.value = '';
      output.value = '';
      file.value = '';
      error.hidden = true;
      stats.hidden = true;
      setStatus('Ready', 'neutral');
      input.focus();
    });
    document.getElementById('copyYaml').addEventListener('click', async () => {
      if (!output.value) return;
      try { await navigator.clipboard.writeText(output.value); }
      catch { output.select(); document.execCommand('copy'); }
      setStatus('Copied', 'success');
    });
    document.getElementById('downloadYaml').addEventListener('click', () => {
      if (!output.value) return;
      const url = URL.createObjectURL(new Blob([output.value], {type:'text/yaml;charset=utf-8'}));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formatted.yaml';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    indent.addEventListener('change', () => {
      if (!input.value.trim()) return;
      try { format(); } catch(e) { fail(e.message || String(e)); }
    });
    file.addEventListener('change', async () => {
      try {
        const text = await readLocalFile(file);
        if (text == null) return;
        input.value = text;
        format();
      } catch(e) {
        file.value = '';
        fail(e.message || String(e));
      }
    });
    input.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        try { format(); } catch(e) { fail(e.message || String(e)); }
      }
    });
  }
})();