(() => {
  'use strict';
  if (!document.body.hasAttribute('data-css-minifier')) return;

  const input = document.getElementById('cssMinifierInput');
  const output = document.getElementById('cssMinifierOutput');
  const file = document.getElementById('cssMinifierFile');
  const restructure = document.getElementById('cssRestructure');
  const preserveComments = document.getElementById('cssPreserveComments');
  const status = document.getElementById('cssMinifierStatus');
  const error = document.getElementById('cssMinifierError');
  const stats = document.getElementById('cssMinifierStats');

  const ENGINE_URLS = [
    ['jsdelivr', 'https://cdn.jsdelivr.net/npm/csso@5.0.5/dist/csso.js'],
    ['unpkg', 'https://unpkg.com/csso@5.0.5/dist/csso.js']
  ];
  const ENGINE_LOAD_TIMEOUT_MS = 10000;
  let engineReady = false;
  let engineError = null;

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const engine = () => window.csso && typeof window.csso.minify === 'function'
    ? window.csso.minify
    : null;

  const loadScript = (provider, url) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;

    const finish = callback => value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      callback(value);
    };

    const timer = setTimeout(() => {
      script.remove();
      finish(reject)(new Error(provider + ' engine load exceeded ' + (ENGINE_LOAD_TIMEOUT_MS / 1000) + ' seconds'));
    }, ENGINE_LOAD_TIMEOUT_MS);

    script.src = url;
    script.async = true;
    script.onload = finish(resolve);
    script.onerror = () => {
      script.remove();
      finish(reject)(new Error(provider + ' engine failed to load'));
    };
    document.head.appendChild(script);
  });

  const initializeEngine = async () => {
    window.__swuCssMinifierEngineReady = false;
    window.__swuCssMinifierEngineProvider = '';
    window.__swuCssMinifierEngineError = '';
    setStatus('Loading minifier…');

    const failures = [];
    for (const [provider, url] of ENGINE_URLS) {
      try {
        await loadScript(provider, url);
        if (!engine()) throw new Error(provider + ' loaded without exposing CSSO.minify');
        engineReady = true;
        engineError = null;
        window.__swuCssMinifierEngineReady = true;
        window.__swuCssMinifierEngineProvider = provider;
        setStatus('Ready');
        return true;
      } catch (caught) {
        failures.push(provider + ': ' + (caught?.message || String(caught)));
      }
    }

    engineReady = false;
    engineError = new Error('CSS minifier engine could not load: ' + failures.join(' | '));
    window.__swuCssMinifierEngineError = engineError.message;
    error.textContent = engineError.message;
    error.hidden = false;
    setStatus('Minifier unavailable', 'error');
    return false;
  };

  const engineReadyPromise = initializeEngine();

  const fail = caught => {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix CSS', 'error');
  };

  const run = async () => {
    if (!engineReady) {
      const ready = await engineReadyPromise;
      if (!ready) throw engineError || new Error('CSS minifier engine is unavailable.');
    }

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
      comments: preserveComments.checked ? 'exclamation' : false
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
      '<span><b>' + (restructure.checked ? 'On' : 'Off') + '</b> restructuring</span>' +
      '<span><b>' + (preserveComments.checked ? 'Keep /*! */' : 'Remove all') + '</b> comments</span>';

    setStatus('Minified', 'success');
  };

  const runSafely = () => {
    run().catch(caught => fail(caught));
  };

  document.getElementById('minifyCss').addEventListener('click', runSafely);

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
    runSafely();
  });

  document.getElementById('clearCssMinifier').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    restructure.checked = false;
    preserveComments.checked = true;
    if (engineReady) setStatus('Ready');
    else if (engineError) setStatus('Minifier unavailable', 'error');
    else setStatus('Loading minifier…');
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
      await run();
    } catch (caught) {
      fail(caught);
    }
  });

  for (const control of [restructure, preserveComments]) {
    control.addEventListener('change', () => {
      if (!input.value.trim()) return;
      runSafely();
    });
  }

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runSafely();
    }
  });

  window.__swuCssMinifierBooted = true;
})();