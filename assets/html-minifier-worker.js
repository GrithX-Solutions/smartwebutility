let minifyHtml = null;

const providers = {
  jsdelivr: 'https://cdn.jsdelivr.net/npm/html-minifier-terser@7.2.0/dist/htmlminifier.umd.bundle.min.js',
  unpkg: 'https://unpkg.com/html-minifier-terser@7.2.0/dist/htmlminifier.umd.bundle.min.js'
};

const workerUrl = new URL(self.location.href);
const provider = workerUrl.searchParams.get('engine') || 'jsdelivr';
const engineUrl = providers[provider];

const postError = (error, requestId = null) => {
  self.postMessage({
    type: 'error',
    provider,
    requestId,
    message: error && error.message ? error.message : String(error)
  });
};

const initialize = async () => {
  if (!engineUrl) throw new Error('Unknown HTML minifier engine provider.');

  const response = await fetch(engineUrl, {
    mode: 'cors',
    credentials: 'omit',
    cache: 'force-cache'
  });
  if (!response.ok) {
    throw new Error('HTML minifier engine request failed with HTTP ' + response.status + '.');
  }

  const source = await response.text();
  if (!source.trim()) throw new Error('HTML minifier engine response was empty.');

  // Evaluate the pinned UMD bundle inside this isolated worker global.
  (0, eval)(source + '\n//# sourceURL=' + engineUrl);

  minifyHtml = self.HTMLMinifier && typeof self.HTMLMinifier.minify === 'function'
    ? self.HTMLMinifier.minify
    : null;

  if (typeof minifyHtml !== 'function') {
    throw new Error('HTML minifier UMD engine was not found in the worker.');
  }

  self.postMessage({ type: 'ready', provider });
};

initialize().catch(postError);

self.addEventListener('message', async event => {
  const data = event.data || {};
  if (data.type !== 'minify') return;

  if (typeof minifyHtml !== 'function') {
    postError(new Error('HTML minifier engine is not ready.'), data.requestId);
    return;
  }

  try {
    const result = await minifyHtml(String(data.source || ''), data.options || {});
    self.postMessage({
      type: 'result',
      provider,
      requestId: data.requestId,
      result: String(result)
    });
  } catch (error) {
    postError(error, data.requestId);
  }
});
