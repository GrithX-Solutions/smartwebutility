(() => {
  'use strict';
  if (!document.body.hasAttribute('data-regex-escaper')) return;

  const input = document.getElementById('regexEscapeInput');
  const output = document.getElementById('regexEscapeOutput');
  const file = document.getElementById('regexEscapeFile');
  const format = document.getElementById('regexEscapeFormat');
  const flags = document.getElementById('regexEscapeFlags');
  const status = document.getElementById('regexEscapeStatus');
  const error = document.getElementById('regexEscapeError');
  const stats = document.getElementById('regexEscapeStats');

  const syntaxChars = new Set(['^', '$', '\\', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|', '/']);
  const punctuatorChars = new Set([',', '-', '=', '<', '>', '#', '&', '!', '%', ':', ';', '@', '~', "'", '"']);
  punctuatorChars.add(String.fromCharCode(96));

  const shortEscapes = new Map([
    ['\f', '\\f'],
    ['\n', '\\n'],
    ['\r', '\\r'],
    ['\t', '\\t'],
    ['\v', '\\v']
  ]);

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const hex2 = codePoint => '\\x' + codePoint.toString(16).padStart(2, '0');
  const hex4 = codeUnit => '\\u' + codeUnit.toString(16).padStart(4, '0');

  function utf16Escapes(text) {
    let escaped = '';
    for (let i = 0; i < text.length; i++) {
      escaped += hex4(text.charCodeAt(i));
    }
    return escaped;
  }

  function fallbackRegExpEscape(value) {
    let escaped = '';
    let first = true;

    for (const ch of value) {
      const cp = ch.codePointAt(0);

      if (first && cp <= 0x7f && /[A-Za-z0-9]/.test(ch)) {
        escaped += hex2(cp);
      } else if (syntaxChars.has(ch)) {
        escaped += '\\' + ch;
      } else if (punctuatorChars.has(ch)) {
        escaped += cp <= 0xff ? hex2(cp) : utf16Escapes(ch);
      } else if (shortEscapes.has(ch)) {
        escaped += shortEscapes.get(ch);
      } else if (ch === ' ') {
        escaped += '\\x20';
      } else if (cp >= 0xd800 && cp <= 0xdfff) {
        escaped += hex4(cp);
      } else if (cp > 0x7f && /\s/u.test(ch)) {
        escaped += utf16Escapes(ch);
      } else {
        escaped += ch;
      }

      first = false;
    }

    return escaped;
  }

  function escapeValue(value) {
    if (typeof RegExp.escape === 'function') {
      return { escaped: RegExp.escape(value), engine: 'Native RegExp.escape' };
    }
    return { escaped: fallbackRegExpEscape(value), engine: 'Compatibility fallback' };
  }

  function validateFlags(value) {
    try {
      new RegExp('', value);
      return true;
    } catch (caught) {
      throw new Error('Invalid or unsupported regular-expression flags: ' + caught.message);
    }
  }

  function renderOutput(escaped) {
    const selected = format.value;
    const flagText = flags.value.trim();

    if (selected !== 'pattern') validateFlags(flagText);

    if (selected === 'constructor') {
      return flagText
        ? 'new RegExp(' + JSON.stringify(escaped) + ', ' + JSON.stringify(flagText) + ')'
        : 'new RegExp(' + JSON.stringify(escaped) + ')';
    }

    if (selected === 'literal') {
      return '/' + escaped + '/' + flagText;
    }

    return escaped;
  }

  function run() {
    error.hidden = true;
    error.textContent = '';

    const raw = input.value;
    if (!raw.length) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add text');
      return;
    }

    const result = escapeValue(raw);

    try {
      new RegExp(result.escaped);
    } catch (caught) {
      throw new Error('Escaped pattern could not be compiled: ' + caught.message);
    }

    const rendered = renderOutput(result.escaped);
    output.value = rendered;

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + raw.length.toLocaleString() + '</b> input chars</span>' +
      '<span><b>' + result.escaped.length.toLocaleString() + '</b> pattern chars</span>' +
      '<span><b>' + result.engine + '</b> engine</span>' +
      '<span><b>' + format.options[format.selectedIndex].text + '</b> output</span>';

    setStatus('Escaped', 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix options', 'error');
  }

  function syncFormat() {
    flags.disabled = format.value === 'pattern';
  }

  document.getElementById('escapeRegex').addEventListener('click', () => {
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleRegexEscape').addEventListener('click', () => {
    input.value = 'developer.mozilla.org/path?x=1+y';
    format.value = 'pattern';
    flags.value = 'u';
    syncFormat();
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearRegexEscape').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    format.value = 'pattern';
    flags.value = 'u';
    syncFormat();
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('copyRegexEscape').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadRegexEscape').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'regex-escaped.txt';
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
      fail(new Error('Please choose a text file smaller than 5 MB.'));
      return;
    }
    input.value = await chosen.text();
    try { run(); } catch (caught) { fail(caught); }
  });

  format.addEventListener('change', () => {
    syncFormat();
    if (!input.value.length) return;
    try { run(); } catch (caught) { fail(caught); }
  });

  flags.addEventListener('change', () => {
    if (format.value === 'pattern' || !input.value.length) return;
    try { run(); } catch (caught) { fail(caught); }
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { run(); } catch (caught) { fail(caught); }
    }
  });

  syncFormat();
})();