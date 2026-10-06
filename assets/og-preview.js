(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const title = byId('ogTitle');
  const desc = byId('ogDescription');
  const type = byId('ogType');
  const locale = byId('ogLocale');
  const url = byId('ogUrl');
  const image = byId('ogImage');
  const imageAlt = byId('ogImageAlt');
  const imageWidth = byId('ogImageWidth');
  const imageHeight = byId('ogImageHeight');
  const site = byId('ogSite');
  const crop = byId('ogPreviewCrop');
  const output = byId('ogOutput');
  const card = byId('ogCard');
  const readiness = byId('ogReadiness');
  const error = byId('ogError');
  const status = byId('ogStatus');
  const year = byId('year');

  if (year) year.textContent = new Date().getFullYear();

  const trim = element => element.value.trim();

  const esc = value => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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
    readiness.textContent = 'Fix the invalid input before copying tags.';
    error.textContent = message;
    error.hidden = false;
    card.replaceChildren();
    setStatus('Fix input', 'error');
  };

  function absoluteHttpUrl(value, label) {
    if (!value) return '';
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(label + ' must be a fully qualified URL.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error(label + ' must use an absolute HTTP(S) URL.');
    }
    return value;
  }

  function positiveInteger(value, label) {
    if (!value) return '';
    if (!/^\d+$/.test(value) || Number(value) < 1) {
      throw new Error(label + ' must be a positive whole number.');
    }
    return Number(value);
  }

  function validatedLocale(value) {
    if (!value) return '';
    if (!/^[A-Za-z]{2,3}_[A-Za-z]{2}$/.test(value)) {
      throw new Error('Locale should use language_TERRITORY format such as en_US.');
    }
    const [language, territory] = value.split('_');
    return language.toLowerCase() + '_' + territory.toUpperCase();
  }

  function meta(property, value) {
    return '<meta property="' + property + '" content="' + esc(value) + '">';
  }

  function renderCard(imageUrl) {
    card.replaceChildren();

    const media = document.createElement('div');
    const square = crop.value === 'square';
    media.style.aspectRatio = square ? '1 / 1' : '1.91 / 1';
    media.style.background = '#0a1725';
    media.style.borderBottom = '1px solid var(--line)';
    media.style.overflow = 'hidden';

    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = trim(imageAlt);
      img.referrerPolicy = 'no-referrer';
      img.loading = 'lazy';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      media.appendChild(img);
    }

    const body = document.createElement('div');
    body.style.padding = '16px';

    const small = document.createElement('small');
    small.style.color = 'var(--muted)';
    small.textContent = trim(site) || (() => {
      try {
        return trim(url) ? new URL(trim(url)).hostname : 'Example Site';
      } catch {
        return 'Example Site';
      }
    })();

    const heading = document.createElement('h3');
    heading.style.margin = '6px 0';
    heading.textContent = trim(title) || 'Open Graph title preview';

    const paragraph = document.createElement('p');
    paragraph.style.color = 'var(--muted)';
    paragraph.style.margin = '0';
    paragraph.textContent = trim(desc) || 'Description preview';

    body.append(small, heading, paragraph);
    card.append(media, body);
  }

  function readinessText(values) {
    const missing = [];
    if (!values.title) missing.push('og:title');
    if (!values.type) missing.push('og:type');
    if (!values.image) missing.push('og:image');
    if (!values.url) missing.push('og:url');

    const notes = [];

    if (missing.length) {
      notes.push('Missing Open Graph core properties: ' + missing.join(', ') + '.');
    } else {
      notes.push('All four Open Graph core properties are present.');
    }

    if (values.image && !values.imageAlt) {
      notes.push('Add og:image:alt; the Open Graph protocol says an image should specify alt text.');
    }

    if (values.width && values.height) {
      const ratio = values.width / values.height;
      const delta = Math.abs(ratio - 1.91);
      if (delta <= 0.08) {
        notes.push('Image dimensions are close to a 1.91:1 wide-card ratio.');
      } else {
        notes.push('Image ratio is ' + ratio.toFixed(2) + ':1; inspect both crop previews for possible clipping.');
      }
    } else if (values.width || values.height) {
      notes.push('Add both image width and height when you know the dimensions.');
    }

    return notes.join(' ');
  }

  function build() {
    clearError();

    try {
      const values = {
        title: trim(title),
        description: trim(desc),
        type: trim(type),
        locale: validatedLocale(trim(locale)),
        url: absoluteHttpUrl(trim(url), 'og:url'),
        image: absoluteHttpUrl(trim(image), 'og:image'),
        imageAlt: trim(imageAlt),
        width: positiveInteger(trim(imageWidth), 'Image width'),
        height: positiveInteger(trim(imageHeight), 'Image height'),
        site: trim(site)
      };

      const tags = [];
      if (values.title) tags.push(meta('og:title', values.title));
      if (values.description) tags.push(meta('og:description', values.description));
      if (values.url) tags.push(meta('og:url', values.url));
      if (values.image) {
        tags.push(meta('og:image', values.image));
        if (values.width) tags.push(meta('og:image:width', values.width));
        if (values.height) tags.push(meta('og:image:height', values.height));
        if (values.imageAlt) tags.push(meta('og:image:alt', values.imageAlt));
      }
      if (values.site) tags.push(meta('og:site_name', values.site));
      tags.push(meta('og:type', values.type));
      if (values.locale) tags.push(meta('og:locale', values.locale));

      output.value = tags.join('\n');
      readiness.textContent = readinessText(values);
      renderCard(values.image);

      const missingCore = !values.title || !values.type || !values.image || !values.url;
      setStatus(missingCore ? 'Draft · core properties missing' : 'Ready · core properties complete', missingCore ? 'warning' : 'success');
    } catch (caught) {
      fail(caught?.message || 'Could not generate Open Graph tags.');
    }
  }

  [
    title, desc, type, locale, url, image, imageAlt,
    imageWidth, imageHeight, site
  ].forEach(element => {
    element.addEventListener(element.tagName === 'SELECT' ? 'change' : 'input', build);
  });

  crop.addEventListener('change', build);

  byId('copyOg').addEventListener('click', async event => {
    if (!output.value || !error.hidden) return;
    await navigator.clipboard.writeText(output.value);
    const button = event.currentTarget;
    const old = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => button.textContent = old, 1200);
  });

  byId('exampleOg').addEventListener('click', () => {
    title.value = 'Smart Web Utility';
    desc.value = 'Fast, privacy-friendly online web tools.';
    type.value = 'website';
    locale.value = 'en_US';
    url.value = 'https://smartwebutility.com/';
    image.value = 'https://smartwebutility.com/og-image.png';
    imageAlt.value = 'Smart Web Utility tools dashboard';
    imageWidth.value = '1200';
    imageHeight.value = '630';
    site.value = 'Smart Web Utility';
    crop.value = 'wide';
    build();
  });

  byId('clearOg').addEventListener('click', () => {
    title.value = '';
    desc.value = '';
    type.value = 'website';
    locale.value = '';
    url.value = '';
    image.value = '';
    imageAlt.value = '';
    imageWidth.value = '';
    imageHeight.value = '';
    site.value = '';
    crop.value = 'wide';
    build();
    title.focus();
  });

  build();
})();