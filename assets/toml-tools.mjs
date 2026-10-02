import { parse, stringify } from 'https://cdn.jsdelivr.net/npm/smol-toml@1.9.0/+esm';

const mode = document.body.dataset.tomlTool;
if (mode === 'formatter-validator') {
  const input = document.getElementById('tomlInput');
  const output = document.getElementById('tomlOutput');
  const status = document.getElementById('tomlStatus');
  const error = document.getElementById('tomlError');
  const stats = document.getElementById('tomlStats');
  const file = document.getElementById('tomlFile');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const parseSafe = source => parse(source, {
    integersAsBigInt: 'asNeeded',
    unsafeKeyBehaviour: 'throw'
  });

  const countData = value => {
    let keys = 0;
    let tables = 0;
    let arrays = 0;
    const visit = current => {
      if (Array.isArray(current)) {
        arrays++;
        current.forEach(visit);
        return;
      }
      if (!current || typeof current !== 'object' || current instanceof Date) return;
      tables++;
      for (const [key, child] of Object.entries(current)) {
        keys++;
        visit(child);
      }
    };
    visit(value);
    return { keys, tables: Math.max(0, tables - 1), arrays };
  };

  const showStats = parsed => {
    const result = countData(parsed);
    stats.hidden = false;
    stats.innerHTML = '<span><b>' + result.keys + '</b> keys</span><span><b>' +
      result.tables + '</b> tables</span><span><b>' + result.arrays + '</b> arrays</span>';
  };

  const fail = caught => {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix TOML', 'error');
  };

  const run = format => {
    error.hidden = true;
    error.textContent = '';
    const source = input.value;
    if (!source.trim()) throw new Error('Add TOML to validate or format.');
    const parsed = parseSafe(source);
    showStats(parsed);
    if (format) {
      output.value = stringify(parsed);
      setStatus('Formatted', 'success');
    } else {
      output.value = '';
      setStatus('Valid TOML', 'success');
    }
  };

  document.getElementById('formatToml').addEventListener('click', () => {
    try { run(true); } catch (caught) { fail(caught); }
  });
  document.getElementById('validateToml').addEventListener('click', () => {
    try { run(false); } catch (caught) { fail(caught); }
  });
  document.getElementById('exampleToml').addEventListener('click', () => {
    input.value = 'title = "Smart Web Utility"\nenabled = true\nports = [8000, 8001]\n\n[database]\nserver = "db.example.com"\nconnection_max = 5000\n';
    try { run(true); } catch (caught) { fail(caught); }
  });
  document.getElementById('clearToml').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    setStatus('Ready');
    input.focus();
  });
  document.getElementById('copyToml').addEventListener('click', async () => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
    } catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });
  document.getElementById('downloadToml').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type: 'application/toml;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'formatted.toml';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    if (chosen.size > 5 * 1024 * 1024) {
      file.value = '';
      fail(new Error('Please choose a TOML file smaller than 5 MB.'));
      return;
    }
    input.value = await chosen.text();
    try { run(true); } catch (caught) { fail(caught); }
  });
  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { run(true); } catch (caught) { fail(caught); }
    }
  });
  setStatus('Ready');
}
