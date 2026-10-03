(() => {
  'use strict';
  if (!document.body.hasAttribute('data-ulid-generator')) return;

  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const BASE = 32n;
  const MAX_TIME = (1n << 48n) - 1n;
  const MAX_RANDOM = (1n << 80n) - 1n;

  const countEl = document.getElementById('ulidCount');
  const monotonicEl = document.getElementById('ulidMonotonic');
  const customEl = document.getElementById('ulidCustomTime');
  const timestampEl = document.getElementById('ulidTimestamp');
  const output = document.getElementById('ulidOutput');
  const status = document.getElementById('ulidStatus');
  const error = document.getElementById('ulidError');
  const stats = document.getElementById('ulidStats');
  const tbody = document.querySelector('#ulidTable tbody');
  const inspectInput = document.getElementById('ulidInspectInput');
  const inspectError = document.getElementById('ulidInspectError');
  const inspectResult = document.getElementById('ulidInspectResult');
  const inspectNormalized = document.getElementById('ulidInspectNormalized');
  const inspectTimestampMs = document.getElementById('ulidInspectTimestampMs');
  const inspectTimestampUtc = document.getElementById('ulidInspectTimestampUtc');
  const inspectRandomBase32 = document.getElementById('ulidInspectRandomBase32');
  const inspectRandomHex = document.getElementById('ulidInspectRandomHex');

  let lastTimestamp = null;
  let lastRandom = null;
  let lastValues = [];

  const setStatus = (message, kind = 'neutral') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function encodeBigInt(value, length) {
    let current = BigInt(value);
    let result = '';
    for (let i = 0; i < length; i++) {
      result = ALPHABET[Number(current % BASE)] + result;
      current /= BASE;
    }
    if (current !== 0n) throw new Error('Value exceeds ULID encoding width.');
    return result;
  }

  function decodeBase32(text) {
    let value = 0n;
    for (const raw of text.toUpperCase()) {
      const index = ALPHABET.indexOf(raw);
      if (index < 0) throw new Error('Invalid Crockford Base32 character: ' + raw);
      value = value * BASE + BigInt(index);
    }
    return value;
  }

  function random80() {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    let value = 0n;
    for (const byte of bytes) value = (value << 8n) | BigInt(byte);
    return value;
  }

  function resolveTimestamp() {
    let milliseconds;

    if (customEl.checked) {
      if (!timestampEl.value) throw new Error('Choose a custom date and time.');
      milliseconds = new Date(timestampEl.value).getTime();
      if (!Number.isFinite(milliseconds)) throw new Error('The custom timestamp is not valid.');
    } else {
      milliseconds = Date.now();
    }

    if (!Number.isInteger(milliseconds) || milliseconds < 0) {
      throw new Error('ULID timestamps must be non-negative whole milliseconds.');
    }

    const value = BigInt(milliseconds);
    if (value > MAX_TIME) throw new Error('Timestamp exceeds the 48-bit ULID range.');
    return value;
  }

  function nextRandom(timestamp) {
    if (monotonicEl.checked && lastTimestamp === timestamp && lastRandom !== null) {
      if (lastRandom >= MAX_RANDOM) throw new Error('ULID monotonic randomness overflowed for this millisecond.');
      lastRandom += 1n;
      return lastRandom;
    }

    lastTimestamp = timestamp;
    lastRandom = random80();
    return lastRandom;
  }

  function generateOne(timestamp) {
    const random = nextRandom(timestamp);
    return encodeBigInt(timestamp, 10) + encodeBigInt(random, 16);
  }

  function decodeUlid(raw) {
    const ulid = String(raw || '').trim().toUpperCase();
    if (ulid.length !== 26) throw new Error('A ULID must contain exactly 26 Crockford Base32 characters.');
    if (!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(ulid)) {
      throw new Error('Invalid ULID. Use Crockford Base32 characters only; I, L, O and U are not valid.');
    }

    const time = decodeBase32(ulid.slice(0, 10));
    if (time > MAX_TIME) throw new Error('ULID timestamp exceeds the 48-bit maximum.');
    const randomness = decodeBase32(ulid.slice(10));
    const milliseconds = Number(time);

    return {
      ulid,
      milliseconds,
      iso: new Date(milliseconds).toISOString(),
      randomBase32: ulid.slice(10),
      randomHex: randomness.toString(16).padStart(20, '0').toUpperCase()
    };
  }

  function decodeTime(ulid) {
    const decoded = decodeUlid(ulid);
    return {
      milliseconds: decoded.milliseconds,
      iso: decoded.iso
    };
  }

  function inspectUlid() {
    inspectError.hidden = true;
    inspectError.textContent = '';
    inspectResult.hidden = true;

    try {
      const decoded = decodeUlid(inspectInput.value);
      inspectNormalized.textContent = decoded.ulid;
      inspectTimestampMs.textContent = decoded.milliseconds.toLocaleString();
      inspectTimestampUtc.textContent = decoded.iso;
      inspectRandomBase32.textContent = decoded.randomBase32;
      inspectRandomHex.textContent = decoded.randomHex;
      inspectResult.hidden = false;
    } catch (caught) {
      inspectError.textContent = caught?.message || String(caught);
      inspectError.hidden = false;
    }
  }

  function renderTable(values) {
    tbody.innerHTML = values.map(value => {
      const decoded = decodeTime(value);
      return '<tr>' +
        '<td style="padding:8px;border-top:1px solid var(--border)"><code>' + escapeHtml(value) + '</code></td>' +
        '<td style="padding:8px;border-top:1px solid var(--border)">' + decoded.milliseconds.toLocaleString() + '</td>' +
        '<td style="padding:8px;border-top:1px solid var(--border)"><code>' + escapeHtml(decoded.iso) + '</code></td>' +
        '</tr>';
    }).join('');
  }

  function generate() {
    error.hidden = true;
    error.textContent = '';

    const count = Number(countEl.value);
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      throw new Error('Choose a ULID count between 1 and 500.');
    }

    const values = [];
    let firstTime = null;
    let lastTime = null;

    for (let i = 0; i < count; i++) {
      const timestamp = resolveTimestamp();
      if (firstTime === null) firstTime = timestamp;
      lastTime = timestamp;
      values.push(generateOne(timestamp));
    }

    lastValues = values;
    output.value = values.join('\n');
    renderTable(values);

    const sorted = [...values].sort();
    const lexicallySorted = values.every((value, index) => value === sorted[index]);

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + count.toLocaleString() + '</b> generated</span>' +
      '<span><b>' + (monotonicEl.checked ? 'On' : 'Off') + '</b> monotonic mode</span>' +
      '<span><b>' + (lexicallySorted ? 'Yes' : 'No') + '</b> output lexically sorted</span>' +
      '<span><b>' + (firstTime === lastTime ? Number(firstTime).toLocaleString() : 'Multiple') + '</b> timestamp ms</span>';

    setStatus(count + ' ULID' + (count === 1 ? '' : 's') + ' generated', 'success');
  }

  function fail(caught) {
    output.value = '';
    tbody.innerHTML = '';
    stats.hidden = true;
    lastValues = [];
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix options', 'error');
  }

  function resetMonotonicState() {
    lastTimestamp = null;
    lastRandom = null;
  }

  document.getElementById('generateUlid').addEventListener('click', () => {
    try { generate(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearUlid').addEventListener('click', () => {
    output.value = '';
    tbody.innerHTML = '';
    stats.hidden = true;
    error.hidden = true;
    lastValues = [];
    countEl.value = '10';
    monotonicEl.checked = true;
    customEl.checked = false;
    timestampEl.value = '';
    timestampEl.disabled = true;
    resetMonotonicState();
    setStatus('Ready');
  });

  document.getElementById('copyUlid').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadUlid').addEventListener('click', () => {
    if (!lastValues.length) return;
    const url = URL.createObjectURL(new Blob([lastValues.join('\n') + '\n'], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ulids.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded', 'success');
  });

  customEl.addEventListener('change', () => {
    timestampEl.disabled = !customEl.checked;
    resetMonotonicState();
    if (output.value) {
      try { generate(); } catch (caught) { fail(caught); }
    }
  });

  for (const control of [timestampEl, monotonicEl]) {
    control.addEventListener('change', () => {
      resetMonotonicState();
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

  document.getElementById('inspectUlid').addEventListener('click', inspectUlid);
  document.getElementById('useFirstUlid').addEventListener('click', () => {
    if (!lastValues.length) return;
    inspectInput.value = lastValues[0];
    inspectUlid();
  });
  inspectInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      inspectUlid();
    }
  });

  generate();
})();