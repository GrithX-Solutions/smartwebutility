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
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0a0f1e' : '#f7f8fc');

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

  applyTheme(preferredTheme());

  document.addEventListener('DOMContentLoaded', () => {
    const themeButton = document.getElementById('themeToggle');
    const menuButton = document.getElementById('menuToggle');
    const nav = document.getElementById('primaryNav');

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
    }
  });
})();