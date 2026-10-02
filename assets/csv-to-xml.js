(() => {
  'use strict';
  if (!document.body.hasAttribute('data-csv-xml-tool')) return;

  const input = document.getElementById('csvXmlInput');
  const output = document.getElementById('csvXmlOutput');
  const file = document.getElementById('csvXmlFile');
  const delimiterSelect = document.getElementById('csvXmlDelimiter');
  const hasHeader = document.getElementById('csvXmlHeader');
  const rootInput = document.getElementById('csvXmlRoot');
  const rowInput = document.getElementById('csvXmlRow');
  const status = document.getElementById('csvXmlStatus');
  const error = document.getElementById('csvXmlError');
  const stats = document.getElementById('csvXmlStats');
  const warnings = document.getElementById('csvXmlWarnings');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const validXmlName = name => /^[A-Za-z_][A-Za-z0-9._-]*$/.test(name);

  const escapeText = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const escapeAttr = value => escapeText(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  function detectDelimiter(text) {
    const sample = text.replace(/^\uFEFF/, '').slice(0, 20000);
    const candidates = [',', '\t', ';', '|'];
    const scores = Object.fromEntries(candidates.map(d => [d, 0]));
    let quoted = false;

    for (let i = 0; i < sample.length; i++) {
      const ch = sample[i];
      if (ch === '"') {
        if (quoted && sample[i + 1] === '"') {
          i++;
          continue;
        }
        quoted = !quoted;
        continue;
      }
      if (!quoted && candidates.includes(ch)) scores[ch]++;
    }

    const best = candidates.sort((a, b) => scores[b] - scores[a])[0];
    return scores[best] > 0 ? best : ',';
  }

  function parseDelimited(text, delimiter) {
    text = text.replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    let fieldStarted = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === '"') {
        if (fieldStarted && field.length) {
          throw new Error('Unexpected quote inside an unquoted CSV field.');
        }
        quoted = true;
        fieldStarted = true;
        continue;
      }

      if (ch === delimiter) {
        row.push(field);
        field = '';
        fieldStarted = false;
        continue;
      }

      if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        fieldStarted = false;
        continue;
      }

      field += ch;
      fieldStarted = true;
    }

    if (quoted) throw new Error('Unclosed quoted field in CSV input.');
    if (field.length || row.length || fieldStarted) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter(r => !(r.length === 1 && r[0] === ''));
  }

  function normalizeRows(rows) {
    const width = Math.max(...rows.map(r => r.length));
    return {
      width,
      rows: rows.map(r => [...r, ...Array(Math.max(0, width - r.length)).fill('')])
    };
  }

  function elementForHeader(header, value, index) {
    const safeHeader = String(header ?? '').trim();
    const text = escapeText(value);
    if (safeHeader && validXmlName(safeHeader)) {
      return '    <' + safeHeader + '>' + text + '</' + safeHeader + '>';
    }
    if (safeHeader) {
      return '    <field name="' + escapeAttr(safeHeader) + '">' + text + '</field>';
    }
    return '    <field column="' + (index + 1) + '">' + text + '</field>';
  }

  function convert() {
    error.hidden = true;
    error.textContent = '';
    warnings.hidden = true;
    warnings.innerHTML = '';

    const raw = input.value;
    if (!raw.trim()) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add CSV');
      return;
    }

    const rootName = rootInput.value.trim();
    const rowName = rowInput.value.trim();
    if (!validXmlName(rootName)) {
      throw new Error('Root element must start with a letter or underscore and use only letters, numbers, dot, underscore or hyphen.');
    }
    if (!validXmlName(rowName)) {
      throw new Error('Row element must start with a letter or underscore and use only letters, numbers, dot, underscore or hyphen.');
    }

    const selected = delimiterSelect.value;
    const delimiter = selected === 'auto' ? detectDelimiter(raw) : (selected === '\\t' ? '\t' : selected);
    const parsed = parseDelimited(raw, delimiter);
    if (!parsed.length) throw new Error('No CSV rows found.');

    const normalized = normalizeRows(parsed);
    let headers = null;
    let dataRows = normalized.rows;

    if (hasHeader.checked) {
      headers = normalized.rows[0];
      dataRows = normalized.rows.slice(1);
      if (!dataRows.length) {
        warnings.hidden = false;
        warnings.innerHTML = '<span>The CSV contains a header row but no data rows.</span>';
      }
    }

    const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<' + rootName + '>'];

    dataRows.forEach(row => {
      lines.push('  <' + rowName + '>');
      row.forEach((value, index) => {
        if (headers) {
          lines.push(elementForHeader(headers[index], value, index));
        } else {
          lines.push('    <column index="' + (index + 1) + '">' + escapeText(value) + '</column>');
        }
      });
      lines.push('  </' + rowName + '>');
    });

    lines.push('</' + rootName + '>');

    const xml = lines.join('\n');
    output.value = xml;
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + dataRows.length.toLocaleString() + '</b> data rows</span>' +
      '<span><b>' + normalized.width.toLocaleString() + '</b> columns</span>' +
      '<span><b>' + (delimiter === '\t' ? 'Tab' : delimiter) + '</b> delimiter</span>' +
      '<span><b>' + new Blob([xml]).size.toLocaleString() + '</b> output bytes</span>';
    setStatus('Converted', 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    warnings.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix CSV or XML names', 'error');
  }

  document.getElementById('convertCsvXml').addEventListener('click', () => {
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleCsvXml').addEventListener('click', () => {
    input.value = 'name,role,first name,active\n"Ada Lovelace","admin,owner",Ada,true\nLinus,developer,Linus,true';
    delimiterSelect.value = 'auto';
    hasHeader.checked = true;
    rootInput.value = 'rows';
    rowInput.value = 'row';
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearCsvXml').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    warnings.hidden = true;
    delimiterSelect.value = 'auto';
    hasHeader.checked = true;
    rootInput.value = 'rows';
    rowInput.value = 'row';
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('copyCsvXml').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadCsvXml').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type:'application/xml;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'converted.xml';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded', 'success');
  });

  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    if (chosen.size > 5 * 1024 * 1024) {
      file.value = '';
      fail(new Error('Please choose a CSV file smaller than 5 MB.'));
      return;
    }
    input.value = await chosen.text();
    try { convert(); } catch (caught) { fail(caught); }
  });

  for (const control of [delimiterSelect, hasHeader, rootInput, rowInput]) {
    control.addEventListener('change', () => {
      if (!input.value.trim()) return;
      try { convert(); } catch (caught) { fail(caught); }
    });
  }

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { convert(); } catch (caught) { fail(caught); }
    }
  });
})();