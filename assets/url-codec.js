(() => {
  'use strict';

  const input = document.getElementById('urlInput');
  const output = document.getElementById('urlOutput');
  const mode = document.getElementById('urlMode');
  const component = document.getElementById('urlComponent');
  const formEncoding = document.getElementById('urlFormEncoding');
  const status = document.getElementById('urlStatus');
  const error = document.getElementById('urlError');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const setStatus = (message, kind='neutral') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  const fail = message => {
    error.textContent = message;
    error.hidden = false;
    output.value = '';
    setStatus('Error', 'error');
  };

  function malformedPercentIndex(value) {
    const match = /%(?![0-9A-Fa-f]{2})/.exec(value);
    return match ? match.index : -1;
  }

  function syncFormMode() {
    formEncoding.disabled = !component.checked;
    if (!component.checked) formEncoding.checked = false;
  }

  function encodeValue(value) {
    if (!component.checked) return encodeURI(value);
    const encoded = encodeURIComponent(value);
    return formEncoding.checked ? encoded.replace(/%20/g, '+') : encoded;
  }

  function decodeValue(value) {
    const invalidIndex = malformedPercentIndex(value);
    if (invalidIndex >= 0) {
      throw new Error('Malformed percent escape at index ' + invalidIndex + '. Expected % followed by two hexadecimal digits.');
    }

    if (!component.checked) return decodeURI(value);
    const source = formEncoding.checked ? value.replace(/\+/g, ' ') : value;
    return decodeURIComponent(source);
  }

  function run() {
    error.hidden = true;
    error.textContent = '';

    const value = input.value;
    if (!value) {
      output.value = '';
      return setStatus('Ready');
    }

    try {
      if (mode.value === 'encode') {
        output.value = encodeValue(value);
        setStatus(formEncoding.checked ? 'Encoded · form value' : (component.checked ? 'Encoded · component' : 'Encoded · full URL'), 'success');
      } else {
        output.value = decodeValue(value);
        setStatus(formEncoding.checked ? 'Decoded · form value' : (component.checked ? 'Decoded · component' : 'Decoded · full URL'), 'success');
      }
    } catch (caught) {
      const message = caught?.message === 'URI malformed'
        ? 'Could not decode: percent escapes may form invalid UTF-8.'
        : (caught?.message || 'Could not process URL text.');
      fail(message);
    }
  }

  document.getElementById('runUrlCodec').addEventListener('click', run);

  document.getElementById('clearUrlCodec').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    mode.value = 'encode';
    component.checked = true;
    formEncoding.checked = false;
    syncFormMode();
    error.hidden = true;
    error.textContent = '';
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('swapUrlCodec').addEventListener('click', () => {
    if (output.value) input.value = output.value;
    mode.value = mode.value === 'encode' ? 'decode' : 'encode';
    run();
  });

  document.getElementById('copyUrlCodec').addEventListener('click', async event => {
    if (!output.value) return;
    await navigator.clipboard.writeText(output.value);
    const button = event.currentTarget;
    const old = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => button.textContent = old, 1200);
  });

  mode.addEventListener('change', run);
  component.addEventListener('change', () => {
    syncFormMode();
    run();
  });
  formEncoding.addEventListener('change', run);

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });

  syncFormMode();
})();
