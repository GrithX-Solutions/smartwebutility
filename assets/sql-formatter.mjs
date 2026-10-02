import { format } from 'https://cdn.jsdelivr.net/npm/sql-formatter@15.9.0/+esm';

const mode = document.body.hasAttribute('data-sql-formatter');
if (mode) {
  const input = document.getElementById('sqlInput');
  const output = document.getElementById('sqlOutput');
  const file = document.getElementById('sqlFile');
  const dialect = document.getElementById('sqlDialect');
  const keywordCase = document.getElementById('sqlKeywordCase');
  const tabWidth = document.getElementById('sqlTabWidth');
  const status = document.getElementById('sqlStatus');
  const error = document.getElementById('sqlError');
  const stats = document.getElementById('sqlStats');

  const setStatus = (text, kind = 'neutral') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  const fail = caught => {
    output.value = '';
    stats.hidden = true;
    error.textContent = caught?.message || String(caught);
    error.hidden = false;
    setStatus('Fix SQL or dialect', 'error');
  };

  const run = () => {
    error.hidden = true;
    error.textContent = '';
    const source = input.value;
    if (!source.trim()) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add SQL', 'neutral');
      return;
    }

    const result = format(source, {
      language: dialect.value,
      keywordCase: keywordCase.value,
      tabWidth: Number(tabWidth.value) || 2,
      linesBetweenQueries: 1
    });

    output.value = result;
    stats.hidden = false;
    stats.innerHTML =
      '<span><b>' + result.length.toLocaleString() + '</b> characters</span>' +
      '<span><b>' + result.split(/\r?\n/).length.toLocaleString() + '</b> lines</span>' +
      '<span><b>' + dialect.options[dialect.selectedIndex].textContent + '</b> dialect</span>';
    setStatus('Formatted', 'success');
  };

  document.getElementById('formatSql').addEventListener('click', () => {
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('exampleSql').addEventListener('click', () => {
    input.value = 'select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.active=true and u.created_at>=current_date-interval \'30 days\' group by u.id,u.name order by orders desc;';
    dialect.value = 'postgresql';
    keywordCase.value = 'upper';
    tabWidth.value = '2';
    try { run(); } catch (caught) { fail(caught); }
  });

  document.getElementById('clearSql').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    file.value = '';
    error.hidden = true;
    stats.hidden = true;
    setStatus('Ready', 'neutral');
    input.focus();
  });

  document.getElementById('copySql').addEventListener('click', async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); }
    catch {
      output.select();
      document.execCommand('copy');
    }
    setStatus('Copied', 'success');
  });

  document.getElementById('downloadSql').addEventListener('click', () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], {type:'application/sql;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'formatted.sql';
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
      fail(new Error('Please choose a SQL file smaller than 5 MB.'));
      return;
    }
    input.value = await chosen.text();
    try { run(); } catch (caught) { fail(caught); }
  });

  for (const control of [dialect, keywordCase, tabWidth]) {
    control.addEventListener('change', () => {
      if (!input.value.trim()) return;
      try { run(); } catch (caught) { fail(caught); }
    });
  }

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      try { run(); } catch (caught) { fail(caught); }
    }
  });

  setStatus('Ready', 'neutral');
}