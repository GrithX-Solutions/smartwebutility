(() => {
  'use strict';
  if (!document.body.hasAttribute('data-json-html-tool')) return;

  const input = document.getElementById('jsonHtmlInput');
  const output = document.getElementById('jsonHtmlOutput');
  const file = document.getElementById('jsonHtmlFile');
  const mode = document.getElementById('jsonHtmlMode');
  const status = document.getElementById('jsonHtmlStatus');
  const error = document.getElementById('jsonHtmlError');
  const stats = document.getElementById('jsonHtmlStats');
  const preview = document.getElementById('jsonHtmlPreview');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const scalarText = value => {
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  };

  function tableForArrayOfObjects(rows) {
    const keys = [];
    const seen = new Set();

    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      }
    }

    const head = '<thead><tr>' + keys.map(key => '<th>' + escapeHtml(key) + '</th>').join('') + '</tr></thead>';
    const body = '<tbody>' + rows.map(row =>
      '<tr>' + keys.map(key => {
        const value = Object.prototype.hasOwnProperty.call(row, key) ? row[key] : '';
        return '<td>' + escapeHtml(scalarText(value)) + '</td>';
      }).join('') + '</tr>'
    ).join('') + '</tbody>';

    return '<table>' + head + body + '</table>';
  }

  function tableForObject(value) {
    const rows = Object.entries(value).map(([key, cell]) =>
      '<tr><th>' + escapeHtml(key) + '</th><td>' + escapeHtml(scalarText(cell)) + '</td></tr>'
    ).join('');
    return '<table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function tableForPrimitiveArray(values) {
    const rows = values.map(value => '<tr><td>' + escapeHtml(scalarText(value)) + '</td></tr>').join('');
    return '<table><thead><tr><th>Value</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function toTable(value) {
    if (Array.isArray(value)) {
      if (!value.length) return '<table><thead><tr><th>Value</th></tr></thead><tbody></tbody></table>';
      const allObjects = value.every(item => item && typeof item === 'object' && !Array.isArray(item));
      return allObjects ? tableForArrayOfObjects(value) : tableForPrimitiveArray(value);
    }

    if (value && typeof value === 'object') return tableForObject(value);
    return '<table><thead><tr><th>Value</th></tr></thead><tbody><tr><td>' + escapeHtml(scalarText(value)) + '</td></tr></tbody></table>';
  }

  function toNested(value) {
    if (Array.isArray(value)) {
      return '<ol>' + value.map(item => '<li>' + toNested(item) + '</li>').join('') + '</ol>';
    }

    if (value && typeof value === 'object') {
      return '<dl>' + Object.entries(value).map(([key, child]) =>
        '<dt>' + escapeHtml(key) + '</dt><dd>' + toNested(child) + '</dd>'
      ).join('') + '</dl>';
    }

    return '<span>' + escapeHtml(scalarText(value)) + '</span>';
  }

  const previewDocument = html => [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src data:; font-src &#39;none&#39;; media-src &#39;none&#39;; connect-src &#39;none&#39;; frame-src &#39;none&#39;; object-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<style>body{font:16px/1.55 system-ui,sans-serif;margin:24px;color:#172033}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:7px 9px;text-align:left;vertical-align:top}th{background:#f8fafc}dl{margin:0}dt{font-weight:700;margin-top:10px}dd{margin-left:20px}ol{padding-left:24px}span{white-space:pre-wrap}</style>',
    '</head><body>', html, '</body></html>'
  ].join('');

  function convert() {
    error.hidden = true;
    error.textContent = '';

    const raw = input.value;
    if (!raw.trim()) {
      output.value = '';
      stats.hidden = true;
      preview.srcdoc = previewDocument('<p>Add JSON to preview the generated HTML.</p>');
      setStatus('Add JSON');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (caught) {
      throw new Error('Invalid JSON: ' + caught.message);
    }

    const html = mode.value === 'nested' ? toNested(parsed) : toTable(parsed);
    output.value = html;
    preview.srcdoc = previewDocument(html);

    const bytes = new Blob([html]).size;
    const topLevelCount = Array.isArray(parsed)
      ? parsed.length
      : (parsed && typeof parsed === 'object' ? Object.keys(parsed).length : 1);

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + topLevelCount.toLocaleString() + '</b> top-level items</span>' +
      '<span><b>' + bytes.toLocaleString() + '</b> output bytes</span>' +
      '<span><b>' + (mode.value === 'table' ? 'Table' : 'Nested') + '</b> mode</span>';

    setStatus('Converted', 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    preview.srcdoc = previewDocument('<p>Preview unavailable until the JSON converts successfully.</p>');
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix JSON', 'error');
  }

  document.getElementById('convertJsonHtml').addEventListener('click', () => {
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleJsonHtml').addEventListener('click', () => {
    input.value = JSON.stringify([
      { name: 'Ada', role: 'admin', note: '<script>alert(1)</script>' },
      { name: 'Linus', role: 'developer', active: true }
    ], null, 2);
    mode.value = 'table';
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearJsonHtml').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    mode.value = 'table';
    preview.srcdoc = previewDocument('<p>Add JSON to preview the generated HTML.</p>');
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('copyJsonHtml').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadJsonHtml').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type:'text/html;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'converted.html';
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
      fail(new Error('Please choose a JSON file smaller than 5 MB.'));
      return;
    }
    input.value = await chosen.text();
    try { convert(); } catch (caught) { fail(caught); }
  });

  mode.addEventListener('change', () => {
    if (!input.value.trim()) return;
    try { convert(); } catch (caught) { fail(caught); }
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { convert(); } catch (caught) { fail(caught); }
    }
  });

  preview.srcdoc = previewDocument('<p>Add JSON to preview the generated HTML.</p>');
})();