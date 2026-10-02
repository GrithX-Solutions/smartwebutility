(() => {
  'use strict';
  if (!document.body.hasAttribute('data-html-json-tool')) return;

  const input = document.getElementById('htmlJsonInput');
  const output = document.getElementById('htmlJsonOutput');
  const file = document.getElementById('htmlJsonFile');
  const mode = document.getElementById('htmlJsonMode');
  const includeComments = document.getElementById('htmlJsonComments');
  const keepWhitespace = document.getElementById('htmlJsonWhitespace');
  const tableHeader = document.getElementById('htmlJsonTableHeader');
  const status = document.getElementById('htmlJsonStatus');
  const error = document.getElementById('htmlJsonError');
  const stats = document.getElementById('htmlJsonStats');
  const warnings = document.getElementById('htmlJsonWarnings');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  function serializeNode(node, counters) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue ?? '';
      if (!keepWhitespace.checked && !value.trim()) return null;
      counters.text++;
      return { text: value };
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      if (!includeComments.checked) return null;
      counters.comments++;
      return { comment: node.nodeValue ?? '' };
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    counters.elements++;
    const result = { tag: node.tagName.toLowerCase() };

    if (node.attributes.length) {
      result.attributes = Object.fromEntries(
        [...node.attributes].map(attribute => [attribute.name, attribute.value])
      );
    }

    const children = [...node.childNodes]
      .map(child => serializeNode(child, counters))
      .filter(child => child !== null);

    if (children.length) result.children = children;
    return result;
  }

  function uniqueHeaders(values, width) {
    const used = new Map();
    const headers = [];

    for (let i = 0; i < width; i++) {
      const base = String(values[i] ?? '').trim() || ('Column ' + (i + 1));
      const count = (used.get(base) || 0) + 1;
      used.set(base, count);
      headers.push(count === 1 ? base : base + '_' + count);
    }
    return headers;
  }

  function extractTable(table, tableIndex) {
    const rows = [...table.querySelectorAll('tr')].map(row =>
      [...row.children]
        .filter(cell => cell.matches('th,td'))
        .map(cell => cell.textContent.trim())
    );

    const width = rows.length ? Math.max(...rows.map(row => row.length)) : 0;
    const normalized = rows.map(row => [
      ...row,
      ...Array(Math.max(0, width - row.length)).fill('')
    ]);

    if (!normalized.length) {
      return { index: tableIndex + 1, rows: [] };
    }

    if (!tableHeader.checked) {
      return { index: tableIndex + 1, rows: normalized };
    }

    const headers = uniqueHeaders(normalized[0], width);
    const data = normalized.slice(1).map(row =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]]))
    );

    return {
      index: tableIndex + 1,
      headers,
      rows: data
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
      setStatus('Add HTML');
      return;
    }

    const doc = new DOMParser().parseFromString(raw, 'text/html');
    let result;

    if (mode.value === 'tables') {
      const tables = [...doc.querySelectorAll('table')];
      result = tables.map(extractTable);

      if (!tables.length) {
        warnings.hidden = false;
        warnings.innerHTML = '<span>No HTML tables were found in the parsed document.</span>';
      }

      const rowCount = result.reduce((sum, table) => sum + table.rows.length, 0);
      const json = JSON.stringify(result, null, 2);
      output.value = json;
      stats.hidden = false;
      stats.innerHTML =
        '<span><b>' + tables.length.toLocaleString() + '</b> tables</span>' +
        '<span><b>' + rowCount.toLocaleString() + '</b> output rows</span>' +
        '<span><b>' + new Blob([json]).size.toLocaleString() + '</b> output bytes</span>';
      setStatus(tables.length ? 'Converted' : 'No tables', tables.length ? 'success' : 'neutral');
      return;
    }

    const counters = { elements: 0, text: 0, comments: 0 };
    result = serializeNode(doc.documentElement, counters);
    const json = JSON.stringify(result, null, 2);
    output.value = json;
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + counters.elements.toLocaleString() + '</b> elements</span>' +
      '<span><b>' + counters.text.toLocaleString() + '</b> text nodes</span>' +
      '<span><b>' + counters.comments.toLocaleString() + '</b> comments</span>' +
      '<span><b>' + new Blob([json]).size.toLocaleString() + '</b> output bytes</span>';
    setStatus('Converted', 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    warnings.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix input', 'error');
  }

  document.getElementById('convertHtmlJson').addEventListener('click', () => {
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleHtmlJson').addEventListener('click', () => {
    input.value = '<article id="post"><h1>Hello <em>world</em></h1><p data-id="42">Text</p><!-- note --><table><tr><th>Name</th><th>Role</th></tr><tr><td>Ada</td><td>Admin</td></tr><tr><td>Linus</td><td>Developer</td></tr></table></article>';
    mode.value = 'tree';
    includeComments.checked = false;
    keepWhitespace.checked = false;
    tableHeader.checked = true;
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearHtmlJson').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    warnings.hidden = true;
    mode.value = 'tree';
    includeComments.checked = false;
    keepWhitespace.checked = false;
    tableHeader.checked = true;
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('copyHtmlJson').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadHtmlJson').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type:'application/json;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'converted.json';
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
      fail(new Error('Please choose an HTML file smaller than 5 MB.'));
      return;
    }
    input.value = await chosen.text();
    try { convert(); } catch (caught) { fail(caught); }
  });

  for (const control of [mode, includeComments, keepWhitespace, tableHeader]) {
    control.addEventListener('change', () => {
      tableHeader.disabled = mode.value !== 'tables';
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

  tableHeader.disabled = true;
})();