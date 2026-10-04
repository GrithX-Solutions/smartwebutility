let minifyHtml = null;

const providers = {
  jsdelivr: 'https://cdn.jsdelivr.net/npm/html-minifier-terser@7.2.0/dist/htmlminifier.umd.bundle.min.js',
  unpkg: 'https://unpkg.com/html-minifier-terser@7.2.0/dist/htmlminifier.umd.bundle.min.js',
  local: null
};

const basicFallbackMinify = (source, options = {}) => {
  let result = String(source || '');

  if (options.removeComments) {
    result = result.replace(/<!--(?!\[if)[\s\S]*?-->/gi, '');
  }

  if (options.collapseWhitespace) {
    result = result.replace(/>\s+</g, '><').trim();
  }

  return result;
};

const workerUrl = new URL(self.location.href);
const provider = workerUrl.searchParams.get('engine') || 'jsdelivr';
const engineUrl = providers[provider];

const postError = error => {
  self.postMessage({
    type: 'error',
    provider,
    message: error && error.message ? error.message : String(error)
  });
};

try {
  if (provider === 'local') {
    minifyHtml = basicFallbackMinify;
    self.postMessage({ type:'ready', provider, limited:true });
  } else {
    if (!engineUrl) throw new Error('Unknown HTML minifier engine provider.');
    importScripts(engineUrl);
    minifyHtml = self.HTMLMinifier && typeof self.HTMLMinifier.minify === 'function'
      ? self.HTMLMinifier.minify
      : null;

    if (typeof minifyHtml !== 'function') {
      throw new Error('HTML minifier UMD engine was not found in the worker.');
    }

    self.postMessage({ type:'ready', provider, limited:false });
  }
} catch (error) {
  postError(error);
}

self.addEventListener('message', async event => {
  const data = event.data || {};
  if (data.type !== 'minify' || typeof minifyHtml !== 'function') return;

  try {
    const result = await minifyHtml(String(data.source || ''), data.options || {});
    self.postMessage({
      type:'result',
      provider,
      limited:provider === 'local',
      requestId:data.requestId,
      result:String(result)
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      provider,
      requestId: data.requestId,
      message: error && error.message ? error.message : String(error)
    });
  }
});
