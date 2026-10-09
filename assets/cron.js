(() => {
  'use strict';

  const input = document.getElementById('cronInput');
  const desc = document.getElementById('cronDescription');
  const status = document.getElementById('cronStatus');
  const error = document.getElementById('cronError');
  const year = document.getElementById('year');
  const nextRuns = document.getElementById('cronNextRuns');
  const timezone = document.getElementById('cronTimezone');
  const copyBtn = document.getElementById('copyCron');

  const fields = {
    minute: document.getElementById('cronMinute'),
    hour: document.getElementById('cronHour'),
    day: document.getElementById('cronDay'),
    month: document.getElementById('cronMonth'),
    weekday: document.getElementById('cronWeekday')
  };

  const presets = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '0 * * * *': 'Every hour at minute 0',
    '0 0 * * *': 'Every day at midnight',
    '0 9 * * 1-5': 'At 09:00 on Monday through Friday',
    '0 0 1 * *': 'At midnight on the first day of every month',
    '0 0 * * 0': 'Every Sunday at midnight'
  };

  const monthNames = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
  const weekdayNames = {SUN:0,MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6};

  if (year) year.textContent = new Date().getFullYear();
  if (timezone) {
    timezone.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || 'browser local time';
  }

  function clearError() {
    error.hidden = true;
    error.textContent = '';
  }

  function fail(message) {
    error.textContent = message;
    error.hidden = false;
    desc.textContent = '';
    nextRuns.innerHTML = '';
    status.textContent = 'Invalid';
    status.dataset.kind = 'error';
  }

  function valueOfToken(token, spec) {
    const upper = token.toUpperCase();
    if (spec.names && Object.prototype.hasOwnProperty.call(spec.names, upper)) return spec.names[upper];
    if (!/^\d+$/.test(token)) throw new Error(spec.label + ' contains an unsupported value: ' + token + '.');
    const value = Number(token);
    if (!Number.isInteger(value) || value < spec.min || value > spec.max) {
      throw new Error(spec.label + ' must stay between ' + spec.min + ' and ' + spec.max + '.');
    }
    return spec.normalize ? spec.normalize(value) : value;
  }

  function addRange(set, start, end, step, spec) {
    if (step < 1) throw new Error(spec.label + ' step must be at least 1.');
    if (start > end) throw new Error(spec.label + ' range start must not be greater than its end.');
    for (let value = start; value <= end; value += step) {
      set.add(spec.normalize ? spec.normalize(value) : value);
    }
  }

  function parseField(raw, spec) {
    const text = raw.trim();
    if (!text) throw new Error(spec.label + ' cannot be empty.');

    const values = new Set();
    const pieces = text.split(',');
    for (const pieceRaw of pieces) {
      const piece = pieceRaw.trim();
      if (!piece) throw new Error(spec.label + ' contains an empty list item.');

      let base = piece;
      let step = 1;
      if (piece.includes('/')) {
        const parts = piece.split('/');
        if (parts.length !== 2 || !/^\d+$/.test(parts[1])) {
          throw new Error(spec.label + ' has an invalid step expression: ' + piece + '.');
        }
        base = parts[0];
        step = Number(parts[1]);
        if (step < 1) throw new Error(spec.label + ' step must be at least 1.');
      }

      if (base === '*') {
        addRange(values, spec.min, spec.max, step, spec);
        continue;
      }

      if (base.includes('-')) {
        const parts = base.split('-');
        if (parts.length !== 2) throw new Error(spec.label + ' has an invalid range: ' + base + '.');
        const start = valueOfToken(parts[0], spec);
        const endRaw = valueOfToken(parts[1], spec);
        const end = spec.denormalizeEnd ? spec.denormalizeEnd(parts[1], endRaw) : endRaw;
        const startForRange = spec.denormalizeStart ? spec.denormalizeStart(parts[0], start) : start;
        addRange(values, startForRange, end, step, spec);
        continue;
      }

      if (piece.includes('/')) {
        throw new Error(spec.label + ' steps must use * or a range, such as */5 or 1-10/2.');
      }

      values.add(valueOfToken(base, spec));
    }

    return {raw:text, values, all:text === '*'};
  }

  const specs = {
    minute: {label:'Minute', min:0, max:59},
    hour: {label:'Hour', min:0, max:23},
    day: {label:'Day of month', min:1, max:31},
    month: {label:'Month', min:1, max:12, names:monthNames},
    weekday: {
      label:'Day of week',
      min:0,
      max:7,
      names:weekdayNames,
      normalize:value => value === 7 ? 0 : value,
      denormalizeEnd:(token,value) => /^7$/.test(token) ? 7 : value,
      denormalizeStart:(token,value) => /^7$/.test(token) ? 7 : value
    }
  };

  function parseExpression(value) {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length !== 5) {
      throw new Error('Use standard 5-field cron: minute hour day-of-month month day-of-week. Seconds/year fields are not supported here.');
    }
    return {
      minute: parseField(parts[0], specs.minute),
      hour: parseField(parts[1], specs.hour),
      day: parseField(parts[2], specs.day),
      month: parseField(parts[3], specs.month),
      weekday: parseField(parts[4], specs.weekday)
    };
  }

  function describe(value, parsed) {
    if (presets[value]) return presets[value] + '.';

    const pieces = [];
    const minute = parsed.minute.raw;
    const hour = parsed.hour.raw;

    if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
      pieces.push('At ' + String(Number(hour)).padStart(2, '0') + ':' + String(Number(minute)).padStart(2, '0'));
    } else if (/^\*\/\d+$/.test(minute) && hour === '*') {
      pieces.push('Every ' + minute.slice(2) + ' minutes');
    } else if (minute === '*' && /^\*\/\d+$/.test(hour)) {
      pieces.push('Every minute of every ' + hour.slice(2) + ' hours');
    } else {
      pieces.push('Minute ' + minute + '; hour ' + hour);
    }

    if (parsed.day.raw !== '*') pieces.push('day-of-month ' + parsed.day.raw);
    if (parsed.month.raw !== '*') pieces.push('month ' + parsed.month.raw);
    if (parsed.weekday.raw !== '*') pieces.push('day-of-week ' + parsed.weekday.raw);

    return pieces.join(', ') + '.';
  }

  function matches(date, parsed) {
    if (!parsed.minute.values.has(date.getMinutes())) return false;
    if (!parsed.hour.values.has(date.getHours())) return false;
    if (!parsed.month.values.has(date.getMonth() + 1)) return false;

    const dom = parsed.day.values.has(date.getDate());
    const dow = parsed.weekday.values.has(date.getDay());

    if (parsed.day.all && parsed.weekday.all) return true;
    if (parsed.day.all) return dow;
    if (parsed.weekday.all) return dom;
    return dom || dow;
  }

  function calculateNextRuns(parsed, count = 5) {
    const found = [];
    const cursor = new Date();
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);

    const maxMinutes = 400 * 24 * 60;
    for (let checked = 0; checked < maxMinutes && found.length < count; checked += 1) {
      if (matches(cursor, parsed)) found.push(new Date(cursor));
      cursor.setMinutes(cursor.getMinutes() + 1);
    }
    return found;
  }

  function renderNextRuns(runs) {
    nextRuns.innerHTML = '';
    if (!runs.length) {
      const li = document.createElement('li');
      li.textContent = 'No run found within the next 400 days.';
      nextRuns.appendChild(li);
      return;
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle:'medium',
      timeStyle:'medium'
    });
    for (const date of runs) {
      const li = document.createElement('li');
      li.dataset.timestamp = String(date.getTime());
      li.textContent = formatter.format(date);
      nextRuns.appendChild(li);
    }
  }

  function syncBuilderFromExpression(value) {
    const parts = value.trim().split(/\s+/);
    if (parts.length !== 5) return;
    fields.minute.value = parts[0];
    fields.hour.value = parts[1];
    fields.day.value = parts[2];
    fields.month.value = parts[3];
    fields.weekday.value = parts[4];
  }

  function expressionFromBuilder() {
    return [fields.minute.value, fields.hour.value, fields.day.value, fields.month.value, fields.weekday.value]
      .map(value => value.trim() || '*')
      .join(' ');
  }

  function run() {
    clearError();
    try {
      const value = input.value.trim();
      const parsed = parseExpression(value);
      desc.textContent = describe(value, parsed);
      syncBuilderFromExpression(value);
      renderNextRuns(calculateNextRuns(parsed));
      status.textContent = 'Valid 5-field cron';
      status.dataset.kind = 'success';
    } catch (caught) {
      fail(caught.message || String(caught));
    }
  }

  document.getElementById('parseCron').addEventListener('click', run);

  document.getElementById('clearCron').addEventListener('click', () => {
    input.value = '';
    for (const field of Object.values(fields)) field.value = '*';
    desc.textContent = 'Enter a cron expression, use the builder, or choose a preset.';
    nextRuns.innerHTML = '';
    clearError();
    status.textContent = 'Ready';
    status.dataset.kind = 'neutral';
    input.focus();
  });

  document.querySelectorAll('[data-cron]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.cron;
      run();
    });
  });

  for (const field of Object.values(fields)) {
    field.addEventListener('input', () => {
      input.value = expressionFromBuilder();
      run();
    });
  }

  copyBtn?.addEventListener('click', async () => {
    const value = input.value.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      input.select();
      document.execCommand('copy');
    }
    status.textContent = 'Copied';
    status.dataset.kind = 'success';
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });

  input.addEventListener('input', () => {
    if (!input.value.trim()) return;
    try {
      parseExpression(input.value);
      syncBuilderFromExpression(input.value);
    } catch {
      // Keep partially typed expressions editable until Parse is pressed.
    }
  });

  input.value = input.value.trim() || '0 9 * * 1-5';
  run();
})();
