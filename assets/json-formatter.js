(() => {
  'use strict';

  const input = document.getElementById('jsonInput');
  const output = document.getElementById('jsonOutput');
  const indent = document.getElementById('indent');
  const status = document.getElementById('jsonStatus');
  const error = document.getElementById('jsonError');
  const stats = document.getElementById('jsonStats');
  const fileInput = document.getElementById('jsonFile');
  const copyBtn = document.getElementById('copyJson');
  const downloadBtn = document.getElementById('downloadJson');

  const $ = (id) => document.getElementById(id);

  function setStatus(message, kind = 'neutral') {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    setStatus('Invalid JSON', 'error');
  }

  function clearError() {
    error.hidden = true;
    error.textContent = '';
  }

  function parseJson() {
    const source = input.value.trim();
    clearError();
    if (!source) {
      showError('Paste JSON or choose a .json file first.');
      return null;
    }
    try {
      return JSON.parse(source);
    } catch (err) {
      const message = friendlyParseError(err, source);
      showError(message);
      return null;
    }
  }

  function friendlyParseError(err, source) {
    const raw = err && err.message ? err.message : 'Unable to parse JSON.';
    const match = raw.match(/position\s+(\d+)/i);
    if (!match) return raw;
    const pos = Number(match[1]);
    const before = source.slice(0, pos);
    const line = before.split('\n').length;
    const lastBreak = before.lastIndexOf('\n');
    const column = pos - lastBreak;
    return `${raw} (line ${line}, column ${column})`;
  }

  function indentation() {
    if (indent.value === 'tab') return '\t';
    return Number(indent.value) || 2;
  }

  function formatJson() {
    const data = parseJson();
    if (data === null) return;
    output.value = JSON.stringify(data, null, indentation());
    setStatus('Valid JSON · formatted', 'success');
    updateStats(data, output.value);
  }

  function validateJson() {
    const data = parseJson();
    if (data === null) return;
    output.value = input.value.trim();
    setStatus('Valid JSON', 'success');
    updateStats(data, output.value);
  }

  function minifyJson() {
    const data = parseJson();
    if (data === null) return;
    output.value = JSON.stringify(data);
    setStatus('Valid JSON · minified', 'success');
    updateStats(data, output.value);
  }

  function countStructure(value) {
    let objects = 0, arrays = 0, keys = 0, values = 0, maxDepth = 0;
    const visit = (node, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      if (Array.isArray(node)) {
        arrays++;
        values += node.length;
        node.forEach((item) => visit(item, depth + 1));
      } else if (node !== null && typeof node === 'object') {
        objects++;
        const entries = Object.entries(node);
        keys += entries.length;
        values += entries.length;
        entries.forEach(([, item]) => visit(item, depth + 1));
      }
    };
    visit(value, 1);
    return { objects, arrays, keys, values, maxDepth };
  }

  function updateStats(data, rendered) {
    const s = countStructure(data);
    const bytes = new TextEncoder().encode(rendered).length;
    stats.innerHTML = [
      ['Size', formatBytes(bytes)],
      ['Objects', s.objects],
      ['Arrays', s.arrays],
      ['Keys', s.keys],
      ['Depth', s.maxDepth]
    ].map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');
    stats.hidden = false;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function copyOutput() {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      const old = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = old; }, 1200);
    } catch {
      output.select();
      document.execCommand('copy');
    }
  }

  function downloadOutput() {
    if (!output.value) return;
    const blob = new Blob([output.value], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    input.value = '';
    output.value = '';
    clearError();
    stats.hidden = true;
    setStatus('Ready', 'neutral');
    input.focus();
  }

  function useExample() {
    input.value = JSON.stringify({
      name: 'Smart Web Utility',
      tool: 'JSON Formatter',
      free: true,
      features: ['format', 'validate', 'minify'],
      settings: { indent: 2, private: true }
    });
    formatJson();
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError('Please choose a JSON file smaller than 5 MB.');
      fileInput.value = '';
      return;
    }
    input.value = await file.text();
    formatJson();
    fileInput.value = '';
  });

  $('formatJson').addEventListener('click', formatJson);
  $('validateJson').addEventListener('click', validateJson);
  $('minifyJson').addEventListener('click', minifyJson);
  $('clearJson').addEventListener('click', clearAll);
  $('exampleJson').addEventListener('click', useExample);
  copyBtn.addEventListener('click', copyOutput);
  downloadBtn.addEventListener('click', downloadOutput);
  indent.addEventListener('change', () => {
    if (output.value && !error.hidden) return;
    if (input.value.trim()) formatJson();
  });

  input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      formatJson();
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.setRangeText('  ', start, end, 'end');
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
