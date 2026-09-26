(() => {
  'use strict';

  const countEl = document.getElementById('uuidCount');
  const uppercaseEl = document.getElementById('uuidUppercase');
  const hyphenEl = document.getElementById('uuidHyphens');
  const output = document.getElementById('uuidOutput');
  const status = document.getElementById('uuidStatus');
  const error = document.getElementById('uuidError');
  const copyBtn = document.getElementById('copyUuid');
  const downloadBtn = document.getElementById('downloadUuid');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const setStatus = (msg, kind='neutral') => {
    status.textContent = msg;
    status.dataset.kind = kind;
  };

  const showError = (msg) => {
    error.textContent = msg;
    error.hidden = false;
    setStatus('Error', 'error');
  };

  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
  };

  function uuidV4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(b => b.toString(16).padStart(2,'0'));
    return [
      hex.slice(0,4).join(''),
      hex.slice(4,6).join(''),
      hex.slice(6,8).join(''),
      hex.slice(8,10).join(''),
      hex.slice(10,16).join('')
    ].join('-');
  }

  function transform(value) {
    let out = value;
    if (!hyphenEl.checked) out = out.replace(/-/g, '');
    if (uppercaseEl.checked) out = out.toUpperCase();
    return out;
  }

  function generate() {
    clearError();
    let count = Number(countEl.value);
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      return showError('Choose a UUID count between 1 and 500.');
    }
    const values = Array.from({ length: count }, () => transform(uuidV4()));
    output.value = values.join('\n');
    setStatus(`${count} UUID${count === 1 ? '' : 's'} generated`, 'success');
  }

  document.getElementById('generateUuid').addEventListener('click', generate);
  document.getElementById('clearUuid').addEventListener('click', () => {
    output.value = '';
    clearError();
    setStatus('Ready');
  });

  copyBtn.addEventListener('click', async () => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      const old = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(() => copyBtn.textContent = old, 1200);
    } catch {
      output.select();
      document.execCommand('copy');
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!output.value) return;
    const blob = new Blob([output.value + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uuid-v4.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  [uppercaseEl, hyphenEl].forEach(el => el.addEventListener('change', () => {
    if (output.value) generate();
  }));

  countEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generate();
    }
  });

  generate();
})();