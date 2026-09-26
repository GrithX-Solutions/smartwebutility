(() => {
  'use strict';

  const input = document.getElementById('hashInput');
  const algo = document.getElementById('hashAlgorithm');
  const uppercase = document.getElementById('hashUppercase');
  const output = document.getElementById('hashOutput');
  const fileInput = document.getElementById('hashFile');
  const status = document.getElementById('hashStatus');
  const error = document.getElementById('hashError');
  const copyBtn = document.getElementById('copyHash');
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
  const hex = (buffer) => {
    let value = [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
    return uppercase.checked ? value.toUpperCase() : value;
  };

  async function digest(data) {
    const result = await crypto.subtle.digest(algo.value, data);
    output.value = hex(result);
    setStatus(`${algo.value} generated`, 'success');
  }

  async function hashText() {
    clearError();
    if (!input.value) {
      output.value = '';
      return showError('Enter text to hash.');
    }
    try {
      const bytes = new TextEncoder().encode(input.value);
      await digest(bytes);
    } catch (err) {
      output.value = '';
      showError(err.message || 'Could not generate the hash.');
    }
  }

  fileInput.addEventListener('change', async () => {
    clearError();
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      setStatus(`Hashing ${file.name}…`);
      const buffer = await file.arrayBuffer();
      await digest(buffer);
      setStatus(`${algo.value} generated for ${file.name}`, 'success');
    } catch (err) {
      output.value = '';
      showError(err.message || 'Could not hash this file.');
    }
  });

  document.getElementById('generateHash').addEventListener('click', hashText);
  document.getElementById('clearHash').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    fileInput.value = '';
    clearError();
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('exampleHash').addEventListener('click', () => {
    input.value = 'Smart Web Utility';
    hashText();
  });

  algo.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      fileInput.dispatchEvent(new Event('change'));
    } else if (input.value) {
      hashText();
    } else {
      setStatus('Ready');
    }
  });

  uppercase.addEventListener('change', () => {
    if (output.value) {
      output.value = uppercase.checked ? output.value.toUpperCase() : output.value.toLowerCase();
    }
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

  input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      hashText();
    }
  });
})();