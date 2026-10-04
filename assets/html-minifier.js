(() => {
  'use strict';

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

  const WORKER_LOAD_TIMEOUT_MS = 10000;
  const MINIFY_TIMEOUT_MS = 8000;
  let nextRequestId = 0;
  let activeTask = null;

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const requiredElements = [
    input, output, file, status, error, stats,
    ...Object.values(controls),
    document.getElementById('minifyHtml'),
    document.getElementById('exampleHtmlMinifier'),
    document.getElementById('clearHtmlMinifier'),
    document.getElementById('copyHtmlMinifier'),
    document.getElementById('downloadHtmlMinifier')
  ];
  if (requiredElements.some(element => !element)) {
    throw new Error('HTML Minifier UI failed to initialize because a required element is missing.');
  }

  window.__swuHtmlMinifierBooted = true;
  setStatus(typeof Worker === 'function' ? 'Ready' : 'Web Workers unavailable',
    typeof Worker === 'function' ? 'neutral' : 'error');

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

  const abortError = () => {
    const caught = new Error('Minification cancelled.');
    caught.name = 'AbortError';
    return caught;
  };

  const cancelActive = () => {
    if (!activeTask) return;
    const task = activeTask;
    activeTask = null;
    clearTimeout(task.loadTimer);
    clearTimeout(task.runTimer);
    task.worker.terminate();
    task.reject(abortError());
  };

  const minifyInWorker = (source, workerOptions) => new Promise((resolve, reject) => {
    if (typeof Worker !== 'function') {
      reject(new Error('Web Workers are not available in this browser.'));
      return;
    }

    cancelActive();

    const requestId = ++nextRequestId;
    const worker = new Worker('/assets/html-minifier-worker.js?v=20261004-1');

    const task = {
      requestId,
      worker,
      reject,
      loadTimer: null,
      runTimer: null
    };
    activeTask = task;

    const finish = (callback, value) => {
      if (activeTask === task) activeTask = null;
      clearTimeout(task.loadTimer);
      clearTimeout(task.runTimer);
      worker.terminate();
      callback(value);
    };

    const failTask = caught => {
      finish(reject, caught instanceof Error ? caught : new Error(String(caught)));
    };

    task.loadTimer = setTimeout(() => {
      failTask(new Error('HTML minifier worker failed to load within 10 seconds.'));
    }, WORKER_LOAD_TIMEOUT_MS);

    worker.addEventListener('error', event => {
      failTask(new Error(event.message || 'HTML minifier worker failed.'));
    }, { once: true });

    worker.addEventListener('message', event => {
      const data = event.data || {};

      if (data.type === 'ready') {
        clearTimeout(task.loadTimer);
        task.loadTimer = null;
        task.runTimer = setTimeout(() => {
          failTask(new Error('Minification exceeded 8 seconds and was stopped to keep this tab responsive.'));
        }, MINIFY_TIMEOUT_MS);
        worker.postMessage({
          type: 'minify',
          requestId,
          source,
          options: workerOptions
        });
        return;
      }

      if (data.type === 'error' && (data.requestId == null || data.requestId === requestId)) {
        failTask(new Error(data.message || 'HTML minification failed.'));
        return;
      }

      if (data.type === 'result' && data.requestId === requestId) {
        finish(resolve, String(data.result || ''));
      }
    });
  });

  const fail = caught => {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix HTML or options', 'error');
  };

  const run = async () => {
    error.hidden = true;
    error.textContent = '';
    const source = input.value;
    if (!source.trim()) {
      cancelActive();
      output.value = '';
      stats.hidden = true;
      setStatus('Add HTML');
      return;
    }

    setStatus('Minifying…', 'neutral');
    const minified = await minifyInWorker(source, options());
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

  const runSafely = () => {
    run().catch(caught => {
      if (caught?.name !== 'AbortError') fail(caught);
    });
  };

  document.getElementById('minifyHtml').addEventListener('click', runSafely);

  document.getElementById('exampleHtmlMinifier').addEventListener('click', () => {
    input.value = '<!doctype html>\n<html>\n  <head>\n    <!-- build comment -->\n    <title>Example</title>\n  </head>\n  <body>\n    <main class="content">\n      <h1>Hello world</h1>\n      <p>This is an example page.</p>\n    </main>\n  </body>\n</html>';
    runSafely();
  });

  document.getElementById('clearHtmlMinifier').addEventListener('click', () => {
    cancelActive();
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    error.textContent = '';
    stats.hidden = true;
    setStatus(typeof Worker === 'function' ? 'Ready' : 'Web Workers unavailable',
      typeof Worker === 'function' ? 'neutral' : 'error');
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
      if (caught?.name !== 'AbortError') fail(caught);
    }
  });

  Object.values(controls).forEach(control => {
    control.addEventListener('change', () => {
      if (!input.value.trim()) return;
      runSafely();
    });
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runSafely();
    }
  });

})();