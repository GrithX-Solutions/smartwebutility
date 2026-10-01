(() => {
  'use strict';

  const root = document.documentElement;
  const storageKey = 'swu-theme';

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
        '/developer-tools','/json-formatter','/xml-to-json','/json-to-csv','/yaml-to-json','/json-to-yaml','/txt-to-csv','/xml-to-excel','/json-to-excel','/csv-to-json','/excel-to-json','/base64-encoder-decoder','/unix-timestamp-converter',
        '/uuid-generator','/hash-generator','/jwt-decoder','/regex-tester','/url-encoder-decoder',
        '/html-entity-encoder-decoder','/cron-expression-helper','/password-generator','/random-string-generator'
      ],
      '/website-tools': [
        '/website-tools','/dns-checker','/dns-propagation-checker','/ssl-checker',
        '/http-status-checker','/http-header-checker','/redirect-checker','/bulk-redirect-checker','/sitemap-checker',
        '/meta-tag-checker','/open-graph-checker','/favicon-generator'
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