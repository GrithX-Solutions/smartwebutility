(() => {
  'use strict';
  if (!document.body.hasAttribute('data-mac-generator')) return;

  const countEl = document.getElementById('macCount');
  const formatEl = document.getElementById('macFormat');
  const uppercaseEl = document.getElementById('macUppercase');
  const sortEl = document.getElementById('macSort');
  const output = document.getElementById('macOutput');
  const status = document.getElementById('macStatus');
  const error = document.getElementById('macError');
  const stats = document.getElementById('macStats');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  function randomMacBytes() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    bytes[0] = (bytes[0] & 0xfc) | 0x02;
    return bytes;
  }

  function hexByte(value) {
    let text = value.toString(16).padStart(2, '0');
    return uppercaseEl.checked ? text.toUpperCase() : text.toLowerCase();
  }

  function formatMac(bytes) {
    const parts = [...bytes].map(hexByte);
    if (formatEl.value === 'compact') return parts.join('');
    if (formatEl.value === 'hyphen') return parts.join('-');
    return parts.join(':');
  }

  function canonicalKey(bytes) {
    return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function generate() {
    error.hidden = true;
    error.textContent = '';

    const count = Number(countEl.value);
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      throw new Error('Choose a MAC address count between 1 and 500.');
    }

    const seen = new Set();
    const values = [];

    while (values.length < count) {
      const bytes = randomMacBytes();
      const key = canonicalKey(bytes);
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(formatMac(bytes));
    }

    if (sortEl.checked) {
      values.sort((a, b) => a.localeCompare(b, 'en', {sensitivity:'base'}));
    }

    output.value = values.join('\n');

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + count.toLocaleString() + '</b> generated</span>' +
      '<span><b>48-bit</b> address width</span>' +
      '<span><b>Local</b> U/L bit</span>' +
      '<span><b>Unicast</b> I/G bit</span>' +
      '<span><b>' + formatEl.options[formatEl.selectedIndex].text.split(' · ')[0] + '</b> format</span>';

    setStatus(count + ' MAC address' + (count === 1 ? '' : 'es') + ' generated', 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix options', 'error');
  }

  document.getElementById('generateMac').addEventListener('click', () => {
    try { generate(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearMac').addEventListener('click', () => {
    countEl.value = '10';
    formatEl.value = 'colon';
    uppercaseEl.checked = true;
    sortEl.checked = false;
    output.value = '';
    stats.hidden = true;
    error.hidden = true;
    setStatus('Ready');
  });

  document.getElementById('copyMac').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadMac').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value + '\n'], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'random-mac-addresses.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded', 'success');
  });

  for (const control of [formatEl, uppercaseEl, sortEl]) {
    control.addEventListener('change', () => {
      if (!output.value) return;
      try { generate(); } catch (caught) { fail(caught); }
    });
  }

  countEl.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      try { generate(); } catch (caught) { fail(caught); }
    }
  });

  generate();
})();