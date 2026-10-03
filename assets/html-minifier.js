(() => {
  'use strict';
  if (!document.body.hasAttribute('data-html-minifier')) return;

  const input = document.getElementById('htmlMinifierInput');
  const output = document.getElementById('htmlMinifierOutput');
  const file = document.getElementById('htmlMinifierFile');
  const status = document.getElementById('htmlMinifierStatus');
  const error = document.getElementById('htmlMinifierError');
  const stats = document.getElementById('htmlMinifierStats');

  const controls = {
    removeComments: document.getElementById('minRemoveComments'),
    collapseWhitespace: document.getElementById('minCollapseWhitespace'),
    removeRedundantAttributes: document.getElementById('minRedundantAttrs'),
    removeAttributeQuotes: document.getElementById('minAttributeQuotes'),
    removeOptionalTags: document.getElementById('minOptionalTags'),
    minifyCSS: document.getElementById('minInlineCss'),
    minifyJS: document.getElementById('minInlineJs'),
    sortAttributes: document.getElementById('minSortAttrs'),
    html5Cleanup: document.getElementById('minHtml5Cleanup')
  };

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const engine = () => window.HTMLMinifier && typeof window.HTMLMinifier.minify === 'function'
    ? window.HTMLMinifier.minify
    : null;

  const options = () => ({
    removeComments: controls.removeComments.checked,
    collapseWhitespace: controls.collapseWhitespace.checked,
    conservativeCollapse: controls.collapseWhitespace.checked,
    removeRedundantAttributes: controls.removeRedundantAttributes.checked,
    removeAttributeQuotes: controls.removeAttributeQuotes.checked,
    removeOptionalTags: controls.removeOptionalTags.checked,
    minifyCSS: controls.minifyCSS.checked,
    minifyJS: controls.minifyJS.checked,
    sortAttributes: controls.sortAttributes.checked,
    sortClassName: controls.sortAttributes.checked,
    collapseBooleanAttributes: controls.html5Cleanup.checked,
    removeScriptTypeAttributes: controls.html5Cleanup.checked,
    removeStyleLinkTypeAttributes: controls.html5Cleanup.checked,
    useShortDoctype: controls.html5Cleanup.checked,
    keepClosingSlash: true,
    removeEmptyAttributes: false
  });

  const fail = caught => {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix HTML or options', 'error');
  };

  const run = async () => {
    const minify = engine();
    if (!minify) throw new Error('HTML minifier engine failed to load. Refresh the page and try again.');

    error.hidden = true;
    error.textContent = '';
    const source = input.value;
    if (!source.trim()) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add HTML');
      return;
    }

    const result = await minify(source, options());
    const minified = String(result);
    output.value = minified;

    const before = new Blob([source]).size;
    const after = new Blob([minified]).size;
    const saved = Math.max(0, before - after);
    const percent = before ? (saved / before * 100) : 0;

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + before.toLocaleString() + '</b> input bytes</span>' +
      '<span><b>' + after.toLocaleString() + '</b> output bytes</span>' +
      '<span><b>' + saved.toLocaleString() + '</b> bytes saved</span>' +
      '<span><b>' + percent.toFixed(1) + '%</b> smaller</span>';
    setStatus('Minified', 'success');
  };

  document.getElementById('minifyHtml').addEventListener('click', () => {
    run().catch(fail);
  });

  document.getElementById('exampleHtmlMinifier').addEventListener('click', () => {
    input.value = '<!doctype html>\n<html>\n  <head>\n    <!-- build comment -->\n    <title>Example</title>\n  </head>\n  <body>\n    <main class="content">\n      <h1>Hello world</h1>\n      <p>This is an example page.</p>\n    </main>\n  </body>\n</html>';
    run().catch(fail);
  });

  document.getElementById('clearHtmlMinifier').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    setStatus(engine() ? 'Ready' : 'Loading minifier…');
    input.focus();
  });

  document.getElementById('copyHtmlMinifier').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadHtmlMinifier').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type:'text/html;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minified.html';
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
        throw new Error('Please choose an HTML file smaller than 5 MB.');
      }
      input.value = await chosen.text();
      await run();
    } catch (caught) {
      fail(caught);
    }
  });

  Object.values(controls).forEach(control => {
    control.addEventListener('change', () => {
      if (!input.value.trim()) return;
      run().catch(fail);
    });
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run().catch(fail);
    }
  });

  setStatus(engine() ? 'Ready' : 'Minifier failed to load', engine() ? 'neutral' : 'error');
})();