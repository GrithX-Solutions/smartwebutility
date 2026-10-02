(() => {
  'use strict';
  if (!document.body.hasAttribute('data-random-port-generator')) return;

  const preset = document.getElementById('portRangePreset');
  const minEl = document.getElementById('portMin');
  const maxEl = document.getElementById('portMax');
  const countEl = document.getElementById('portCount');
  const uniqueEl = document.getElementById('portUnique');
  const sortEl = document.getElementById('portSort');
  const output = document.getElementById('portOutput');
  const status = document.getElementById('portStatus');
  const error = document.getElementById('portError');
  const stats = document.getElementById('portStats');

  const ranges = {
    dynamic: [49152, 65535],
    user: [1024, 49151],
    'non-system': [1024, 65535]
  };

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  function cryptoIntInclusive(min, max) {
    const span = max - min + 1;
    if (!Number.isInteger(span) || span < 1 || span > 65535) {
      throw new Error('Invalid port range.');
    }

    const limit = Math.floor(0x100000000 / span) * span;
    const buffer = new Uint32Array(1);
    let value;

    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);

    return min + (value % span);
  }

  function syncPreset() {
    const custom = preset.value === 'custom';
    minEl.disabled = !custom;
    maxEl.disabled = !custom;

    if (!custom) {
      const range = ranges[preset.value];
      minEl.value = String(range[0]);
      maxEl.value = String(range[1]);
    }
  }

  function resolveOptions() {
    const min = Number(minEl.value);
    const max = Number(maxEl.value);
    const count = Number(countEl.value);

    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 65535 || min > max) {
      throw new Error('Choose a valid port range between 1 and 65535.');
    }
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      throw new Error('Choose a port count between 1 and 500.');
    }

    const span = max - min + 1;
    if (uniqueEl.checked && count > span) {
      throw new Error('Unique mode cannot generate more ports than the selected range contains.');
    }

    return { min, max, count, span };
  }

  function generate() {
    error.hidden = true;
    error.textContent = '';

    const { min, max, count, span } = resolveOptions();
    const values = [];

    if (uniqueEl.checked) {
      const used = new Set();
      while (values.length < count) {
        const value = cryptoIntInclusive(min, max);
        if (!used.has(value)) {
          used.add(value);
          values.push(value);
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        values.push(cryptoIntInclusive(min, max));
      }
    }

    if (sortEl.checked) values.sort((a, b) => a - b);

    output.value = values.join('\n');
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + count.toLocaleString() + '</b> generated</span>' +
      '<span><b>' + min.toLocaleString() + '–' + max.toLocaleString() + '</b> range</span>' +
      '<span><b>' + span.toLocaleString() + '</b> possible values</span>' +
      '<span><b>' + (uniqueEl.checked ? 'On' : 'Off') + '</b> unique mode</span>' +
      '<span><b>' + (sortEl.checked ? 'Yes' : 'No') + '</b> sorted</span>';

    setStatus(count + ' port' + (count === 1 ? '' : 's') + ' generated', 'success');
  }

  function fail(caught) {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix options', 'error');
  }

  document.getElementById('generatePorts').addEventListener('click', () => {
    try { generate(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearPorts').addEventListener('click', () => {
    preset.value = 'dynamic';
    countEl.value = '10';
    uniqueEl.checked = true;
    sortEl.checked = false;
    syncPreset();
    output.value = '';
    stats.hidden = true;
    error.hidden = true;
    setStatus('Ready');
  });

  document.getElementById('copyPorts').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadPorts').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value + '\n'], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'random-ports.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded', 'success');
  });

  preset.addEventListener('change', () => {
    syncPreset();
    if (!output.value) return;
    try { generate(); } catch (caught) { fail(caught); }
  });

  for (const control of [minEl, maxEl, countEl, uniqueEl, sortEl]) {
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

  syncPreset();
  generate();
})();