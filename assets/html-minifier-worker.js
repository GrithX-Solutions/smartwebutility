let minifyHtml = null;
let activeProvider = null;

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
    provider: activeProvider || provider,
    requestId,
    message: error && error.message ? error.message : String(error)
  });
};

const protectRawBlocks = source => {
  const protectedBlocks = [];
  const pattern = /<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
  const text = source.replace(pattern, block => {
    const token = `___SWU_HTML_RAW_BLOCK_${protectedBlocks.length}___`;
    protectedBlocks.push(block);
    return token;
  });
  return {
    text,
    restore(value) {
      return protectedBlocks.reduce(
        (result, block, index) => result.replace(`___SWU_HTML_RAW_BLOCK_${index}___`, block),
        value
      );
    }
  };
};

const removeHtmlComments = source =>
  source.replace(/<!--(?!\[if\b)[\s\S]*?-->/gi, '');

const removeRedundantAttributes = source =>
  source
    .replace(/\s+type=(["'])text\/javascript\1/gi, '')
    .replace(/\s+type=(["'])text\/css\1/gi, '');

const applyHtml5Cleanup = source =>
  source
    .replace(/<!doctype[^>]*>/i, '<!doctype html>')
    .replace(/\s+type=(["'])text\/javascript\1/gi, '')
    .replace(/\s+type=(["'])text\/css\1/gi, '')
    .replace(
      /\s+(disabled|checked|selected|readonly|multiple|required|autofocus|hidden|novalidate|formnovalidate|open|controls|autoplay|loop|muted)=(["'])\1\2/gi,
      ' $1'
    );

const removeEligibleAttributeQuotes = source =>
  source.replace(
    /\s([A-Za-z_:][-A-Za-z0-9_:.]*)(=)(["'])([A-Za-z0-9._:\/\-]+)\3/g,
    ' $1=$4'
  );

const collapseHtmlWhitespace = source => {
  const protectedSource = protectRawBlocks(source);
  let result = protectedSource.text
    .replace(/[\t\r\n ]+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  return protectedSource.restore(result);
};

const localFallbackMinify = async (source, options = {}) => {
  const unsupported = [];
  if (options.removeOptionalTags) unsupported.push('Remove optional tags');
  if (options.minifyCSS) unsupported.push('Minify inline CSS');
  if (options.minifyJS) unsupported.push('Minify inline JavaScript');
  if (options.sortAttributes || options.sortClassName) unsupported.push('Sort attributes/classes');

  if (unsupported.length) {
    throw new Error(
      'The full HTML minifier engine is unavailable. Disable these advanced options to use the local conservative fallback: ' +
      unsupported.join(', ') + '.'
    );
  }

  let result = String(source || '');

  if (options.removeComments) result = removeHtmlComments(result);
  if (options.removeRedundantAttributes) result = removeRedundantAttributes(result);
  if (options.collapseBooleanAttributes || options.removeScriptTypeAttributes ||
      options.removeStyleLinkTypeAttributes || options.useShortDoctype) {
    result = applyHtml5Cleanup(result);
  }
  if (options.removeAttributeQuotes) result = removeEligibleAttributeQuotes(result);
  if (options.collapseWhitespace) result = collapseHtmlWhitespace(result);

  return result;
};

try {
  if (!engineUrl) throw new Error('Unknown HTML minifier engine provider.');
  importScripts(engineUrl);
  minifyHtml = self.HTMLMinifier && typeof self.HTMLMinifier.minify === 'function'
    ? self.HTMLMinifier.minify
    : null;

  if (typeof minifyHtml !== 'function') {
    throw new Error('HTML minifier UMD engine was not found in the worker.');
  }

  activeProvider = provider;
  self.postMessage({ type: 'ready', provider: activeProvider });
} catch (error) {
  minifyHtml = localFallbackMinify;
  activeProvider = 'local-fallback';
  self.postMessage({
    type: 'ready',
    provider: activeProvider,
    warning: 'Pinned CDN engine unavailable; using the local conservative fallback.'
  });
}

self.addEventListener('message', async event => {
  const data = event.data || {};
  if (data.type !== 'minify' || typeof minifyHtml !== 'function') return;

  try {
    const result = await minifyHtml(String(data.source || ''), data.options || {});
    self.postMessage({
      type: 'result',
      provider: activeProvider,
      requestId: data.requestId,
      result: String(result)
    });
  } catch (error) {
    postError(error, data.requestId);
  }
});
