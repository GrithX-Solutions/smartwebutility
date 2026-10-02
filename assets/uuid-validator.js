(() => {
  'use strict';
  if (!document.body.hasAttribute('data-uuid-validator')) return;

  const input = document.getElementById('uuidValidatorInput');
  const output = document.getElementById('uuidValidatorOutput');
  const acceptWrappers = document.getElementById('uuidAcceptWrappers');
  const acceptCompact = document.getElementById('uuidAcceptCompact');
  const status = document.getElementById('uuidValidatorStatus');
  const error = document.getElementById('uuidValidatorError');
  const stats = document.getElementById('uuidValidatorStats');
  const tbody = document.querySelector('#uuidValidatorTable tbody');

  let lastResults = [];

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function canonicalize(raw) {
    let value = String(raw).trim();
    const original = value;

    if (acceptWrappers.checked) {
      if (/^\{.*\}$/.test(value)) value = value.slice(1, -1).trim();
      value = value.replace(/^urn:uuid:/i, '');
    }

    if (acceptCompact.checked && /^[0-9a-f]{32}$/i.test(value)) {
      value = [
        value.slice(0, 8),
        value.slice(8, 12),
        value.slice(12, 16),
        value.slice(16, 20),
        value.slice(20)
      ].join('-');
    }

    return { original, value: value.toLowerCase() };
  }

  function variantInfo(nibble) {
    const n = parseInt(nibble, 16);
    if (Number.isNaN(n)) return { code: 'unknown', label: 'Unknown' };
    if (n <= 7) return { code: 'ncs', label: 'NCS / reserved' };
    if (n <= 11) return { code: 'rfc', label: 'RFC 9562 (10xx)' };
    if (n <= 13) return { code: 'microsoft', label: 'Microsoft reserved (110x)' };
    return { code: 'future', label: 'Future reserved (111x)' };
  }

  function versionInfo(nibble) {
    const version = parseInt(nibble, 16);
    const names = {
      1: 'v1 · Gregorian time',
      2: 'v2 · DCE Security',
      3: 'v3 · Name-based MD5',
      4: 'v4 · Random',
      5: 'v5 · Name-based SHA-1',
      6: 'v6 · Reordered time',
      7: 'v7 · Unix time',
      8: 'v8 · Custom'
    };
    if (names[version]) return { version, label: names[version], defined: true };
    if (version === 0) return { version, label: 'Version 0 · unused', defined: false };
    return { version, label: 'Version ' + version + ' · future reserved', defined: false };
  }

  function decodeV7Time(canonical) {
    const hex = canonical.replace(/-/g, '').slice(0, 12);
    const milliseconds = parseInt(hex, 16);
    if (!Number.isFinite(milliseconds)) return null;
    const date = new Date(milliseconds);
    if (Number.isNaN(date.getTime())) return null;
    return { milliseconds, iso: date.toISOString() };
  }

  function inspect(raw) {
    const normalized = canonicalize(raw);
    const canonical = normalized.value;
    const formatValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(canonical);

    if (!formatValid) {
      return {
        input: normalized.original,
        normalized: '',
        formatValid: false,
        uuidValid: false,
        version: '',
        variant: '',
        detail: 'Invalid UUID/GUID text format',
        v7Time: ''
      };
    }

    const hex = canonical.replace(/-/g, '');

    if (/^0{32}$/.test(hex)) {
      return {
        input: normalized.original,
        normalized: canonical,
        formatValid: true,
        uuidValid: true,
        version: 'Nil',
        variant: 'NCS range (special form)',
        detail: 'Valid special Nil UUID',
        v7Time: ''
      };
    }

    if (/^f{32}$/.test(hex)) {
      return {
        input: normalized.original,
        normalized: canonical,
        formatValid: true,
        uuidValid: true,
        version: 'Max',
        variant: 'Future-reserved range (special form)',
        detail: 'Valid special Max UUID',
        v7Time: ''
      };
    }

    const version = versionInfo(canonical[14]);
    const variant = variantInfo(canonical[19]);
    const uuidValid = variant.code === 'rfc' && version.defined;
    let detail;

    if (uuidValid) {
      detail = 'Valid RFC UUID ' + version.label.split(' · ')[0];
    } else if (variant.code !== 'rfc') {
      detail = 'Text format is valid, but variant is ' + variant.label;
    } else {
      detail = 'RFC variant, but ' + version.label.toLowerCase();
    }

    const v7 = uuidValid && version.version === 7 ? decodeV7Time(canonical) : null;

    return {
      input: normalized.original,
      normalized: canonical,
      formatValid: true,
      uuidValid,
      version: version.label,
      variant: variant.label,
      detail,
      v7Time: v7 ? v7.iso : ''
    };
  }

  function parseValues() {
    return input.value
      .split(/[\s,;]+/)
      .map(value => value.trim())
      .filter(Boolean);
  }

  function renderTable(results) {
    tbody.innerHTML = results.map(result => {
      const statusText = result.uuidValid
        ? 'Valid UUID'
        : (result.formatValid ? 'Reserved / non-RFC' : 'Invalid');
      const statusKind = result.uuidValid ? 'success' : (result.formatValid ? 'neutral' : 'error');
      const detail = [result.normalized, result.detail, result.v7Time ? ('v7 time: ' + result.v7Time) : '']
        .filter(Boolean)
        .join(' · ');

      return '<tr data-valid="' + String(result.uuidValid) + '" data-format-valid="' + String(result.formatValid) + '">' +
        '<td style="padding:8px;border-top:1px solid var(--border)"><code>' + escapeHtml(result.input) + '</code></td>' +
        '<td style="padding:8px;border-top:1px solid var(--border)" data-kind="' + statusKind + '">' + escapeHtml(statusText) + '</td>' +
        '<td style="padding:8px;border-top:1px solid var(--border)">' + escapeHtml(result.version || '—') + '</td>' +
        '<td style="padding:8px;border-top:1px solid var(--border)">' + escapeHtml(result.variant || '—') + '</td>' +
        '<td style="padding:8px;border-top:1px solid var(--border)"><code>' + escapeHtml(detail || '—') + '</code></td>' +
        '</tr>';
    }).join('');
  }

  function validate() {
    error.hidden = true;
    error.textContent = '';

    const values = parseValues();
    if (!values.length) {
      output.value = '';
      tbody.innerHTML = '';
      stats.hidden = true;
      lastResults = [];
      setStatus('Add UUIDs');
      return;
    }

    if (values.length > 500) throw new Error('Please validate at most 500 UUID/GUID values at once.');

    const results = values.map(inspect);
    lastResults = results;

    const valid = results.filter(result => result.uuidValid);
    const formattedButReserved = results.filter(result => result.formatValid && !result.uuidValid);
    const invalid = results.filter(result => !result.formatValid);

    output.value = valid.map(result => result.normalized).join('\n');
    renderTable(results);

    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + results.length.toLocaleString() + '</b> checked</span>' +
      '<span><b>' + valid.length.toLocaleString() + '</b> valid UUIDs</span>' +
      '<span><b>' + formattedButReserved.length.toLocaleString() + '</b> reserved/non-RFC</span>' +
      '<span><b>' + invalid.length.toLocaleString() + '</b> invalid format</span>';

    setStatus(valid.length + ' valid of ' + results.length, invalid.length ? 'neutral' : 'success');
  }

  function fail(caught) {
    output.value = '';
    tbody.innerHTML = '';
    stats.hidden = true;
    lastResults = [];
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix input', 'error');
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  document.getElementById('validateUuid').addEventListener('click', () => {
    try { validate(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleUuidValidator').addEventListener('click', () => {
    input.value = [
      '550e8400-e29b-41d4-a716-446655440000',
      '01890f4e-7c88-7abc-8def-0123456789ab',
      '00000000-0000-0000-0000-000000000000',
      '{550E8400-E29B-41D4-A716-446655440000}',
      '550e8400-e29b-41d4-c716-446655440000',
      'not-a-uuid'
    ].join('\n');
    acceptWrappers.checked = true;
    acceptCompact.checked = true;
    try { validate(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearUuidValidator').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    tbody.innerHTML = '';
    stats.hidden = true;
    error.hidden = true;
    lastResults = [];
    acceptWrappers.checked = true;
    acceptCompact.checked = true;
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('copyUuidValidator').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied valid UUIDs', 'success');
  });

  document.getElementById('downloadUuidValidator').addEventListener('click', () => {
    if (!lastResults.length) return;
    const rows = [
      ['input','normalized','format_valid','uuid_valid','version','variant','detail','uuid_v7_time'],
      ...lastResults.map(result => [
        result.input,
        result.normalized,
        result.formatValid,
        result.uuidValid,
        result.version,
        result.variant,
        result.detail,
        result.v7Time
      ])
    ];
    const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'uuid-validation-report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Report downloaded', 'success');
  });

  for (const control of [acceptWrappers, acceptCompact]) {
    control.addEventListener('change', () => {
      if (!input.value.trim()) return;
      try { validate(); } catch (caught) { fail(caught); }
    });
  }

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { validate(); } catch (caught) { fail(caught); }
    }
  });
})();