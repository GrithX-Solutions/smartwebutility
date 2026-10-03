(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const title = $('metaTitle');
  const desc = $('metaDescription');
  const canonical = $('metaCanonical');
  const robots = $('metaRobots');
  const author = $('metaAuthor');
  const siteName = $('metaSiteName');
  const ogType = $('metaOgType');
  const image = $('metaImage');
  const imageAlt = $('metaImageAlt');
  const twitterCard = $('metaTwitterCard');
  const twitterSite = $('metaTwitterSite');
  const output = $('metaOutput');
  const searchPreview = $('metaSearchPreview');
  const socialPreview = $('metaSocialPreview');
  const titleCount = $('metaTitleCount');
  const descCount = $('metaDescriptionCount');
  const status = $('metaStatus');
  const year = $('year');

  if (year) year.textContent = new Date().getFullYear();

  const clean = value => String(value || '').trim().replace(/\s+/g, ' ');
  const esc = value => clean(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  function metaTag(attribute, key, value) {
    const cleaned = clean(value);
    return cleaned ? `<meta ${attribute}="${esc(key)}" content="${esc(cleaned)}">` : '';
  }

  function updateCounts() {
    titleCount.textContent = title.value.length + ' characters';
    descCount.textContent = desc.value.length + ' characters';
  }

  function build() {
    updateCounts();

    const pageTitle = clean(title.value);
    const description = clean(desc.value);
    const pageUrl = clean(canonical.value);
    const pageAuthor = clean(author.value);
    const socialSiteName = clean(siteName.value);
    const socialImage = clean(image.value);
    const socialImageAlt = clean(imageAlt.value);
    const twitterHandle = clean(twitterSite.value);

    const lines = [];

    if (pageTitle || description || pageUrl || robots.value || pageAuthor) {
      lines.push('<!-- Primary page metadata -->');
      if (pageTitle) lines.push('<title>' + esc(pageTitle) + '</title>');
      if (description) lines.push(metaTag('name', 'description', description));
      if (pageUrl) lines.push('<link rel="canonical" href="' + esc(pageUrl) + '">');
      if (robots.value) lines.push(metaTag('name', 'robots', robots.value));
      if (pageAuthor) lines.push(metaTag('name', 'author', pageAuthor));
    }

    if (pageTitle || description || pageUrl || socialSiteName || socialImage || socialImageAlt) {
      if (lines.length) lines.push('');
      lines.push('<!-- Open Graph -->');
      if (pageTitle) lines.push(metaTag('property', 'og:title', pageTitle));
      if (description) lines.push(metaTag('property', 'og:description', description));
      if (pageUrl) lines.push(metaTag('property', 'og:url', pageUrl));
      lines.push(metaTag('property', 'og:type', ogType.value || 'website'));
      if (socialSiteName) lines.push(metaTag('property', 'og:site_name', socialSiteName));
      if (socialImage) lines.push(metaTag('property', 'og:image', socialImage));
      if (socialImageAlt) lines.push(metaTag('property', 'og:image:alt', socialImageAlt));
    }

    if (pageTitle || description || socialImage || socialImageAlt || twitterHandle) {
      if (lines.length) lines.push('');
      lines.push('<!-- Twitter / X card -->');
      lines.push(metaTag('name', 'twitter:card', twitterCard.value || 'summary'));
      if (twitterHandle) lines.push(metaTag('name', 'twitter:site', twitterHandle));
      if (pageTitle) lines.push(metaTag('name', 'twitter:title', pageTitle));
      if (description) lines.push(metaTag('name', 'twitter:description', description));
      if (socialImage) lines.push(metaTag('name', 'twitter:image', socialImage));
      if (socialImageAlt) lines.push(metaTag('name', 'twitter:image:alt', socialImageAlt));
    }

    output.value = lines.filter(Boolean).join('\n');

    searchPreview.innerHTML =
      '<div><strong>' + esc(pageTitle || 'Page title preview') + '</strong>' +
      '<div style="color:var(--brand2);word-break:break-all">' + esc(pageUrl || 'https://example.com/page') + '</div>' +
      '<p style="color:var(--muted);margin-bottom:0">' + esc(description || 'Meta description preview will appear here.') + '</p></div>';

    socialPreview.innerHTML =
      '<div><div style="font-size:.82rem;color:var(--muted);margin-bottom:8px">Illustrative social card · image URL is not fetched</div>' +
      '<strong>' + esc(pageTitle || 'Social title preview') + '</strong>' +
      '<p style="color:var(--muted);margin:.45rem 0">' + esc(description || 'Social description preview will appear here.') + '</p>' +
      (socialImage ? '<div style="font-size:.82rem;word-break:break-all"><b>Image:</b> ' + esc(socialImage) + '</div>' : '') +
      (socialSiteName ? '<div style="font-size:.82rem;margin-top:6px"><b>Site:</b> ' + esc(socialSiteName) + '</div>' : '') +
      '</div>';

    status.textContent = output.value ? 'Generated locally' : 'Add page details';
    status.dataset.kind = output.value ? 'success' : 'neutral';
  }

  const controls = [
    title, desc, canonical, robots, author, siteName,
    ogType, image, imageAlt, twitterCard, twitterSite
  ];

  for (const control of controls) {
    control.addEventListener('input', build);
    control.addEventListener('change', build);
  }

  $('copyMeta').addEventListener('click', async event => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
    } catch {
      output.select();
      document.execCommand('copy');
    }
    const button = event.currentTarget;
    const old = button.textContent;
    button.textContent = 'Copied';
    status.textContent = 'Copied';
    status.dataset.kind = 'success';
    setTimeout(() => button.textContent = old, 1200);
  });

  $('clearMeta').addEventListener('click', () => {
    [title, desc, canonical, author, siteName, image, imageAlt, twitterSite].forEach(control => control.value = '');
    robots.value = 'index,follow';
    ogType.value = 'website';
    twitterCard.value = 'summary_large_image';
    build();
    title.focus();
  });

  $('exampleMeta').addEventListener('click', () => {
    title.value = 'Free Developer Tools | Smart Web Utility';
    desc.value = 'Fast browser-based tools for developers, website owners, and technical teams with clear outputs and privacy-first workflows.';
    canonical.value = 'https://smartwebutility.com/developer-tools/';
    robots.value = 'index,follow';
    author.value = 'Smart Web Utility';
    siteName.value = 'Smart Web Utility';
    ogType.value = 'website';
    image.value = 'https://smartwebutility.com/og-image.png';
    imageAlt.value = 'Smart Web Utility developer tools';
    twitterCard.value = 'summary_large_image';
    twitterSite.value = '';
    build();
  });

  build();
})();