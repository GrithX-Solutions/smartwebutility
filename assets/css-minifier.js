(() => {
  'use strict';
  if (!document.body.hasAttribute('data-css-minifier')) return;

  const input = document.getElementById('cssMinifierInput');
  const output = document.getElementById('cssMinifierOutput');
  const file = document.getElementById('cssMinifierFile');
  const restructure = document.getElementById('cssRestructure');
  const status = document.getElementById('cssMinifierStatus');
  const error = document.getElementById('cssMinifierError');
  const stats = document.getElementById('cssMinifierStats');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const engine = () => window.csso && typeof window.csso.minify === 'function'
    ? window.csso.minify
    : null;

  const fail = caught => {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix CSS', 'error');
  };

  const run = () => {
    const minify = engine();
    if (!minify) throw new Error('CSS minifier engine failed to load. Refresh the page and try again.');

    error.hidden = true;
    error.textContent = '';

    const source = input.value;
    if (!source.trim()) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add CSS');
      return;
    }

    const result = minify(source, {
      restructure: restructure.checked,
      comments: false
    });

    const minified = String(result.css || '');
    output.value = minified;

    const before = new Blob([source]).size;
    const after = new Blob([minified]).size;
    const saved = Math.max(0, before - after);
    const percent = before ? saved / before * 100 : 0;

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + before.toLocaleString() + '</b> input bytes</span>' +
      '<span><b>' + after.toLocaleString() + '</b> output bytes</span>' +
      '<span><b>' + saved.toLocaleString() + '</b> bytes saved</span>' +
      '<span><b>' + percent.toFixed(1) + '%</b> smaller</span>' +
      '<span><b>' + (restructure.checked ? 'On' : 'Off') + '</b> restructuring</span>';

    setStatus('Minified', 'success');
  };

  document.getElementById('minifyCss').addEventListener('click', () => {
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleCssMinifier').addEventListener('click', () => {
    input.value = `:root {
  --brand: #ff0000;
}

.card {
  margin: 0px 0px 0px 0px;
  color: #ff0000;
  padding: 16px 16px 16px 16px;
}

.card strong {
  font-weight: 700;
}`;
    restructure.checked = false;
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearCssMinifier').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    restructure.checked = false;
    setStatus(engine() ? 'Ready' : 'Loading minifier…');
    input.focus();
  });

  document.getElementById('copyCssMinifier').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadCssMinifier').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type:'text/css;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minified.css';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded', 'success');
  });

  file.addEventListener('change', async () => {
    try {
      const chosen = file.files?.[0];
      if (!chosen) return;
      if (chosen.size > 5 * 1024 * 1024) {
        file.value = '';
        throw new Error('Please choose a CSS file smaller than 5 MB.');
      }
      input.value = await chosen.text();
      run();
    } catch (caught) {
      fail(caught);
    }
  });

  restructure.addEventListener('change', () => {
    if (!input.value.trim()) return;
    try { run(); } catch (caught) { fail(caught); }
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { run(); } catch (caught) { fail(caught); }
    }
  });

  window.addEventListener('load', () => {
    setStatus(engine() ? 'Ready' : 'Minifier failed to load', engine() ? 'neutral' : 'error');
  });
})();