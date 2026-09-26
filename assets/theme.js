(() => {
  'use strict';

  const root = document.documentElement;
  const storageKey = 'swu-theme';

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
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0b1120' : '#f8fafc');

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
        '/developer-tools','/json-formatter','/base64-encoder-decoder','/unix-timestamp-converter',
        '/uuid-generator','/hash-generator','/jwt-decoder','/regex-tester','/url-encoder-decoder',
        '/html-entity-encoder-decoder','/cron-expression-helper','/password-generator','/random-string-generator'
      ],
      '/website-tools': [
        '/website-tools','/dns-checker','/dns-propagation-checker','/ssl-checker',
        '/http-status-checker','/http-header-checker','/redirect-checker','/sitemap-checker',
        '/meta-tag-checker','/open-graph-checker'
      ],
      '/seo-tools': [
        '/seo-tools','/meta-tag-generator','/robots-txt-generator','/schema-markup-generator',
        '/open-graph-preview','/slug-generator'
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

  applyTheme(preferredTheme());

  document.addEventListener('DOMContentLoaded', () => {
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
      footerLinks.innerHTML = '<a href="/about/">About</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a><a href="/sitemap.xml">Sitemap</a>';
    }

    setActiveNavigation(nav);

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