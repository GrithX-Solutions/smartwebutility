(() => {
  'use strict';

  const root = document.documentElement;
  const storageKey = 'swu-theme';

  function ensureHeaderNavigationStyles() {
    if (document.querySelector('link[data-swu-header-nav]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/header-nav-search.css?v=20261003-1';
    link.dataset.swuHeaderNav = 'true';
    document.head.appendChild(link);
  }
  ensureHeaderNavigationStyles();

  const analyticsMeasurementId = 'G-TKF8FWKQN6';
  const restrictedAnalyticsRegions = [
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT',
    'LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','GB','CH'
  ];

  function queueGoogleAnalytics() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };

    // Set consent defaults immediately, before the network library is loaded.
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    });
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      region: restrictedAnalyticsRegions,
      wait_for_update: 500
    });
    window.gtag('js', new Date());
    window.gtag('config', analyticsMeasurementId);
  }

  function loadGoogleAnalytics() {
    if (document.querySelector('script[data-swu-analytics]')) return;
    const script = document.createElement('script');
    script.async = true;
    script.dataset.swuAnalytics = 'true';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(analyticsMeasurementId);
    document.head.appendChild(script);
  }

  function scheduleGoogleAnalytics() {
    const start = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadGoogleAnalytics, {timeout: 2000});
      } else {
        window.setTimeout(loadGoogleAnalytics, 1200);
      }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, {once:true});
  }

  queueGoogleAnalytics();
  scheduleGoogleAnalytics();

  function preferredTheme() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme, persist = false) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (persist) {
      try { localStorage.setItem(storageKey, theme); } catch {}
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#071426' : '#f7fbff');

    const button = document.getElementById('themeToggle');
    if (button) {
      const next = theme === 'dark' ? 'light' : 'dark';
      const label = button.querySelector('.theme-label');
      const icon = button.querySelector('.theme-icon');
      if (label) label.textContent = next === 'light' ? 'Light' : 'Dark';
      if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
      button.setAttribute('aria-label', 'Switch to ' + next + ' mode');
      button.setAttribute('title', 'Switch to ' + next + ' mode');
    }
  }

  function setActiveNavigation(nav) {
    if (!nav) return;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const groups = {
      '/developer-tools': [
        '/developer-tools','/json-formatter','/xml-to-json','/json-to-csv','/yaml-to-json','/json-to-yaml','/csv-viewer','/yaml-formatter','/xml-to-csv','/json-diff','/xml-formatter-validator','/toml-formatter-validator','/curl-converter','/json-escape-unescape','/csv-to-json','/sql-formatter','/markdown-to-html','/html-to-markdown','/html-minifier','/jsonpath-tester','/css-minifier','/json-to-xml','/csv-to-xml','/html-to-json','/json-to-html','/uuid-validator','/xml-escape-unescape','/regex-escaper','/ulid-generator','/random-port-generator','/mac-address-generator','/chmod-calculator','/base64-encoder-decoder','/unix-timestamp-converter',
        '/uuid-generator','/hash-generator','/jwt-decoder','/regex-tester','/url-encoder-decoder',
        '/html-entity-encoder-decoder','/cron-expression-helper','/password-generator','/random-string-generator'
      ],
      '/website-tools': [
        '/website-tools','/dns-checker','/dns-propagation-checker','/ssl-checker',
        '/http-status-checker','/http-header-checker','/redirect-checker','/bulk-redirect-checker','/sitemap-checker',
        '/meta-tag-checker','/open-graph-checker','/favicon-generator','/cache-control-checker','/security-headers-checker','/dnssec-checker','/website-speed-test'
      ],
      '/seo-tools': [
        '/seo-tools','/meta-tag-generator','/robots-txt-generator','/robots-txt-tester','/schema-markup-generator',
        '/canonical-tag-checker','/open-graph-preview','/slug-generator'
      ],
      '/text-tools': [
        '/text-tools','/word-counter','/character-counter','/case-converter','/lorem-ipsum-generator'
      ]
    };

    nav.querySelectorAll('a').forEach(link => link.removeAttribute('aria-current'));
    for (const [href, paths] of Object.entries(groups)) {
      if (paths.includes(path)) {
        const active = nav.querySelector('a[href="' + href + '/"]');
        if (active) active.setAttribute('aria-current', 'page');
        break;
      }
    }
  }


  const navCatalog = {
    '/developer-tools/': {
      label:'Developer', icon:'code', shortcuts:[
        ['JSON Formatter','/json-formatter/'],['UUID & GUID','/uuid-generator/'],['YAML Formatter','/yaml-formatter/'],
        ['chmod Calculator','/chmod-calculator/'],['MAC Generator','/mac-address-generator/'],['JSON Diff','/json-diff/']
      ]
    },
    '/website-tools/': {
      label:'Website', icon:'globe', shortcuts:[
        ['DNS Checker','/dns-checker/'],['DNSSEC Validator','/dnssec-checker/'],['SSL Checker','/ssl-checker/'],
        ['Redirect Checker','/redirect-checker/'],['HTTP Status','/http-status-checker/'],['Speed Test','/website-speed-test/']
      ]
    },
    '/seo-tools/': {
      label:'SEO', icon:'search', shortcuts:[
        ['SEO Audit','/seo-tools/'],['Meta Tag Checker','/meta-tag-checker/'],['Canonical Checker','/canonical-tag-checker/'],
        ['Robots Tester','/robots-txt-tester/'],['Schema Generator','/schema-markup-generator/'],['Slug Generator','/slug-generator/']
      ]
    },
    '/text-tools/': {
      label:'Text', icon:'text', shortcuts:[
        ['Word Counter','/word-counter/'],['Character Counter','/character-counter/'],['Case Converter','/case-converter/'],
        ['Lorem Ipsum','/lorem-ipsum-generator/']
      ]
    }
  };

  function navIcon(name, className = 'nav-icon') {
    const paths = {
      code:'<path d="M8.5 9 5 12l3.5 3M15.5 9 19 12l-3.5 3M14 5l-4 14"/>',
      globe:'<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16"/>',
      search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4M8 11h6M11 8v6"/>',
      text:'<path d="M5 6h14M8 6v12M16 6v12M6 18h4M14 18h4"/>',
      tool:'<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z"/>'
    };
    return '<svg class="' + className + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.tool) + '</svg>';
  }

  function enhancePrimaryNavigation(nav) {
    if (!nav || nav.dataset.enhanced === 'true') return;
    nav.dataset.enhanced = 'true';
    const categoryLinks = [...nav.children].filter(el => el.tagName === 'A');
    categoryLinks.forEach(link => {
      const href = link.getAttribute('href');
      const config = navCatalog[href];
      if (!config) return;

      const group = document.createElement('div');
      group.className = 'nav-group';
      group.dataset.navGroup = config.label.toLowerCase();

      const categoryLink = link.cloneNode(true);
      categoryLink.classList.add('nav-category-link');
      categoryLink.innerHTML = navIcon(config.icon) + '<span>' + config.label + '</span>';

      const toggle = document.createElement('button');
      toggle.className = 'nav-group-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Show ' + config.label + ' tools');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span aria-hidden="true">⌄</span>';

      const panel = document.createElement('div');
      panel.className = 'nav-direct-menu';
      panel.setAttribute('role', 'menu');
      const heading = document.createElement('div');
      heading.className = 'nav-direct-head';
      heading.innerHTML = '<strong>' + config.label + ' tools</strong><a href="' + href + '">View all</a>';
      panel.appendChild(heading);

      const list = document.createElement('div');
      list.className = 'nav-direct-list';
      config.shortcuts.forEach(([title, url]) => {
        const item = document.createElement('a');
        item.href = url;
        item.setAttribute('role', 'menuitem');
        item.innerHTML = navIcon(config.icon, 'nav-menu-icon') + '<span>' + title + '</span>';
        list.appendChild(item);
      });
      panel.appendChild(list);

      group.append(categoryLink, toggle, panel);
      link.replaceWith(group);

      toggle.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const open = !group.classList.contains('open');
        nav.querySelectorAll('.nav-group.open').forEach(other => {
          if (other !== group) {
            other.classList.remove('open');
            const otherToggle = other.querySelector('.nav-group-toggle');
            if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
          }
        });
        group.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
      });
    });

    document.addEventListener('click', event => {
      if (nav.contains(event.target)) return;
      nav.querySelectorAll('.nav-group.open').forEach(group => {
        group.classList.remove('open');
        const toggle = group.querySelector('.nav-group-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initHeaderSearch() {
    const navRoot = document.querySelector('.nav');
    const navActions = navRoot?.querySelector('.nav-actions');
    if (!navRoot || !navActions || navRoot.querySelector('[data-header-search]')) return;

    const shell = document.createElement('div');
    shell.className = 'header-tool-search';
    shell.dataset.headerSearch = 'true';
    shell.innerHTML =
      '<label class="sr-only" for="headerToolSearch">Search tools</label>' +
      '<div class="header-search-box">' +
        navIcon('search','header-search-icon') +
        '<input id="headerToolSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Search tools…" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="headerToolResults">' +
        '<kbd aria-hidden="true">/</kbd>' +
      '</div>' +
      '<div id="headerToolResults" class="header-search-results" role="listbox" hidden></div>';
    navRoot.insertBefore(shell, navActions);

    const input = shell.querySelector('input');
    const results = shell.querySelector('.header-search-results');
    let catalog = null;
    let loadPromise = null;
    let rendered = [];
    let activeIndex = -1;

    const normalize = value => String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');

    async function loadCatalog() {
      if (catalog) return catalog;
      if (!loadPromise) {
        loadPromise = fetch('/assets/tool-catalog.json?v=20261003-1', {credentials:'same-origin'})
          .then(response => {
            if (!response.ok) throw new Error('Tool catalog HTTP ' + response.status);
            return response.json();
          })
          .then(data => {
            catalog = Array.isArray(data) ? data : [];
            input.placeholder = 'Search ' + catalog.length + ' tools…';
            return catalog;
          })
          .catch(() => {
            catalog = [];
            return catalog;
          });
      }
      return loadPromise;
    }

    function rankEntry(entry, query) {
      const title = normalize(entry.title);
      const description = normalize(entry.description);
      const aliases = (entry.keywords || []).map(normalize);
      if (title.startsWith(query)) return 0;
      if (title.split(/\s+/).some(word => word.startsWith(query))) return 1;
      if (aliases.some(alias => alias.startsWith(query))) return 2;
      if (aliases.some(alias => alias.split(/\s+/).some(word => word.startsWith(query)))) return 3;
      if (title.includes(query)) return 4;
      if (aliases.some(alias => alias.includes(query))) return 5;
      if (description.includes(query)) return 6;
      return 99;
    }

    function setActive(index) {
      activeIndex = index;
      const options = [...results.querySelectorAll('[role="option"]')];
      options.forEach((option, idx) => {
        option.classList.toggle('active', idx === activeIndex);
        option.setAttribute('aria-selected', String(idx === activeIndex));
      });
      if (activeIndex >= 0 && options[activeIndex]) {
        input.setAttribute('aria-activedescendant', options[activeIndex].id);
        options[activeIndex].scrollIntoView({block:'nearest'});
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function closeResults() {
      results.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    }

    function render(matches) {
      results.innerHTML = '';
      rendered = matches;
      activeIndex = -1;
      if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'header-search-empty';
        empty.textContent = 'No matching tool. Try another keyword.';
        results.appendChild(empty);
      } else {
        matches.forEach((entry, index) => {
          const option = document.createElement('a');
          option.href = entry.url;
          option.id = 'header-tool-option-' + index;
          option.className = 'header-search-option';
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', 'false');
          option.innerHTML =
            navIcon((navCatalog['/' + entry.category.toLowerCase() + '-tools/'] || {}).icon || 'tool','header-result-icon') +
            '<span class="header-result-copy"><strong>' + entry.title + '</strong><small>' + entry.description + '</small></span>' +
            '<span class="header-result-category">' + entry.category + '</span>';
          results.appendChild(option);
        });
      }
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    async function search() {
      const query = normalize(input.value);
      if (!query) {
        closeResults();
        return;
      }
      const data = await loadCatalog();
      if (normalize(input.value) !== query) return;
      const matches = data
        .map(entry => ({entry, score:rankEntry(entry, query)}))
        .filter(item => item.score < 99)
        .sort((a,b) => a.score - b.score || a.entry.title.localeCompare(b.entry.title))
        .slice(0, 8)
        .map(item => item.entry);
      render(matches);
    }

    input.addEventListener('focus', loadCatalog);
    input.addEventListener('input', search);
    input.addEventListener('keydown', event => {
      const count = rendered.length;
      if (event.key === 'ArrowDown' && count) {
        event.preventDefault();
        if (results.hidden) results.hidden = false;
        setActive((activeIndex + 1) % count);
      } else if (event.key === 'ArrowUp' && count) {
        event.preventDefault();
        setActive((activeIndex - 1 + count) % count);
      } else if (event.key === 'Enter' && activeIndex >= 0 && rendered[activeIndex]) {
        event.preventDefault();
        location.href = rendered[activeIndex].url;
      } else if (event.key === 'Escape') {
        closeResults();
        input.blur();
      }
    });

    document.addEventListener('keydown', event => {
      const target = event.target;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        input.focus();
      }
    });

    document.addEventListener('click', event => {
      if (!shell.contains(event.target)) closeResults();
    });
  }

  applyTheme(preferredTheme());

  document.addEventListener('DOMContentLoaded', () => {
    // Mirror the visible breadcrumb as BreadcrumbList structured data.
    const crumb = document.querySelector('.crumb');
    if (crumb && !document.querySelector('script[data-swu-breadcrumb]')) {
      const parts = [...crumb.children].filter(el => el.textContent.trim() && el.textContent.trim() !== '/');
      const items = parts.map((el, index) => {
        const name = el.textContent.trim();
        let item = null;
        if (el.tagName === 'A' && el.getAttribute('href')) {
          try { item = new URL(el.getAttribute('href'), location.origin).href; } catch {}
        } else if (index === parts.length - 1) {
          item = location.origin + location.pathname;
        }
        const entry = {'@type':'ListItem', position:index + 1, name};
        if (item) entry.item = item;
        return entry;
      });
      if (items.length >= 2) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.swuBreadcrumb = 'true';
        script.textContent = JSON.stringify({
          '@context':'https://schema.org',
          '@type':'BreadcrumbList',
          itemListElement:items
        });
        document.head.appendChild(script);
      }
    }

    const themeButton = document.getElementById('themeToggle');
    const menuButton = document.getElementById('menuToggle');
    const nav = document.getElementById('primaryNav');
    const brandMark = document.querySelector('.brand-mark');

    if (brandMark) {
      brandMark.textContent = '';
      brandMark.setAttribute('aria-hidden', 'true');
    }

    const footerLinks = document.querySelector('.footer-links');
    if (footerLinks) {
      footerLinks.innerHTML = '<a href="/about/">About</a><a href="/methodology/">Methodology</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a><a href="/sitemap.xml">Sitemap</a>';
    }

    enhancePrimaryNavigation(nav);
    setActiveNavigation(nav);
    initHeaderSearch();

    if (themeButton) {
      applyTheme(root.dataset.theme || preferredTheme());
      themeButton.addEventListener('click', () => {
        applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
      });
    }

    if (menuButton && nav) {
      menuButton.addEventListener('click', () => {
        const open = !nav.classList.contains('open');
        nav.classList.toggle('open', open);
        menuButton.setAttribute('aria-expanded', String(open));
      });

      nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      }));

      document.addEventListener('click', event => {
        if (!nav.classList.contains('open')) return;
        if (nav.contains(event.target) || menuButton.contains(event.target)) return;
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      });

      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !nav.classList.contains('open')) return;
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.focus();
      });
    }
  });
})();