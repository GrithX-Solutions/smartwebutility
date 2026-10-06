(() => {
  'use strict';

  const ua = document.getElementById('robotsUserAgent');
  const disallow = document.getElementById('robotsDisallow');
  const allow = document.getElementById('robotsAllow');
  const sitemap = document.getElementById('robotsSitemap');
  const crawl = document.getElementById('robotsCrawlDelay');
  const output = document.getElementById('robotsOutput');
  const status = document.getElementById('robotsStatus');
  const error = document.getElementById('robotsError');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const valueLines = value => value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const setStatus = (message, kind='neutral') => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
  };

  const fail = message => {
    output.value = '';
    error.textContent = message;
    error.hidden = false;
    setStatus('Fix input', 'error');
  };

  function userAgents() {
    const entries = valueLines(ua.value);
    if (!entries.length) return ['*'];

    for (const entry of entries) {
      if (entry !== '*' && !/^[^\s:#]+$/.test(entry)) {
        throw new Error('User-agent tokens cannot contain spaces, colons or # comments: ' + entry);
      }
    }
    return entries;
  }

  function ruleLines(value, directive) {
    return valueLines(value).map(path => {
      if (!path.startsWith('/')) {
        throw new Error(directive + ' path must start with "/": ' + path);
      }
      return directive + ': ' + path;
    });
  }

  function sitemapLines() {
    return valueLines(sitemap.value).map(raw => {
      let parsed;
      try {
        parsed = new URL(raw);
      } catch {
        throw new Error('Sitemap must be a fully qualified HTTP(S) URL: ' + raw);
      }

      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
        throw new Error('Sitemap must use an absolute HTTP(S) URL: ' + raw);
      }

      return 'Sitemap: ' + raw;
    });
  }

  function crawlDelayLine() {
    const raw = crawl.value.trim();
    if (!raw) return '';

    if (!/^\d+(?:\.\d+)?$/.test(raw) || Number(raw) < 0) {
      throw new Error('Crawl-delay must be a non-negative number.');
    }

    return 'Crawl-delay: ' + raw;
  }

  function build() {
    clearError();

    try {
      const agents = userAgents();
      const disallowLines = ruleLines(disallow.value, 'Disallow');
      const allowLines = ruleLines(allow.value, 'Allow');
      const delayLine = crawlDelayLine();
      const maps = sitemapLines();

      const out = [
        ...agents.map(agent => 'User-agent: ' + agent),
        ...disallowLines,
        ...allowLines
      ];

      if (delayLine) out.push(delayLine);
      if (maps.length) out.push('', ...maps);

      output.value = out.join('\n');

      if (delayLine) {
        setStatus('Generated · Crawl-delay is not supported by Google', 'warning');
      } else {
        setStatus('Generated', 'success');
      }
    } catch (caught) {
      fail(caught?.message || 'Could not generate robots.txt.');
    }
  }

  document.querySelectorAll(
    '#robotsUserAgent,#robotsDisallow,#robotsAllow,#robotsSitemap,#robotsCrawlDelay'
  ).forEach(element => element.addEventListener('input', build));

  document.getElementById('copyRobots').addEventListener('click', async event => {
    if (!output.value || !error.hidden) return;
    await navigator.clipboard.writeText(output.value);
    const button = event.currentTarget;
    const old = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => button.textContent = old, 1200);
  });

  document.getElementById('exampleRobots').addEventListener('click', () => {
    ua.value = 'Googlebot\nGooglebot-Image';
    disallow.value = '/admin/\n/private/';
    allow.value = '/public/';
    crawl.value = '';
    sitemap.value = 'https://example.com/sitemap.xml\nhttps://cdn.example.com/images-sitemap.xml';
    build();
  });

  document.getElementById('clearRobots').addEventListener('click', () => {
    ua.value = '*';
    disallow.value = '';
    allow.value = '';
    crawl.value = '';
    sitemap.value = '';
    build();
  });

  build();
})();
