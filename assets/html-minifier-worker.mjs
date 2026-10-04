let minifyHtml = null;

const postError = error => {
  self.postMessage({
    type: 'error',
    message: error && error.message ? error.message : String(error)
  });
};

try {
  const mod = await import('https://cdn.jsdelivr.net/npm/html-minifier-terser@7.2.0/+esm');
  minifyHtml = mod.minify || mod.default?.minify || null;
  if (typeof minifyHtml !== 'function') {
    throw new Error('HTML minifier constructor was not found.');
  }
  self.postMessage({ type: 'ready' });
} catch (error) {
  postError(error);
}

self.addEventListener('message', async event => {
  const data = event.data || {};
  if (data.type !== 'minify' || typeof minifyHtml !== 'function') return;

  try {
    const result = await minifyHtml(String(data.source || ''), data.options || {});
    self.postMessage({
      type: 'result',
      requestId: data.requestId,
      result: String(result)
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId: data.requestId,
      message: error && error.message ? error.message : String(error)
    });
  }
});
