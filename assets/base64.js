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
  const fileInput = document.getElementById('base64File');
  const year = document.getElementById('year');
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  let selectedFile = null;

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

  const bytesToBase64 = (bytes) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const utf8ToBase64 = (str) => bytesToBase64(new TextEncoder().encode(str));

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

  async function encodeSelectedFile(file) {
    clearError();
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      output.value = '';
      showError('Please choose a file smaller than 5 MB.');
      return;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let encoded = bytesToBase64(bytes);
      if (urlSafe.checked) encoded = toUrlSafe(encoded);
      output.value = encoded;
      input.value = '';
      selectedFile = file;
      setStatus('Encoded file · ' + file.name + ' · ' + bytes.length.toLocaleString() + ' bytes', 'success');
    } catch (err) {
      selectedFile = null;
      output.value = '';
      showError(err && err.message ? err.message : 'Could not read the selected file.');
    }
  }

  async function run() {
    clearError();

    if (selectedFile && mode.value === 'encode') {
      await encodeSelectedFile(selectedFile);
      return;
    }

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
          if (!validBase64Url(candidate)) throw new Error('Input is not valid Base64URL text.');
          candidate = fromUrlSafe(candidate);
        } else {
          if (!validBase64(candidate)) throw new Error('Input is not valid Base64 text.');
        }
        output.value = base64ToUtf8(candidate);
        setStatus(urlSafe.checked ? 'Decoded · Base64URL to UTF-8' : 'Decoded · Base64 to UTF-8', 'success');
      }
    } catch (err) {
      output.value = '';
      showError(err.message || 'Could not process the Base64 input.');
    }
  }

  document.getElementById('runBase64').addEventListener('click', run);

  document.getElementById('swapBase64').addEventListener('click', () => {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    const currentOut = output.value;
    if (currentOut) input.value = currentOut;
    mode.value = mode.value === 'encode' ? 'decode' : 'encode';
    run();
  });

  document.getElementById('clearBase64').addEventListener('click', () => {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    input.value = '';
    output.value = '';
    clearError();
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('exampleBase64').addEventListener('click', () => {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (mode.value === 'encode') {
      input.value = 'Smart Web Utility ✓';
    } else {
      input.value = 'U21hcnQgV2ViIFV0aWxpdHkg4pyT';
    }
    run();
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    mode.value = 'encode';
    await encodeSelectedFile(file);
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
    const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode.value === 'encode' ? 'base64-encoded.txt' : 'base64-decoded.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  mode.addEventListener('change', () => {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    clearError();
    output.value = '';
    setStatus(mode.value === 'encode' ? 'Encode mode' : 'Decode UTF-8 text mode');
  });

  urlSafe.addEventListener('change', () => {
    if (selectedFile && mode.value === 'encode') {
      encodeSelectedFile(selectedFile);
    } else if (input.value) {
      run();
    }
  });

  input.addEventListener('input', () => {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
  });

  input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });
})();
