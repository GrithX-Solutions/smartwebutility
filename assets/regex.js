(() => {
  'use strict';

  const pattern = document.getElementById('regexPattern');
  const flags = document.getElementById('regexFlags');
  const input = document.getElementById('regexInput');
  const replace = document.getElementById('regexReplace');
  const matches = document.getElementById('regexMatches');
  const highlighted = document.getElementById('regexHighlighted');
  const output = document.getElementById('regexOutput');
  const status = document.getElementById('regexStatus');
  const error = document.getElementById('regexError');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const MAX_DISPLAY_MATCHES = 500;
  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[char]));

  const setStatus = (message, kind='neutral') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  function fail(message) {
    error.textContent = message;
    error.hidden = false;
    matches.innerHTML = '';
    highlighted.innerHTML = '';
    output.value = '';
    setStatus('Invalid regex', 'error');
  }

  function collectMatches(regex, text) {
    const allFlags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
    const globalRegex = new RegExp(regex.source, allFlags);
    const result = [];
    let truncated = false;

    for (const match of text.matchAll(globalRegex)) {
      if (result.length >= MAX_DISPLAY_MATCHES) {
        truncated = true;
        break;
      }
      result.push(match);
    }

    return { result, truncated };
  }

  function renderHighlighted(text, result) {
    if (!text) {
      highlighted.innerHTML = '<div class="empty">Enter test text to highlight matches.</div>';
      return;
    }
    if (!result.length) {
      highlighted.innerHTML = '<div class="record-value">' + esc(text) + '</div>';
      return;
    }

    let html = '';
    let cursor = 0;

    for (const match of result) {
      const start = match.index ?? 0;
      const end = start + match[0].length;

      if (start > cursor) {
        html += esc(text.slice(cursor, start));
        cursor = start;
      }

      if (match[0].length === 0) {
        html += '<mark title="Zero-length match at index ' + start + '">↧</mark>';
      } else {
        html += '<mark>' + esc(match[0]) + '</mark>';
        cursor = end;
      }
    }

    if (cursor < text.length) {
      html += esc(text.slice(cursor));
    }

    highlighted.innerHTML = '<div class="record-value" style="white-space:pre-wrap;overflow-wrap:anywhere">' + html + '</div>';
  }

  function groupSummary(match) {
    const parts = [];
    if (match.length > 1) {
      parts.push('Numbered: ' + JSON.stringify(match.slice(1)));
    }
    if (match.groups && Object.keys(match.groups).length) {
      parts.push('Named: ' + JSON.stringify(match.groups));
    }
    return parts.length ? parts.join(' · ') : '—';
  }

  function renderMatches(result, truncated) {
    if (!result.length) {
      matches.innerHTML = '<div class="empty">No matches found.</div>';
      return;
    }

    const rows = result.map((match, index) => {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      return '<tr>'
        + '<td>' + (index + 1) + '</td>'
        + '<td class="record-value">' + esc(match[0] || '∅') + '</td>'
        + '<td>' + start + ' → ' + end + '</td>'
        + '<td class="record-value">' + esc(groupSummary(match)) + '</td>'
        + '</tr>';
    }).join('');

    matches.innerHTML = '<table class="record-table"><thead><tr><th>#</th><th>Match</th><th>Range</th><th>Groups</th></tr></thead><tbody>'
      + rows
      + '</tbody></table>'
      + (truncated ? '<p class="muted">Showing the first 500 matches.</p>' : '');
  }

  function run() {
    error.hidden = true;
    error.textContent = '';

    try {
      const regex = new RegExp(pattern.value, flags.value);
      const collected = collectMatches(regex, input.value);

      renderHighlighted(input.value, collected.result);
      renderMatches(collected.result, collected.truncated);
      output.value = replace.value ? input.value.replace(regex, replace.value) : '';

      if (collected.truncated) {
        setStatus('500+ matches · display capped', 'success');
      } else {
        setStatus(collected.result.length + ' match' + (collected.result.length === 1 ? '' : 'es'), 'success');
      }
    } catch (caught) {
      fail(caught.message || 'Invalid regular expression.');
    }
  }

  document.getElementById('runRegex').addEventListener('click', run);

  document.getElementById('clearRegex').addEventListener('click', () => {
    pattern.value = '';
    flags.value = 'g';
    input.value = '';
    replace.value = '';
    matches.innerHTML = '<div class="empty">Enter a regex to see matches.</div>';
    highlighted.innerHTML = '<div class="empty">Enter a regex to highlight matches.</div>';
    output.value = '';
    error.hidden = true;
    setStatus('Ready');
    pattern.focus();
  });

  document.getElementById('exampleRegex').addEventListener('click', () => {
    pattern.value = '\\b(?<email>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})\\b';
    flags.value = 'gdi';
    input.value = 'Email alice@example.com and bob@test.org';
    replace.value = '[email]';
    run();
  });

  [pattern, flags, input, replace].forEach(element => {
    element.addEventListener('input', () => {
      if (pattern.value) run();
    });
  });
})();
