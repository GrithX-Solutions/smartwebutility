(() => {
  'use strict';
  if (!document.body.hasAttribute('data-uuid-generator')) return;

  const versionEl = document.getElementById('uuidVersion');
  const countEl = document.getElementById('uuidCount');
  const formatEl = document.getElementById('uuidFormat');
  const uppercaseEl = document.getElementById('uuidUppercase');
  const listFormatEl = document.getElementById('uuidListFormat');
  const output = document.getElementById('uuidOutput');
  const outputTitle = document.getElementById('uuidOutputTitle');
  const status = document.getElementById('uuidStatus');
  const error = document.getElementById('uuidError');
  const stats = document.getElementById('uuidStats');
  const copyBtn = document.getElementById('copyUuid');
  const downloadBtn = document.getElementById('downloadUuid');
  const nilBtn = document.getElementById('uuidNil');
  const maxBtn = document.getElementById('uuidMax');
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';
  const MAX_UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  const setStatus = (message, kind = 'neutral') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
  };

  const showError = message => {
    error.textContent = message;
    error.hidden = false;
    stats.hidden = true;
    setStatus('Error', 'error');
  };

  function bytesToCanonical(bytes) {
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0'));
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join('')
    ].join('-');
  }

  function uuidV4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytesToCanonical(bytes);
  }

  function uuidV7() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    const timestamp = BigInt(Date.now());
    bytes[0] = Number((timestamp >> 40n) & 0xffn);
    bytes[1] = Number((timestamp >> 32n) & 0xffn);
    bytes[2] = Number((timestamp >> 24n) & 0xffn);
    bytes[3] = Number((timestamp >> 16n) & 0xffn);
    bytes[4] = Number((timestamp >> 8n) & 0xffn);
    bytes[5] = Number(timestamp & 0xffn);

    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return bytesToCanonical(bytes);
  }

  function applyFormat(canonical) {
    let hex = uppercaseEl.checked ? canonical.toUpperCase() : canonical;
    const format = formatEl.value;

    if (format === 'compact') return hex.replace(/-/g, '');
    if (format === 'braces') return '{' + hex + '}';
    if (format === 'parentheses') return '(' + hex + ')';
    if (format === 'urn') return 'urn:uuid:' + hex;
    return hex;
  }

  function generate() {
    clearError();

    const count = Number(countEl.value);
    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      showError('Choose an identifier count between 1 and 1,000.');
      return;
    }

    const version = versionEl.value;
    const generator = version === '7' ? uuidV7 : uuidV4;
    const values = Array.from({ length: count }, () => applyFormat(generator()));

    if (listFormatEl.value === 'json') output.value = JSON.stringify(values, null, 2);
    else if (listFormatEl.value === 'comma') output.value = values.join(', ');
    else output.value = values.join('\n');
    outputTitle.textContent = version === '7' ? 'UUID v7 output' : 'UUID v4 / GUID output';

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + count.toLocaleString() + '</b> generated</span>' +
      '<span><b>v' + version + '</b> UUID version</span>' +
      '<span><b>' + formatEl.options[formatEl.selectedIndex].text + '</b> format</span>' +
      '<span><b>' + (uppercaseEl.checked ? 'Uppercase' : 'Lowercase') + '</b> hex</span>' +
      '<span><b>' + listFormatEl.options[listFormatEl.selectedIndex].text + '</b> list output</span>';

    setStatus(count + ' ' + (version === '4' ? 'UUID/GUID' : 'UUID v7') + (count === 1 ? '' : ' values') + ' generated', 'success');
  }

  function showSpecial(canonical, label) {
    clearError();
    countEl.value = '1';
    const value = applyFormat(canonical);
    if (listFormatEl.value === 'json') output.value = JSON.stringify([value], null, 2);
    else output.value = value;
    outputTitle.textContent = label + ' output';
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>1</b> special UUID</span>' +
      '<span><b>' + label + '</b> RFC 9562 sentinel</span>' +
      '<span><b>' + formatEl.options[formatEl.selectedIndex].text + '</b> format</span>' +
      '<span><b>' + (uppercaseEl.checked ? 'Uppercase' : 'Lowercase') + '</b> hex</span>';
    setStatus(label + ' ready', 'success');
  }

  document.getElementById('generateUuid').addEventListener('click', generate);
  nilBtn.addEventListener('click', () => showSpecial(NIL_UUID, 'Nil UUID'));
  maxBtn.addEventListener('click', () => showSpecial(MAX_UUID, 'Max UUID'));

  document.getElementById('clearUuid').addEventListener('click', () => {
    output.value = '';
    stats.hidden = true;
    clearError();
    setStatus('Ready');
  });

  copyBtn.addEventListener('click', async () => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
    } catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  downloadBtn.addEventListener('click', () => {
    if (!output.value) return;
    const version = versionEl.value;
    const blob = new Blob([output.value + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'uuid-guid-v' + version + '.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded', 'success');
  });

  [versionEl, formatEl, listFormatEl, uppercaseEl].forEach(control => {
    control.addEventListener('change', () => {
      if (output.value) generate();
    });
  });

  countEl.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      generate();
    }
  });

  generate();
})();