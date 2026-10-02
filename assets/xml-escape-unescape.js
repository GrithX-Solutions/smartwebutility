(() => {
  'use strict';
  if (!document.body.hasAttribute('data-xml-escape-tool')) return;

  const input = document.getElementById('xmlEscapeInput');
  const output = document.getElementById('xmlEscapeOutput');
  const file = document.getElementById('xmlEscapeFile');
  const mode = document.getElementById('xmlEscapeMode');
  const status = document.getElementById('xmlEscapeStatus');
  const error = document.getElementById('xmlEscapeError');
  const warnings = document.getElementById('xmlEscapeWarnings');
  const stats = document.getElementById('xmlEscapeStats');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  function isXml10Char(codePoint) {
    return codePoint === 0x9 ||
      codePoint === 0xA ||
      codePoint === 0xD ||
      (codePoint >= 0x20 && codePoint <= 0xD7FF) ||
      (codePoint >= 0xE000 && codePoint <= 0xFFFD) ||
      (codePoint >= 0x10000 && codePoint <= 0x10FFFF);
  }

  function assertXml10Chars(text) {
    for (const character of text) {
      const codePoint = character.codePointAt(0);
      if (!isXml10Char(codePoint)) {
        throw new Error(
          'Input contains U+' + codePoint.toString(16).toUpperCase().padStart(4, '0') +
          ', which is not allowed in XML 1.0.'
        );
      }
    }
  }

  function escapeXml(text, selectedMode) {
    assertXml10Chars(text);

    let replacements = 0;
    const replace = (pattern, entity) => {
      text = text.replace(pattern, () => {
        replacements++;
        return entity;
      });
    };

    replace(/&/g, '&amp;');
    replace(/</g, '&lt;');
    replace(/>/g, '&gt;');

    if (selectedMode === 'double' || selectedMode === 'all') {
      replace(/"/g, '&quot;');
    }
    if (selectedMode === 'single' || selectedMode === 'all') {
      replace(/'/g, '&apos;');
    }

    return { text, replacements, warnings: [] };
  }

  function unescapeXml(text) {
    const named = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'"
    };
    let replacements = 0;
    let invalidNumeric = 0;

    const decoded = text.replace(/&(amp|lt|gt|quot|apos);|&#([0-9]+);|&#x([0-9A-Fa-f]+);/g, match => {
      if (Object.prototype.hasOwnProperty.call(named, match)) {
        replacements++;
        return named[match];
      }

      let codePoint;
      if (match.startsWith('&#x')) {
        codePoint = parseInt(match.slice(3, -1), 16);
      } else {
        codePoint = parseInt(match.slice(2, -1), 10);
      }

      if (!Number.isFinite(codePoint) || !isXml10Char(codePoint)) {
        invalidNumeric++;
        return match;
      }

      replacements++;
      return String.fromCodePoint(codePoint);
    });

    const unknownEntities = decoded.match(/&[A-Za-z_][A-Za-z0-9._:-]*;/g) || [];
    const warningList = [];
    if (invalidNumeric) {
      warningList.push(invalidNumeric + ' numeric reference(s) were left unchanged because they are not valid XML 1.0 characters.');
    }
    if (unknownEntities.length) {
      warningList.push(unknownEntities.length + ' non-predefined named entity reference(s) were left unchanged.');
    }

    return { text: decoded, replacements, warnings: warningList };
  }

  function process() {
    error.hidden = true;
    error.textContent = '';
    warnings.hidden = true;
    warnings.innerHTML = '';

    const raw = input.value;
    if (!raw) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add input');
      return;
    }

    const selected = mode.value;
    const result = selected === 'unescape'
      ? unescapeXml(raw)
      : escapeXml(raw, selected);

    output.value = result.text;
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + [...raw].length.toLocaleString() + '</b> input characters</span>' +
      '<span><b>' + [...result.text].length.toLocaleString() + '</b> output characters</span>' +
      '<span><b>' + result.replacements.toLocaleString() + '</b> replacements</span>';

    if (result.warnings.length) {
      warnings.hidden = false;
      warnings.innerHTML = result.warnings.map(item => '<span>' + item + '</span>').join('');
    }

    setStatus(selected === 'unescape' ? 'Unescaped' : 'Escaped', 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    warnings.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix input', 'error');
  }

  document.getElementById('runXmlEscape').addEventListener('click', () => {
    try { process(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleXmlEscape').addEventListener('click', () => {
    mode.value = 'text';
    input.value = 'Tom & Jerry <message priority="high">Use ]]> carefully.</message>';
    try { process(); } catch (caught) { fail(caught); }
  });

  document.getElementById('swapXmlEscape').addEventListener('click', () => {
    if (!output.value) return;
    input.value = output.value;
    mode.value = mode.value === 'unescape' ? 'text' : 'unescape';
    try { process(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearXmlEscape').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    warnings.hidden = true;
    stats.hidden = true;
    mode.value = 'text';
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
    const url = URL.createObjectURL(new Blob([output.value], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = mode.value === 'unescape' ? 'unescaped.txt' : 'escaped.txt';
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
      fail(new Error('Please choose a text or XML file smaller than 5 MB.'));
      return;
    }
    input.value = await chosen.text();
    try { process(); } catch (caught) { fail(caught); }
  });

  mode.addEventListener('change', () => {
    if (!input.value) return;
    try { process(); } catch (caught) { fail(caught); }
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { process(); } catch (caught) { fail(caught); }
    }
  });
})();