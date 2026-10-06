(() => {
  'use strict';

  const input = document.getElementById('hashInput');
  const algo = document.getElementById('hashAlgorithm');
  const uppercase = document.getElementById('hashUppercase');
  const output = document.getElementById('hashOutput');
  const fileInput = document.getElementById('hashFile');
  const expectedInput = document.getElementById('expectedHash');
  const verifyStatus = document.getElementById('hashVerifyStatus');
  const status = document.getElementById('hashStatus');
  const error = document.getElementById('hashError');
  const copyBtn = document.getElementById('copyHash');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const digestLengths = {
    'SHA-1': 40,
    'SHA-256': 64,
    'SHA-384': 96,
    'SHA-512': 128
  };
  let currentDigest = '';

  const setStatus = (msg, kind='neutral') => {
    status.textContent = msg;
    status.dataset.kind = kind;
  };
  const setVerifyStatus = (msg, kind='neutral') => {
    verifyStatus.textContent = msg;
    verifyStatus.dataset.kind = kind;
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
  const toHex = (buffer) => [...new Uint8Array(buffer)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  function renderDigest() {
    output.value = uppercase.checked ? currentDigest.toUpperCase() : currentDigest;
  }

  function extractExpectedDigest(raw) {
    const length = digestLengths[algo.value];
    const trimmed = raw.trim();
    if (!trimmed) return { digest: '', error: '' };

    if (new RegExp('^[0-9a-fA-F]{' + length + '}$').test(trimmed)) {
      return { digest: trimmed.toLowerCase(), error: '' };
    }

    const pattern = new RegExp('(?:^|[^0-9a-fA-F])([0-9a-fA-F]{' + length + '})(?=$|[^0-9a-fA-F])', 'g');
    const matches = [];
    let match;
    while ((match = pattern.exec(trimmed)) !== null) {
      matches.push(match[1].toLowerCase());
    }

    if (matches.length === 1) {
      return { digest: matches[0], error: '' };
    }

    return {
      digest: '',
      error: 'Expected ' + algo.value + ' checksum must contain exactly one ' + length + '-character hexadecimal digest.'
    };
  }

  function verifyExpected() {
    const raw = expectedInput.value;
    if (!raw.trim()) {
      setVerifyStatus('Optional: paste the checksum published by your source.');
      return;
    }

    const parsed = extractExpectedDigest(raw);
    if (parsed.error) {
      setVerifyStatus(parsed.error, 'error');
      return;
    }

    if (!currentDigest) {
      setVerifyStatus('Generate a hash to verify this checksum.');
      return;
    }

    if (parsed.digest === currentDigest) {
      setVerifyStatus('Checksum matches the generated ' + algo.value + '.', 'success');
    } else {
      setVerifyStatus('Checksum does not match the generated ' + algo.value + '.', 'error');
    }
  }

  async function digest(data) {
    const result = await crypto.subtle.digest(algo.value, data);
    currentDigest = toHex(result);
    renderDigest();
    verifyExpected();
    setStatus(`${algo.value} generated`, 'success');
  }

  async function hashText() {
    clearError();
    if (!input.value) {
      currentDigest = '';
      output.value = '';
      verifyExpected();
      return showError('Enter text to hash.');
    }
    try {
      const bytes = new TextEncoder().encode(input.value);
      await digest(bytes);
    } catch (err) {
      currentDigest = '';
      output.value = '';
      verifyExpected();
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
      currentDigest = '';
      output.value = '';
      verifyExpected();
      showError(err.message || 'Could not hash this file.');
    }
  });

  document.getElementById('generateHash').addEventListener('click', hashText);
  document.getElementById('clearHash').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    expectedInput.value = '';
    fileInput.value = '';
    currentDigest = '';
    clearError();
    setStatus('Ready');
    setVerifyStatus('Optional: paste the checksum published by your source.');
    input.focus();
  });

  document.getElementById('exampleHash').addEventListener('click', () => {
    input.value = 'Smart Web Utility';
    hashText();
  });

  algo.addEventListener('change', () => {
    currentDigest = '';
    output.value = '';
    verifyExpected();

    if (fileInput.files && fileInput.files[0]) {
      fileInput.dispatchEvent(new Event('change'));
    } else if (input.value) {
      hashText();
    } else {
      setStatus('Ready');
    }
  });

  uppercase.addEventListener('change', () => {
    if (currentDigest) renderDigest();
  });

  expectedInput.addEventListener('input', verifyExpected);

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
