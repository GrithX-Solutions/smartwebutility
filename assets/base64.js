(() => {
  'use strict';

  const input = document.getElementById('base64Input');
  const output = document.getElementById('base64Output');
  const mode = document.getElementById('base64Mode');
  const urlSafe = document.getElementById('urlSafe');
  const status = document.getElementById('base64Status');
  const error = document.getElementById('base64Error');
  const copyBtn = document.getElementById('copyBase64');
  const downloadBtn = document.getElementById('downloadBase64');
  const year = document.getElementById('year');

  if (year) year.textContent = new Date().getFullYear();

  const setStatus = (msg, kind = 'neutral') => {
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

  const utf8ToBase64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  };

  const base64ToUtf8 = (b64) => {
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  };

  const toUrlSafe = (b64) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const fromUrlSafe = (b64) => {
    let normalized = b64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    const mod = normalized.length % 4;
    if (mod) normalized += '='.repeat(4 - mod);
    return normalized;
  };

  const validBase64 = (value) => /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0;
  const validBase64Url = (value) => /^[A-Za-z0-9_-]+={0,2}$/.test(value);

  function run() {
    clearError();
    const source = input.value;
    if (!source) {
      output.value = '';
      setStatus('Ready');
      return;
    }

    try {
      if (mode.value === 'encode') {
        let encoded = utf8ToBase64(source);
        if (urlSafe.checked) encoded = toUrlSafe(encoded);
        output.value = encoded;
        setStatus(urlSafe.checked ? 'Encoded · URL-safe Base64' : 'Encoded · Base64', 'success');
      } else {
        let candidate = source.trim().replace(/\s+/g, '');
        if (urlSafe.checked) {
          if (!validBase64Url(candidate)) throw new Error('Input is not valid Base64 URL-safe text.');
          candidate = fromUrlSafe(candidate);
        } else {
          if (!validBase64(candidate)) throw new Error('Input is not valid Base64 text.');
        }
        output.value = base64ToUtf8(candidate);
        setStatus(urlSafe.checked ? 'Decoded · URL-safe Base64' : 'Decoded · Base64', 'success');
      }
    } catch (err) {
      output.value = '';
      showError(err.message || 'Could not process the Base64 input.');
    }
  }

  document.getElementById('runBase64').addEventListener('click', run);
  document.getElementById('swapBase64').addEventListener('click', () => {
    const currentOut = output.value;
    if (currentOut) input.value = currentOut;
    mode.value = mode.value === 'encode' ? 'decode' : 'encode';
    run();
  });

  document.getElementById('clearBase64').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    clearError();
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('exampleBase64').addEventListener('click', () => {
    if (mode.value === 'encode') {
      input.value = 'Smart Web Utility ✓';
    } else {
      input.value = urlSafe.checked ? 'U21hcnQgV2ViIFV0aWxpdHkg4pyT' : 'U21hcnQgV2ViIFV0aWxpdHkg4pyT';
    }
    run();
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
    const ext = mode.value === 'encode' ? 'txt' : 'txt';
    const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode.value === 'encode' ? 'base64-encoded.' + ext : 'base64-decoded.' + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  mode.addEventListener('change', () => {
    clearError();
    output.value = '';
    setStatus(mode.value === 'encode' ? 'Encode mode' : 'Decode mode');
  });

  urlSafe.addEventListener('change', () => {
    if (input.value) run();
  });

  input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });
})();
