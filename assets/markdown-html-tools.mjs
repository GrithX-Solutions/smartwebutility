const mode = document.body.dataset.markdownHtmlTool;

const copyText = async (textarea, status, label = 'Copied') => {
  if (!textarea.value) return;
  try {
    await navigator.clipboard.writeText(textarea.value);
  } catch {
    textarea.select();
    document.execCommand('copy');
  }
  status(label, 'success');
};

const downloadText = (name, type, text) => {
  if (!text) return;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const readLocalFile = async (fileInput, maxBytes = 5 * 1024 * 1024) => {
  const chosen = fileInput.files?.[0];
  if (!chosen) return null;
  if (chosen.size > maxBytes) {
    fileInput.value = '';
    throw new Error('Please choose a file smaller than 5 MB.');
  }
  return chosen.text();
};

if (mode === 'markdown-to-html') {
  const input = document.getElementById('markdownInput');
  const output = document.getElementById('markdownHtmlOutput');
  const preview = document.getElementById('markdownHtmlPreview');
  const file = document.getElementById('markdownFile');
  const breaks = document.getElementById('markdownBreaks');
  const statusEl = document.getElementById('markdownHtmlStatus');
  const error = document.getElementById('markdownHtmlError');
  const stats = document.getElementById('markdownHtmlStats');

  let marked = null;

  const setStatus = (text, kind = 'neutral') => {
    statusEl.textContent = text;
    statusEl.dataset.kind = kind;
  };

  const previewDocument = html => [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src data:; style-src &#39;unsafe-inline&#39;; font-src &#39;none&#39;; media-src &#39;none&#39;; connect-src &#39;none&#39;; frame-src &#39;none&#39;; object-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<style>body{font:16px/1.6 system-ui,sans-serif;margin:24px;color:#172033}pre{overflow:auto;background:#f4f6f8;padding:12px;border-radius:8px}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}blockquote{border-left:4px solid #cbd5e1;margin-left:0;padding-left:16px;color:#475569}img{max-width:100%}a{color:#2563eb;pointer-events:none}</style>',
    '</head><body>', html, '</body></html>'
  ].join('');

  const fail = caught => {
    output.value = '';
    preview.srcdoc = previewDocument('<p>Preview unavailable until the Markdown converts successfully.</p>');
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix Markdown', 'error');
  };

  const convert = () => {
    if (!marked) throw new Error('Markdown parser is still loading. Please try again.');
    error.hidden = true;
    error.textContent = '';
    const source = input.value;
    if (!source.trim()) {
      output.value = '';
      preview.srcdoc = previewDocument('<p>Add Markdown to preview the generated HTML.</p>');
      stats.hidden = true;
      setStatus('Add Markdown');
      return;
    }
    const html = marked.parse(source, { gfm: true, breaks: breaks.checked, async: false });
    output.value = String(html);
    preview.srcdoc = previewDocument(String(html));
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + source.length.toLocaleString() + '</b> input chars</span>' +
      '<span><b>' + String(html).length.toLocaleString() + '</b> HTML chars</span>' +
      '<span><b>' + source.split(/\r?\n/).length.toLocaleString() + '</b> input lines</span>';
    setStatus('Converted', 'success');
  };

  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/marked@18.0.14/+esm');
    marked = mod.marked;
    setStatus('Ready');
  } catch {
    fail(new Error('Markdown parser failed to load. Refresh the page and try again.'));
  }

  document.getElementById('convertMarkdownHtml').addEventListener('click', () => {
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleMarkdownHtml').addEventListener('click', () => {
    input.value = '# Release notes\n\nUse **Markdown** for structured content.\n\n- [x] Parse headings\n- [x] Convert lists\n\n| Tool | Status |\n| --- | --- |\n| Converter | Ready |\n\n~~~js\nconsole.log("hello");\n~~~';
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearMarkdownHtml').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    preview.srcdoc = previewDocument('<p>Add Markdown to preview the generated HTML.</p>');
    setStatus(marked ? 'Ready' : 'Loading parser…');
    input.focus();
  });

  breaks.addEventListener('change', () => {
    if (!input.value.trim()) return;
    try { convert(); } catch (caught) { fail(caught); }
  });

  file.addEventListener('change', async () => {
    try {
      const text = await readLocalFile(file);
      if (text == null) return;
      input.value = text;
      convert();
    } catch (caught) { fail(caught); }
  });

  document.getElementById('copyMarkdownHtml').addEventListener('click', () => copyText(output, setStatus));
  document.getElementById('downloadMarkdownHtml').addEventListener('click', () => {
    downloadText('converted.html', 'text/html;charset=utf-8', output.value);
    if (output.value) setStatus('Downloaded', 'success');
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { convert(); } catch (caught) { fail(caught); }
    }
  });

  preview.srcdoc = previewDocument('<p>Add Markdown to preview the generated HTML.</p>');
}

