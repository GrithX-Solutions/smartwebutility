(() => {
  'use strict';
  if (!document.body.hasAttribute('data-csv-json-tool')) return;

  const input = document.getElementById('csvJsonInput');
  const output = document.getElementById('csvJsonOutput');
  const file = document.getElementById('csvJsonFile');
  const delimiterSelect = document.getElementById('csvJsonDelimiter');
  const hasHeader = document.getElementById('csvJsonHeader');
  const inferTypes = document.getElementById('csvJsonTypes');
  const status = document.getElementById('csvJsonStatus');
  const error = document.getElementById('csvJsonError');
  const stats = document.getElementById('csvJsonStats');
  const warnings = document.getElementById('csvJsonWarnings');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

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

  function uniqueHeaders(rawHeaders, width) {
    const used = new Map();
    const headers = [];
    for (let i = 0; i < width; i++) {
      const base = String(rawHeaders[i] ?? '').trim() || ('Column ' + (i + 1));
      const count = (used.get(base) || 0) + 1;
      used.set(base, count);
      headers.push(count === 1 ? base : base + '_' + count);
    }
    return headers;
  }

  function inferValue(value) {
    const trimmed = String(value).trim();
    if (trimmed === '') return '';
    if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
    if (/^null$/i.test(trimmed)) return null;

    const numberPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
    if (numberPattern.test(trimmed)) {
      const number = Number(trimmed);
      const isIntegerText = /^-?(?:0|[1-9]\d*)$/.test(trimmed);
      if (Number.isFinite(number) && (!isIntegerText || Number.isSafeInteger(number))) return number;
    }
    return value;
  }

  function normalizeRows(rows) {
    const width = Math.max(...rows.map(r => r.length));
    return {
      width,
      rows: rows.map(r => [...r, ...Array(Math.max(0, width - r.length)).fill('')])
    };
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
      setStatus('Add CSV', 'neutral');
      return;
    }

    const selected = delimiterSelect.value;
    const delimiter = selected === 'auto' ? detectDelimiter(raw) : (selected === '\\t' ? '\t' : selected);
    const parsed = parseDelimited(raw, delimiter);
    if (!parsed.length) throw new Error('No CSV rows found.');

    const normalized = normalizeRows(parsed);
    const convertCell = inferTypes.checked ? inferValue : value => value;
    let data;
    let dataRows;

    if (hasHeader.checked) {
      if (normalized.rows.length < 2) {
        dataRows = [];
      } else {
        dataRows = normalized.rows.slice(1);
      }
      const headers = uniqueHeaders(normalized.rows[0], normalized.width);
      data = dataRows.map(row => Object.fromEntries(headers.map((header, i) => [header, convertCell(row[i])])));
      const duplicateCount = headers.filter((h, i) => /_\d+$/.test(h) && headers.indexOf(h) === i).length;
      if (duplicateCount) {
        warnings.hidden = false;
        warnings.innerHTML = '<span>Duplicate CSV headers were renamed so JSON object keys stay unique.</span>';
      }
    } else {
      dataRows = normalized.rows;
      data = dataRows.map(row => row.map(convertCell));
    }

    const json = JSON.stringify(data, null, 2);
    output.value = json;
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + dataRows.length.toLocaleString() + '</b> data rows</span>' +
      '<span><b>' + normalized.width.toLocaleString() + '</b> columns</span>' +
      '<span><b>' + (delimiter === '\t' ? 'Tab' : delimiter) + '</b> delimiter</span>' +
      '<span><b>' + new Blob([json]).size.toLocaleString() + '</b> output bytes</span>';
    setStatus('Converted', 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    warnings.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix CSV', 'error');
  }

  document.getElementById('convertCsvJson').addEventListener('click', () => {
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleCsvJson').addEventListener('click', () => {
    input.value = 'name,role,active,score\n"Ada Lovelace","admin,owner",true,98.5\nLinus,developer,true,100\nGrace,architect,false,99';
    delimiterSelect.value = 'auto';
    hasHeader.checked = true;
    inferTypes.checked = false;
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearCsvJson').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    warnings.hidden = true;
    setStatus('Ready', 'neutral');
    input.focus();
  });

  document.getElementById('copyCsvJson').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadCsvJson').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type:'application/json;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'converted.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  for (const control of [delimiterSelect, hasHeader, inferTypes]) {
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