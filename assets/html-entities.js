(() => {
  'use strict';

  const input = document.getElementById('htmlEntityInput');
  const output = document.getElementById('htmlEntityOutput');
  const mode = document.getElementById('htmlEntityMode');
  const format = document.getElementById('htmlEntityFormat');
  const nonAscii = document.getElementById('htmlEntityNonAscii');
  const status = document.getElementById('htmlEntityStatus');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const namedEssentials = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  const setStatus = (message, kind='neutral') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  function numericReference(character, style) {
    const codePoint = character.codePointAt(0);
    return style === 'hex'
      ? '&#x' + codePoint.toString(16).toUpperCase() + ';'
      : '&#' + codePoint + ';';
  }

  function encode(text) {
    let result = '';

    for (const character of text) {
      const isEssential = Object.prototype.hasOwnProperty.call(namedEssentials, character);
      const isNonAscii = character.codePointAt(0) > 0x7F;

      if (!isEssential && !(nonAscii.checked && isNonAscii)) {
        result += character;
        continue;
      }

      if (format.value === 'named' && isEssential) {
        result += namedEssentials[character];
      } else {
        result += numericReference(character, format.value === 'hex' ? 'hex' : 'decimal');
      }
    }

    return result;
  }

  function decode(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  function syncControls() {
    const encoding = mode.value === 'encode';
    format.disabled = !encoding;
    nonAscii.disabled = !encoding;
  }

  function run() {
    const value = input.value;

    if (!value) {
      output.value = '';
      setStatus('Ready');
      return;
    }

    if (mode.value === 'encode') {
      output.value = encode(value);
      const label = format.value === 'named' ? 'named essentials' : format.value;
      setStatus('Encoded · ' + label + (nonAscii.checked ? ' + non-ASCII' : ''), 'success');
    } else {
      output.value = decode(value);
      setStatus('Decoded · one pass', 'success');
    }
  }

  document.getElementById('runHtmlEntity').addEventListener('click', run);

  document.getElementById('clearHtmlEntity').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    mode.value = 'encode';
    format.value = 'named';
    nonAscii.checked = false;
    syncControls();
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('swapHtmlEntity').addEventListener('click', () => {
    if (output.value) input.value = output.value;
    mode.value = mode.value === 'encode' ? 'decode' : 'encode';
    syncControls();
    run();
  });

  document.getElementById('copyHtmlEntity').addEventListener('click', async event => {
    if (!output.value) return;
    await navigator.clipboard.writeText(output.value);
    const button = event.currentTarget;
    const old = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => button.textContent = old, 1200);
  });

  mode.addEventListener('change', () => {
    syncControls();
    if (input.value) run();
  });
  format.addEventListener('change', () => {
    if (input.value && mode.value === 'encode') run();
  });
  nonAscii.addEventListener('change', () => {
    if (input.value && mode.value === 'encode') run();
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });

  syncControls();
})();