if (mode === 'html-to-markdown') {
  const input = document.getElementById('htmlMarkdownInput');
  const output = document.getElementById('htmlMarkdownOutput');
  const file = document.getElementById('htmlMarkdownFile');
  const heading = document.getElementById('htmlMarkdownHeading');
  const bullet = document.getElementById('htmlMarkdownBullet');
  const useGfm = document.getElementById('htmlMarkdownGfm');
  const statusEl = document.getElementById('htmlMarkdownStatus');
  const error = document.getElementById('htmlMarkdownError');
  const stats = document.getElementById('htmlMarkdownStats');

  let TurndownService = null;
  let gfmPlugin = null;

  const setStatus = (text, kind = 'neutral') => {
    statusEl.textContent = text;
    statusEl.dataset.kind = kind;
  };

  const fail = caught => {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix HTML', 'error');
  };

  const convert = () => {
    if (!TurndownService) throw new Error('HTML converter is still loading. Please try again.');
    error.hidden = true;
    error.textContent = '';
    const source = input.value;
    if (!source.trim()) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add HTML');
      return;
    }

    const doc = new DOMParser().parseFromString(source, 'text/html');
    doc.querySelectorAll('script,style,noscript,template,iframe,object,embed').forEach(node => node.remove());

    const service = new TurndownService({
      headingStyle: heading.value,
      bulletListMarker: bullet.value,
      codeBlockStyle: 'fenced',
      fence: '\x60\x60\x60',
      emDelimiter: '*',
      strongDelimiter: '**'
    });
    if (useGfm.checked && gfmPlugin) service.use(gfmPlugin);

    const codeLanguage = (codeNode, preNode) => {
      for (const candidate of [
        codeNode?.getAttribute('data-language'),
        preNode?.getAttribute('data-language')
      ].filter(Boolean)) {
        const direct = String(candidate).trim();
        if (/^[A-Za-z0-9_+#.-]+$/.test(direct)) return direct;
      }

      for (const candidate of [
        codeNode?.getAttribute('class'),
        preNode?.getAttribute('class')
      ].filter(Boolean)) {
        const match = String(candidate).match(/(?:^|\s)(?:language-|lang-)([A-Za-z0-9_+#.-]+)/i);
        if (match) return match[1];
      }

      return '';
    };

    service.addRule('languageAwareFencedCodeBlock', {
      filter(node) {
        if (node.nodeName !== 'PRE') return false;
        const codeNode = node.firstElementChild;
        return codeNode?.nodeName === 'CODE' && Boolean(codeLanguage(codeNode, node));
      },
      replacement(_content, node) {
        const codeNode = node.firstElementChild;
        const language = codeLanguage(codeNode, node);
        const code = codeNode.textContent.replace(/\n$/, '');
        const runs = code.match(/`+/g) || [];
        const longestRun = runs.reduce((max, run) => Math.max(max, run.length), 0);
        const fence = '`'.repeat(Math.max(3, longestRun + 1));
        return '\n\n' + fence + language + '\n' + code + '\n' + fence + '\n\n';
      }
    });

    const markdown = service.turndown(doc.body);
    output.value = markdown;
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + source.length.toLocaleString() + '</b> HTML chars</span>' +
      '<span><b>' + markdown.length.toLocaleString() + '</b> Markdown chars</span>' +
      '<span><b>' + markdown.split(/\r?\n/).length.toLocaleString() + '</b> output lines</span>';
    setStatus('Converted', 'success');
  };

  try {
    const [turndownMod, gfmMod] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/turndown@7.2.4/+esm'),
      import('https://cdn.jsdelivr.net/npm/turndown-plugin-gfm@1.0.2/+esm')
    ]);
    TurndownService = turndownMod.default || turndownMod.TurndownService;
    gfmPlugin = gfmMod.gfm || gfmMod.default?.gfm || null;
    if (!TurndownService) throw new Error('Turndown constructor not found.');
    setStatus('Ready');
  } catch {
    fail(new Error('HTML-to-Markdown converter failed to load. Refresh the page and try again.'));
  }

  document.getElementById('convertHtmlMarkdown').addEventListener('click', () => {
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleHtmlMarkdown').addEventListener('click', () => {
    input.value = '<article><h1>Release notes</h1><p>Convert <strong>HTML</strong> into readable Markdown.</p><ul><li>Headings</li><li>Links and lists</li></ul><table><thead><tr><th>Tool</th><th>Status</th></tr></thead><tbody><tr><td>Converter</td><td>Ready</td></tr></tbody></table><pre><code>npm run build</code></pre></article>';
    try { convert(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearHtmlMarkdown').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    setStatus(TurndownService ? 'Ready' : 'Loading converter…');
    input.focus();
  });

  for (const control of [heading, bullet, useGfm]) {
    control.addEventListener('change', () => {
      if (!input.value.trim()) return;
      try { convert(); } catch (caught) { fail(caught); }
    });
  }

  file.addEventListener('change', async () => {
    try {
      const text = await readLocalFile(file);
      if (text == null) return;
      input.value = text;
      convert();
    } catch (caught) { fail(caught); }
  });

  document.getElementById('copyHtmlMarkdown').addEventListener('click', () => copyText(output, setStatus));
  document.getElementById('downloadHtmlMarkdown').addEventListener('click', () => {
    downloadText('converted.md', 'text/markdown;charset=utf-8', output.value);
    if (output.value) setStatus('Downloaded', 'success');
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { convert(); } catch (caught) { fail(caught); }
    }
  });
}