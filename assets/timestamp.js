(() => {
  'use strict';

  const unixInput = document.getElementById('unixInput');
  const dateInput = document.getElementById('dateInput');
  const unit = document.getElementById('unixUnit');
  const dateTimeZone = document.getElementById('dateTimeZone');
  const status = document.getElementById('timestampStatus');
  const error = document.getElementById('timestampError');
  const unixResult = document.getElementById('unixResult');
  const dateResult = document.getElementById('dateResult');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const NS_PER_SECOND = 1000000000n;
  const NS_PER_MILLISECOND = 1000000n;
  const NS_PER_MICROSECOND = 1000n;
  const MAX_DATE_MS = 8640000000000000n;
  const scaleDigits = {
    seconds: 9,
    milliseconds: 6,
    microseconds: 3,
    nanoseconds: 0
  };
  const unitLabels = {
    seconds: 'seconds',
    milliseconds: 'milliseconds',
    microseconds: 'microseconds',
    nanoseconds: 'nanoseconds'
  };

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

  function detectUnit(raw) {
    if (unit.value !== 'auto') return unit.value;
    const unsigned = raw.replace(/^[+-]/, '');
    const whole = (unsigned.split('.')[0] || '0').replace(/^0+(?=\d)/, '') || '0';
    const magnitude = BigInt(whole);
    if (magnitude >= 1000000000000000000n) return 'nanoseconds';
    if (magnitude >= 1000000000000000n) return 'microseconds';
    if (magnitude >= 1000000000000n) return 'milliseconds';
    return 'seconds';
  }

  function parseTimestamp(raw) {
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(raw)) {
      throw new Error('Enter a numeric Unix timestamp.');
    }

    const selectedUnit = detectUnit(raw);
    const precision = scaleDigits[selectedUnit];
    const negative = raw.startsWith('-');
    const unsigned = raw.replace(/^[+-]/, '');
    const [wholeRaw, fractionRaw=''] = unsigned.split('.');

    if (fractionRaw.length > precision) {
      const label = unitLabels[selectedUnit];
      const suffix = precision === 1 ? 'digit' : 'digits';
      throw new Error(
        precision
          ? label[0].toUpperCase() + label.slice(1) + ' input supports up to ' + precision + ' fractional ' + suffix + ' at nanosecond precision.'
          : 'Nanosecond input must be an integer.'
      );
    }

    const factor = 10n ** BigInt(precision);
    const whole = BigInt(wholeRaw || '0') * factor;
    const fraction = precision
      ? BigInt((fractionRaw + '0'.repeat(precision)).slice(0, precision) || '0')
      : 0n;
    const nanoseconds = (whole + fraction) * (negative ? -1n : 1n);

    return { nanoseconds, selectedUnit };
  }

  function toDate(nanoseconds) {
    const milliseconds = nanoseconds / NS_PER_MILLISECOND;
    if (milliseconds > MAX_DATE_MS || milliseconds < -MAX_DATE_MS) {
      throw new Error('That timestamp is outside the JavaScript Date supported range.');
    }
    const date = new Date(Number(milliseconds));
    if (Number.isNaN(date.getTime())) {
      throw new Error('That timestamp is outside the supported date range.');
    }
    return date;
  }

  function formatFromNanoseconds(nanoseconds, digits) {
    if (digits === 0) return nanoseconds.toString();

    const negative = nanoseconds < 0n;
    const absolute = negative ? -nanoseconds : nanoseconds;
    const factor = 10n ** BigInt(digits);
    const whole = absolute / factor;
    const remainder = absolute % factor;
    const sign = negative ? '-' : '';

    if (remainder === 0n) return sign + whole.toString();

    const fraction = remainder.toString().padStart(digits, '0').replace(/0+$/, '');
    return sign + whole.toString() + '.' + fraction;
  }

  function formatDate(date, nanoseconds) {
    return {
      iso: date.toISOString(),
      utc: date.toUTCString(),
      local: date.toLocaleString(undefined, {
        year:'numeric', month:'short', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit',
        timeZoneName:'short'
      }),
      unixSeconds: formatFromNanoseconds(nanoseconds, 9),
      unixMilliseconds: formatFromNanoseconds(nanoseconds, 6),
      unixMicroseconds: formatFromNanoseconds(nanoseconds, 3),
      unixNanoseconds: nanoseconds.toString()
    };
  }

  function renderDate(date, nanoseconds) {
    const d = formatDate(date, nanoseconds);
    dateResult.innerHTML = `
      <table class="record-table"><tbody>
        <tr><th>ISO 8601</th><td class="record-value">${d.iso}</td></tr>
        <tr><th>UTC</th><td class="record-value">${d.utc}</td></tr>
        <tr><th>Local time</th><td class="record-value">${d.local}</td></tr>
        <tr><th>Unix seconds</th><td class="record-value">${d.unixSeconds}</td></tr>
        <tr><th>Unix milliseconds</th><td class="record-value">${d.unixMilliseconds}</td></tr>
        <tr><th>Unix microseconds</th><td class="record-value">${d.unixMicroseconds}</td></tr>
        <tr><th>Unix nanoseconds</th><td class="record-value">${d.unixNanoseconds}</td></tr>
      </tbody></table>`;
  }

  function renderUnix(date, nanoseconds) {
    const d = formatDate(date, nanoseconds);
    unixResult.innerHTML = `
      <table class="record-table"><tbody>
        <tr><th>Unix seconds</th><td class="record-value">${d.unixSeconds}</td></tr>
        <tr><th>Unix milliseconds</th><td class="record-value">${d.unixMilliseconds}</td></tr>
        <tr><th>Unix microseconds</th><td class="record-value">${d.unixMicroseconds}</td></tr>
        <tr><th>Unix nanoseconds</th><td class="record-value">${d.unixNanoseconds}</td></tr>
        <tr><th>ISO 8601</th><td class="record-value">${d.iso}</td></tr>
        <tr><th>UTC</th><td class="record-value">${d.utc}</td></tr>
      </tbody></table>`;
  }

  function convertUnix() {
    clearError();
    const raw = unixInput.value.trim();
    if (!raw) return showError('Enter a Unix timestamp.');

    try {
      const parsed = parseTimestamp(raw);
      const date = toDate(parsed.nanoseconds);
      renderDate(date, parsed.nanoseconds);
      setStatus('Converted from ' + unitLabels[parsed.selectedUnit], 'success');
    } catch (caught) {
      showError(caught?.message || String(caught));
    }
  }

  function parseDateInput(raw) {
    const date = dateTimeZone.value === 'utc'
      ? new Date(raw + 'Z')
      : new Date(raw);

    if (Number.isNaN(date.getTime())) {
      throw new Error('Enter a valid date and time.');
    }
    return date;
  }

  function convertDate() {
    clearError();
    const raw = dateInput.value;
    if (!raw) return showError('Choose a date and time first.');

    try {
      const date = parseDateInput(raw);
      const nanoseconds = BigInt(date.getTime()) * NS_PER_MILLISECOND;
      renderUnix(date, nanoseconds);
      setStatus(dateTimeZone.value === 'utc' ? 'UTC date converted' : 'Local date converted', 'success');
    } catch (caught) {
      showError(caught?.message || String(caught));
    }
  }

  function dateTimeLocalValue(date, mode) {
    const get = name => mode === 'utc' ? date['getUTC' + name]() : date['get' + name]();
    const pad = (value, size=2) => String(value).padStart(size, '0');
    return (
      get('FullYear') + '-' +
      pad(get('Month') + 1) + '-' +
      pad(get('Date')) + 'T' +
      pad(get('Hours')) + ':' +
      pad(get('Minutes')) + ':' +
      pad(get('Seconds')) + '.' +
      pad(get('Milliseconds'), 3)
    );
  }

  function now() {
    const date = new Date();
    const nanoseconds = BigInt(date.getTime()) * NS_PER_MILLISECOND;
    unixInput.value = Math.floor(date.getTime() / 1000);
    dateInput.value = dateTimeLocalValue(date, dateTimeZone.value);
    renderDate(date, nanoseconds);
    renderUnix(date, nanoseconds);
    clearError();
    setStatus('Current time loaded', 'success');
  }

  async function copyFrom(selector, button) {
    const el = document.querySelector(selector);
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.innerText);
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = old, 1200);
    } catch {}
  }

  document.getElementById('convertUnix').addEventListener('click', convertUnix);
  document.getElementById('convertDate').addEventListener('click', convertDate);
  document.getElementById('timestampNow').addEventListener('click', now);
  document.getElementById('clearTimestamp').addEventListener('click', () => {
    unixInput.value = '';
    dateInput.value = '';
    unixResult.innerHTML = '';
    dateResult.innerHTML = '';
    unit.value = 'auto';
    dateTimeZone.value = 'local';
    clearError();
    setStatus('Ready');
  });
  document.getElementById('copyUnixResult').addEventListener('click', e => copyFrom('#unixResult', e.currentTarget));
  document.getElementById('copyDateResult').addEventListener('click', e => copyFrom('#dateResult', e.currentTarget));
  unixInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      convertUnix();
    }
  });
  dateInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      convertDate();
    }
  });
  dateTimeZone.addEventListener('change', () => {
    if (!dateInput.value) return;
    convertDate();
  });
})();
