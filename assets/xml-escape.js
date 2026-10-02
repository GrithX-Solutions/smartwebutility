(() => {
  'use strict';
  if (!document.body.hasAttribute('data-xml-escape-tool')) return;

  const input = document.getElementById('xmlEscapeInput');
  const output = document.getElementById('xmlEscapeOutput');
  const file = document.getElementById('xmlEscapeFile');
  const mode = document.getElementById('xmlEscapeMode');
  const context = document.getElementById('xmlEscapeContext');
  const runButton = document.getElementById('runXmlEscape');
  const status = document.getElementById('xmlEscapeStatus');
  const error = document.getElementById('xmlEscapeError');
  const stats = document.getElementById('xmlEscapeStats');
  const warnings = document.getElementById('xmlEscapeWarnings');

  const predefined = new Map([
    ['amp', '&'],
    ['lt', '<'],
    ['gt', '>'],
    ['apos', "'"],
    ['quot', '"']
  ]);

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const validXml10CodePoint = cp =>
    cp === 0x9 ||
    cp === 0xA ||
    cp === 0xD ||
    (cp >= 0x20 && cp <= 0xD7FF) ||
    (cp >= 0xE000 && cp <= 0xFFFD) ||
    (cp >= 0x10000 && cp <= 0x10FFFF);

  function escapeXml(text) {
    let changed = 0;
    let result = '';

    for (const ch of text) {
      let replacement = null;

      if (ch === '&') replacement = '&amp;';
      else if (ch === '<') replacement = '&lt;';
      else if (ch === '>') replacement = '&gt;';
      else if (ch === '"' && (context.value === 'double' || context.value === 'all')) replacement = '&quot;';
      else if (ch === "'" && (context.value === 'single' || context.value === 'all')) replacement = '&apos;';

      if (replacement !== null) {
        result += replacement;
        changed++;
      } else {
        result += ch;
      }
    }

    return {
      result,
      changed,
      unknown: 0,
      invalidNumeric: 0
    };
  }

  function unescapeXml(text) {
    let changed = 0;
    let invalidNumeric = 0;

    const result = text.replace(/&(?:amp|lt|gt|apos|quot|#\d+|#x[0-9A-Fa-f]+);/g, entity => {
      if (entity[1] !== '#') {
        const name = entity.slice(1, -1);
        changed++;
        return predefined.get(name);
      }

      const body = entity.slice(2, -1);
      const isHex = body.startsWith('x');
      const digits = isHex ? body.slice(1) : body;
      const cp = Number.parseInt(digits, isHex ? 16 : 10);

      if (!Number.isInteger(cp) || !validXml10CodePoint(cp)) {
        invalidNumeric++;
        return entity;
      }

      changed++;
      return String.fromCodePoint(cp);
    });

    const unknownNames = [...result.matchAll(/&([A-Za-z_:][A-Za-z0-9_.:-]*);/g)]
      .map(match => match[1])
      .filter(name => !predefined.has(name));

    const malformedNumeric = [...result.matchAll(/&#([^;]+);/g)]
      .filter(match => !/^\d+$/.test(match[1]) && !/^x[0-9A-Fa-f]+$/.test(match[1]))
      .length;

    return {
      result,
      changed,
      unknown: unknownNames.length,
      invalidNumeric: invalidNumeric + malformedNumeric
    };
  }

  function run() {
    error.hidden = true;
    error.textContent = '';
    warnings.hidden = true;
    warnings.innerHTML = '';

    const raw = input.value;
    if (!raw.length) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add input');
      return;
    }

    const transformed = mode.value === 'escape' ? escapeXml(raw) : unescapeXml(raw);
    output.value = transformed.result;

    const warningParts = [];
    if (transformed.unknown) warningParts.push(transformed.unknown + ' unknown named entit' + (transformed.unknown === 1 ? 'y' : 'ies') + ' preserved');
    if (transformed.invalidNumeric) warningParts.push(transformed.invalidNumeric + ' invalid numeric reference' + (transformed.invalidNumeric === 1 ? '' : 's') + ' preserved');

    if (warningParts.length) {
      warnings.hidden = false;
      warnings.innerHTML = '<span>' + warningParts.join(' · ') + '</span>';
    }

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + raw.length.toLocaleString() + '</b> input chars</span>' +
      '<span><b>' + transformed.result.length.toLocaleString() + '</b> output chars</span>' +
      '<span><b>' + transformed.changed.toLocaleString() + '</b> references transformed</span>' +
      '<span><b>' + (mode.value === 'escape' ? context.options[context.selectedIndex].text : 'Predefined + numeric') + '</b> rules</span>';

    setStatus(mode.value === 'escape' ? 'Escaped' : 'Unescaped', warningParts.length ? 'neutral' : 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    warnings.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix input', 'error');
  }

  function syncMode() {
    const escaping = mode.value === 'escape';
    context.disabled = !escaping;
    runButton.textContent = escaping ? 'Escape XML' : 'Unescape XML';
  }

  document.getElementById('runXmlEscape').addEventListener('click', () => {
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleXmlEscape').addEventListener('click', () => {
    if (mode.value === 'escape') {
      input.value = 'Tom & Jerry < 5 > 3 "quoted" \'single\'';
      context.value = 'all';
    } else {
      input.value = '&lt;message&gt;Tom &amp; Jerry &#33; &#x1F600;&lt;/message&gt; &nbsp; &#0;';
    }
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('swapXmlEscape').addEventListener('click', () => {
    if (output.value) input.value = output.value;
    mode.value = mode.value === 'escape' ? 'unescape' : 'escape';
    syncMode();
    if (!input.value.length) return;
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearXmlEscape').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    warnings.hidden = true;
    mode.value = 'escape';
    context.value = 'text';
    syncMode();
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('copyXmlEscape').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadXmlEscape').addEventListener('click', () => {
    if (!output.value) return;
    const name = mode.value === 'escape' ? 'xml-escaped.txt' : 'xml-unescaped.txt';
    const url = URL.createObjectURL(new Blob([output.value], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded', 'success');
  });

  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    if (chosen.size > 5 * 1024 * 1024) {
      file.value = '';
      fail(new Error('Please choose a file smaller than 5 MB.'));
      return;
    }
    input.value = await chosen.text();
    try { run(); } catch (caught) { fail(caught); }
  });

  mode.addEventListener('change', () => {
    syncMode();
    if (!input.value.length) return;
    try { run(); } catch (caught) { fail(caught); }
  });

  context.addEventListener('change', () => {
    if (mode.value !== 'escape' || !input.value.length) return;
    try { run(); } catch (caught) { fail(caught); }
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { run(); } catch (caught) { fail(caught); }
    }
  });

  syncMode();
})();