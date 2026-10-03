(() => {
  'use strict';
  if (!document.body.hasAttribute('data-mac-generator')) return;

  const countEl = document.getElementById('macCount');
  const formatEl = document.getElementById('macFormat');
  const administrationEl = document.getElementById('macAdministration');
  const transmissionEl = document.getElementById('macTransmission');
  const listFormatEl = document.getElementById('macListFormat');
  const uppercaseEl = document.getElementById('macUppercase');
  const sortEl = document.getElementById('macSort');
  const output = document.getElementById('macOutput');
  const status = document.getElementById('macStatus');
  const error = document.getElementById('macError');
  const stats = document.getElementById('macStats');
  let currentBatch = [];

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  function randomMacBytes() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);

    const localBit = administrationEl.value === 'local' ? 0x02 : 0x00;
    const groupBit = transmissionEl.value === 'multicast' ? 0x01 : 0x00;
    bytes[0] = (bytes[0] & 0xfc) | localBit | groupBit;

    return bytes;
  }

  function hexByte(value) {
    const text = value.toString(16).padStart(2, '0');
    return uppercaseEl.checked ? text.toUpperCase() : text.toLowerCase();
  }

  function formatMac(bytes) {
    const parts = [...bytes].map(hexByte);
    if (formatEl.value === 'compact') return parts.join('');
    if (formatEl.value === 'hyphen') return parts.join('-');
    if (formatEl.value === 'cisco') return [parts[0] + parts[1], parts[2] + parts[3], parts[4] + parts[5]].join('.');
    return parts.join(':');
  }

  function canonicalKey(bytes) {
    return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function serialize(values) {
    if (listFormatEl.value === 'json') return JSON.stringify(values, null, 2);
    if (listFormatEl.value === 'csv') return 'mac_address\n' + values.map(value => '"' + value.replace(/"/g, '""') + '"').join('\n');
    if (listFormatEl.value === 'comma') return values.join(', ');
    return values.join('\n');
  }

  function render() {
    if (!currentBatch.length) {
      output.value = '';
      stats.hidden = true;
      return;
    }
    let values = currentBatch.map(formatMac);
    if (sortEl.checked) values = [...values].sort((a, b) => a.localeCompare(b, 'en', {sensitivity:'base'}));
    output.value = serialize(values);

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + values.length.toLocaleString() + '</b> generated</span>' +
      '<span><b>48-bit</b> address width</span>' +
      '<span><b>' + (administrationEl.value === 'local' ? 'Local' : 'Universal-style') + '</b> U/L bit</span>' +
      '<span><b>' + (transmissionEl.value === 'unicast' ? 'Unicast' : 'Multicast') + '</b> I/G bit</span>' +
      '<span><b>' + formatEl.options[formatEl.selectedIndex].text.split(' · ')[0] + '</b> MAC format</span>' +
      '<span><b>' + listFormatEl.options[listFormatEl.selectedIndex].text + '</b> list output</span>';
  }

  function generate() {
    error.hidden = true;
    error.textContent = '';

    const count = Number(countEl.value);
    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      throw new Error('Choose a MAC address count between 1 and 1,000.');
    }

    const seen = new Set();
    currentBatch = [];
    while (currentBatch.length < count) {
      const bytes = randomMacBytes();
      const key = canonicalKey(bytes);
      if (seen.has(key)) continue;
      seen.add(key);
      currentBatch.push(bytes);
    }

    render();
    setStatus(count + ' MAC address' + (count === 1 ? '' : 'es') + ' generated', 'success');
  }

  function fail(caught) {
    currentBatch = [];
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
    countEl.value = '1';
    formatEl.value = 'colon';
    administrationEl.value = 'local';
    transmissionEl.value = 'unicast';
    listFormatEl.value = 'lines';
    uppercaseEl.checked = true;
    sortEl.checked = false;
    currentBatch = [];
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
    const type = listFormatEl.value === 'json' ? 'application/json' : (listFormatEl.value === 'csv' ? 'text/csv' : 'text/plain');
    const ext = listFormatEl.value === 'json' ? 'json' : (listFormatEl.value === 'csv' ? 'csv' : 'txt');
    const suffix = listFormatEl.value === 'json' ? '' : '\n';
    const url = URL.createObjectURL(new Blob([output.value + suffix], {type:type + ';charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'random-mac-addresses.' + ext;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded', 'success');
  });

  for (const control of [formatEl, listFormatEl, uppercaseEl, sortEl]) {
    control.addEventListener('change', () => {
      if (!currentBatch.length) return;
      render();
      setStatus('Batch re-rendered', 'success');
    });
  }

  for (const control of [administrationEl, transmissionEl]) {
    control.addEventListener('change', () => {
      if (!currentBatch.length) return;
      setStatus('Generate again to apply address-bit changes');
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