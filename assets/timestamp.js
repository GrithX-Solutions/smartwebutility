(() => {
  'use strict';

  const unixInput = document.getElementById('unixInput');
  const dateInput = document.getElementById('dateInput');
  const unit = document.getElementById('unixUnit');
  const status = document.getElementById('timestampStatus');
  const error = document.getElementById('timestampError');
  const unixResult = document.getElementById('unixResult');
  const dateResult = document.getElementById('dateResult');
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

  function detectMs(value) {
    if (unit.value === 'seconds') return false;
    if (unit.value === 'milliseconds') return true;
    return Math.abs(value) >= 1e12;
  }

  function formatDate(date) {
    return {
      iso: date.toISOString(),
      utc: date.toUTCString(),
      local: date.toLocaleString(undefined, {
        year:'numeric', month:'short', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit',
        timeZoneName:'short'
      }),
      unixSeconds: Math.floor(date.getTime()/1000),
      unixMilliseconds: date.getTime()
    };
  }

  function renderDate(date) {
    const d = formatDate(date);
    dateResult.innerHTML = `
      <table class="record-table"><tbody>
        <tr><th>ISO 8601</th><td class="record-value">${d.iso}</td></tr>
        <tr><th>UTC</th><td class="record-value">${d.utc}</td></tr>
        <tr><th>Local time</th><td class="record-value">${d.local}</td></tr>
        <tr><th>Unix seconds</th><td class="record-value">${d.unixSeconds}</td></tr>
        <tr><th>Unix milliseconds</th><td class="record-value">${d.unixMilliseconds}</td></tr>
      </tbody></table>`;
  }

  function convertUnix() {
    clearError();
    const raw = unixInput.value.trim();
    if (!raw) return showError('Enter a Unix timestamp.');
    const value = Number(raw);
    if (!Number.isFinite(value)) return showError('Enter a valid numeric Unix timestamp.');
    const ms = detectMs(value) ? value : value * 1000;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return showError('That timestamp is outside the supported date range.');
    renderDate(date);
    setStatus(detectMs(value) ? 'Converted from milliseconds' : 'Converted from seconds', 'success');
  }

  function convertDate() {
    clearError();
    const raw = dateInput.value;
    if (!raw) return showError('Choose a date and time first.');
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return showError('Enter a valid date and time.');
    const d = formatDate(date);
    unixResult.innerHTML = `
      <table class="record-table"><tbody>
        <tr><th>Unix seconds</th><td class="record-value">${d.unixSeconds}</td></tr>
        <tr><th>Unix milliseconds</th><td class="record-value">${d.unixMilliseconds}</td></tr>
        <tr><th>ISO 8601</th><td class="record-value">${d.iso}</td></tr>
        <tr><th>UTC</th><td class="record-value">${d.utc}</td></tr>
      </tbody></table>`;
    setStatus('Date converted', 'success');
  }

  function now() {
    const date = new Date();
    unixInput.value = Math.floor(date.getTime()/1000);
    const pad = n => String(n).padStart(2,'0');
    dateInput.value = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    renderDate(date);
    const d = formatDate(date);
    unixResult.innerHTML = `
      <table class="record-table"><tbody>
        <tr><th>Unix seconds</th><td class="record-value">${d.unixSeconds}</td></tr>
        <tr><th>Unix milliseconds</th><td class="record-value">${d.unixMilliseconds}</td></tr>
      </tbody></table>`;
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
    clearError();
    setStatus('Ready');
  });
  document.getElementById('copyUnixResult').addEventListener('click', e => copyFrom('#unixResult', e.currentTarget));
  document.getElementById('copyDateResult').addEventListener('click', e => copyFrom('#dateResult', e.currentTarget));
  unixInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); convertUnix(); }
  });
  dateInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); convertDate(); }
  });
})();
