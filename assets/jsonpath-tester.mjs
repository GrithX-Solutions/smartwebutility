const input = document.getElementById('jsonPathInput');
const expression = document.getElementById('jsonPathExpression');
const output = document.getElementById('jsonPathOutput');
const mode = document.getElementById('jsonPathOutputMode');
const file = document.getElementById('jsonPathFile');
const status = document.getElementById('jsonPathStatus');
const expressionStatus = document.getElementById('jsonPathExpressionStatus');
const error = document.getElementById('jsonPathError');
const stats = document.getElementById('jsonPathStats');

let evaluateJsonPath = null;
let testJsonPath = null;

const setStatus = (text, kind = 'neutral') => {
  status.textContent = text;
  status.dataset.kind = kind;
};

const setExpressionStatus = (text, valid = null) => {
  expressionStatus.textContent = text;
  if (valid === true) expressionStatus.style.color = 'var(--good, #15803d)';
  else if (valid === false) expressionStatus.style.color = 'var(--bad, #b91c1c)';
  else expressionStatus.style.color = '';
};

const validateExpression = () => {
  if (!testJsonPath) {
    setExpressionStatus('Loading evaluator…');
    return false;
  }
  const query = expression.value.trim();
  if (!query) {
    setExpressionStatus('Add a JSONPath expression', false);
    return false;
  }
  let valid = false;
  try {
    valid = Boolean(testJsonPath(query));
  } catch {
    valid = false;
  }
  setExpressionStatus(valid ? 'Valid RFC 9535 expression' : 'Invalid RFC 9535 expression', valid);
  return valid;
};

const fail = caught => {
  output.value = '';
  stats.hidden = true;
  error.textContent = caught?.message || String(caught);
  error.hidden = false;
  setStatus('Fix JSON or expression', 'error');
};

const run = () => {
  if (!evaluateJsonPath || !testJsonPath) throw new Error('JSONPath evaluator is still loading. Please try again.');
  error.hidden = true;
  error.textContent = '';

  const raw = input.value;
  const query = expression.value.trim();

  if (!raw.trim()) {
    output.value = '';
    stats.hidden = true;
    setStatus('Add JSON');
    return;
  }
  if (!query) throw new Error('Add a JSONPath expression.');
  if (!validateExpression()) throw new Error('The JSONPath expression is not valid RFC 9535 JSONPath.');

  let json;
  try {
    json = JSON.parse(raw);
  } catch (caught) {
    throw new Error('Invalid JSON: ' + caught.message);
  }

  const paths = [];
  const values = evaluateJsonPath(json, query, {
    callback: (_value, normalizedPath) => paths.push(normalizedPath)
  });

  let result;
  if (mode.value === 'paths') {
    result = paths;
  } else if (mode.value === 'pairs') {
    result = values.map((value, index) => ({
      path: paths[index] ?? null,
      value
    }));
  } else {
    result = values;
  }

  output.value = JSON.stringify(result, null, 2);
  const bytes = new Blob([output.value]).size;
  stats.hidden = false;
  stats.innerHTML =
    '<span><b>' + values.length.toLocaleString() + '</b> matches</span>' +
    '<span><b>' + paths.length.toLocaleString() + '</b> normalized paths</span>' +
    '<span><b>' + bytes.toLocaleString() + '</b> output bytes</span>';
  setStatus(values.length ? 'Matched' : 'No matches', values.length ? 'success' : 'neutral');
};

try {
  const mod = await import('https://cdn.jsdelivr.net/npm/@swaggerexpert/jsonpath@4.0.5/+esm');
  evaluateJsonPath = mod.evaluate;
  testJsonPath = mod.test;
  if (typeof evaluateJsonPath !== 'function' || typeof testJsonPath !== 'function') {
    throw new Error('Required JSONPath exports were not found.');
  }
  setStatus('Ready');
  validateExpression();
} catch {
  setStatus('Evaluator failed to load', 'error');
  setExpressionStatus('Evaluator failed to load', false);
  error.textContent = 'JSONPath evaluator failed to load. Refresh the page and try again.';
  error.hidden = false;
}

document.getElementById('runJsonPath').addEventListener('click', () => {
  try { run(); } catch (caught) { fail(caught); }
});

document.getElementById('exampleJsonPath').addEventListener('click', () => {
  input.value = JSON.stringify({
    store: {
      book: [
        { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
        { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
        { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', price: 8.99 }
      ],
      bicycle: { color: 'red', price: 399 }
    }
  }, null, 2);
  expression.value = '$.store.book[*].title';
  mode.value = 'pairs';
  try { run(); } catch (caught) { fail(caught); }
});

document.getElementById('clearJsonPath').addEventListener('click', () => {
  input.value = '';
  output.value = '';
  file.value = '';
  error.hidden = true;
  stats.hidden = true;
  expression.value = '$.store.book[*].title';
  setStatus(evaluateJsonPath ? 'Ready' : 'Loading evaluator…');
  validateExpression();
  input.focus();
});

document.getElementById('copyJsonPath').addEventListener('click', async () => {
  if (!output.value) return;
  try { await navigator.clipboard.writeText(output.value); }
  catch {
    output.select();
    document.execCommand('copy');
  }
  setStatus('Copied', 'success');
});

document.getElementById('downloadJsonPath').addEventListener('click', () => {
  if (!output.value) return;
  const url = URL.createObjectURL(new Blob([output.value], {type:'application/json;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jsonpath-results.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus('Downloaded', 'success');
});

file.addEventListener('change', async () => {
  try {
    const chosen = file.files?.[0];
    if (!chosen) return;
    if (chosen.size > 5 * 1024 * 1024) {
      file.value = '';
      throw new Error('Please choose a JSON file smaller than 5 MB.');
    }
    input.value = await chosen.text();
    run();
  } catch (caught) {
    fail(caught);
  }
});

mode.addEventListener('change', () => {
  if (!input.value.trim()) return;
  try { run(); } catch (caught) { fail(caught); }
});

expression.addEventListener('input', () => {
  validateExpression();
});

for (const field of [input, expression]) {
  field.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { run(); } catch (caught) { fail(caught); }
    }
  });
}