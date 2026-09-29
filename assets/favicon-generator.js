(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const els = {
    file: $('faviconFile'), drop: $('faviconDrop'), fileMeta: $('fileMeta'),
    imageSource: $('imageSource'), textSource: $('textSource'), text: $('faviconText'),
    bg: $('bgColor'), fg: $('fgColor'), padding: $('paddingRange'), paddingValue: $('paddingValue'),
    radius: $('radiusRange'), radiusValue: $('radiusValue'), fit: $('fitMode'), transparent: $('transparentBg'),
    generate: $('generateFavicons'), status: $('faviconStatus'), downloadIco: $('downloadIco'),
    downloadZip: $('downloadZip'), install: $('installCode'), htmlCode: $('htmlCode'),
    manifestCode: $('manifestCode'), copyHtml: $('copyHtml'), copyManifest: $('copyManifest'),
    previewMode: $('previewMode')
  };

  const previewSizes = [16, 32, 48, 180, 192];
  let mode = 'text';
  let sourceImage = null;
  let sourceName = '';
  let generated = null;

  function setStatus(message, kind) {
    els.status.textContent = message;
    if (kind) els.status.dataset.kind = kind;
    else delete els.status.dataset.kind;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function getTextValue() {
    return (els.text.value || 'SW').trim().slice(0, 4) || 'SW';
  }

  function drawIcon(canvas, size) {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const radius = size * (Number(els.radius.value) / 100);
    if (!els.transparent.checked) {
      ctx.save();
      roundedRect(ctx, 0, 0, size, size, radius);
      ctx.clip();
      ctx.fillStyle = els.bg.value;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();
    }

    const pad = size * (Number(els.padding.value) / 100);
    const box = Math.max(1, size - pad * 2);

    ctx.save();
    roundedRect(ctx, 0, 0, size, size, radius);
    ctx.clip();

    if (mode === 'image' && sourceImage) {
      const iw = sourceImage.naturalWidth || sourceImage.width || 1;
      const ih = sourceImage.naturalHeight || sourceImage.height || 1;
      const scale = els.fit.value === 'cover' ? Math.max(box / iw, box / ih) : Math.min(box / iw, box / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (size - dw) / 2;
      const dy = (size - dh) / 2;
      ctx.drawImage(sourceImage, dx, dy, dw, dh);
    } else {
      const value = getTextValue();
      const isEmoji = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF]/u.test(value);
      let fontSize = box * (value.length > 2 ? .48 : value.length > 1 ? .58 : .68);
      fontSize = Math.max(6, fontSize);
      ctx.fillStyle = els.fg.value;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = (isEmoji ? '' : '800 ') + fontSize + 'px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText(value, size / 2, size / 2 + size * .02, box);
    }
    ctx.restore();
  }

  function renderPreviews() {
    previewSizes.forEach(size => {
      const canvas = $('preview' + size);
      if (canvas) drawIcon(canvas, size);
    });
    els.previewMode.textContent = mode === 'image' ? (sourceImage ? 'Image' : 'Image pending') : 'Text / Emoji';
    generated = null;
    els.downloadIco.disabled = true;
    els.downloadZip.disabled = true;
    els.install.hidden = true;
  }

  function switchMode(nextMode) {
    mode = nextMode;
    document.querySelectorAll('.source-tab').forEach(button => {
      const active = button.dataset.mode === nextMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    els.imageSource.hidden = nextMode !== 'image';
    els.textSource.hidden = nextMode !== 'text';
    renderPreviews();
  }

  function loadFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setStatus('Please choose an image smaller than 10 MB.', 'error');
      return;
    }
    const valid = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    const isSvgName = /\.svg$/i.test(file.name);
    if (!valid.includes(file.type) && !isSvgName) {
      setStatus('Use PNG, JPG, WebP or SVG source artwork.', 'error');
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (sourceImage && sourceImage.dataset && sourceImage.dataset.objectUrl) {
        URL.revokeObjectURL(sourceImage.dataset.objectUrl);
      }
      image.dataset.objectUrl = url;
      sourceImage = image;
      sourceName = file.name;
      mode = 'image';
      switchMode('image');
      els.fileMeta.hidden = false;
      els.fileMeta.textContent = file.name + ' · ' + Math.round(file.size / 1024) + ' KB · ' + image.naturalWidth + '×' + image.naturalHeight;
      setStatus('Source loaded. Adjust the preview, then generate the favicon files.');
      renderPreviews();
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus('The selected image could not be decoded by this browser.', 'error');
    };
    image.src = url;
  }

  function canvasBlob(size) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      drawIcon(canvas, size);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png');
    });
  }

  async function blobBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
  }

  function writeU16(view, offset, value) {
    view.setUint16(offset, value, true);
  }

  function writeU32(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
  }

  async function createIco(blobs) {
    const items = [];
    for (const item of blobs) items.push({ size: item.size, bytes: await blobBytes(item.blob) });
    const headerSize = 6 + items.length * 16;
    const total = headerSize + items.reduce((sum, item) => sum + item.bytes.length, 0);
    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    writeU16(view, 0, 0);
    writeU16(view, 2, 1);
    writeU16(view, 4, items.length);
    let offset = headerSize;

    items.forEach((item, index) => {
      const p = 6 + index * 16;
      out[p] = item.size >= 256 ? 0 : item.size;
      out[p + 1] = item.size >= 256 ? 0 : item.size;
      out[p + 2] = 0;
      out[p + 3] = 0;
      writeU16(view, p + 4, 1);
      writeU16(view, p + 6, 32);
      writeU32(view, p + 8, item.bytes.length);
      writeU32(view, p + 12, offset);
      out.set(item.bytes, offset);
      offset += item.bytes.length;
    });
    return new Blob([out], { type: 'image/x-icon' });
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosTimeDate(date) {
    const year = Math.max(1980, date.getFullYear());
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
  }

  async function createZip(files) {
    const encoder = new TextEncoder();
    const now = dosTimeDate(new Date());
    const entries = [];

    for (const file of files) {
      const name = encoder.encode(file.name);
      const data = file.blob ? await blobBytes(file.blob) : encoder.encode(file.text || '');
      entries.push({ name, data, crc: crc32(data), offset: 0 });
    }

    let localSize = 0;
    entries.forEach(entry => { localSize += 30 + entry.name.length + entry.data.length; });
    let centralSize = 0;
    entries.forEach(entry => { centralSize += 46 + entry.name.length; });

    const out = new Uint8Array(localSize + centralSize + 22);
    const view = new DataView(out.buffer);
    let p = 0;

    entries.forEach(entry => {
      entry.offset = p;
      writeU32(view, p, 0x04034b50); p += 4;
      writeU16(view, p, 20); p += 2;
      writeU16(view, p, 0); p += 2;
      writeU16(view, p, 0); p += 2;
      writeU16(view, p, now.time); p += 2;
      writeU16(view, p, now.day); p += 2;
      writeU32(view, p, entry.crc); p += 4;
      writeU32(view, p, entry.data.length); p += 4;
      writeU32(view, p, entry.data.length); p += 4;
      writeU16(view, p, entry.name.length); p += 2;
      writeU16(view, p, 0); p += 2;
      out.set(entry.name, p); p += entry.name.length;
      out.set(entry.data, p); p += entry.data.length;
    });

    const centralOffset = p;
    entries.forEach(entry => {
      writeU32(view, p, 0x02014b50); p += 4;
      writeU16(view, p, 20); p += 2;
      writeU16(view, p, 20); p += 2;
      writeU16(view, p, 0); p += 2;
      writeU16(view, p, 0); p += 2;
      writeU16(view, p, now.time); p += 2;
      writeU16(view, p, now.day); p += 2;
      writeU32(view, p, entry.crc); p += 4;
      writeU32(view, p, entry.data.length); p += 4;
      writeU32(view, p, entry.data.length); p += 4;
      writeU16(view, p, entry.name.length); p += 2;
      writeU16(view, p, 0); p += 2;
      writeU16(view, p, 0); p += 2;
      writeU16(view, p, 0); p += 2;
      writeU16(view, p, 0); p += 2;
      writeU32(view, p, 0); p += 4;
      writeU32(view, p, entry.offset); p += 4;
      out.set(entry.name, p); p += entry.name.length;
    });

    const centralLength = p - centralOffset;
    writeU32(view, p, 0x06054b50); p += 4;
    writeU16(view, p, 0); p += 2;
    writeU16(view, p, 0); p += 2;
    writeU16(view, p, entries.length); p += 2;
    writeU16(view, p, entries.length); p += 2;
    writeU32(view, p, centralLength); p += 4;
    writeU32(view, p, centralOffset); p += 4;
    writeU16(view, p, 0);
    return new Blob([out], { type: 'application/zip' });
  }

  function downloadBlob(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function generate() {
    if (mode === 'image' && !sourceImage) {
      setStatus('Choose an image or switch to Text / Emoji mode first.', 'error');
      return;
    }
    els.generate.disabled = true;
    setStatus('Rendering favicon sizes in your browser…');

    try {
      const sizes = [16, 32, 48, 180, 192, 512];
      const png = {};
      for (const size of sizes) png[size] = await canvasBlob(size);

      const ico = await createIco([
        { size: 16, blob: png[16] },
        { size: 32, blob: png[32] },
        { size: 48, blob: png[48] }
      ]);

      const manifest = {
        name: '',
        short_name: '',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ],
        theme_color: els.bg.value,
        background_color: els.bg.value,
        display: 'standalone'
      };
      const manifestText = JSON.stringify(manifest, null, 2);
      const htmlText = [
        '<link rel="icon" href="/favicon.ico" sizes="any">',
        '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
        '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
        '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        '<meta name="theme-color" content="' + els.bg.value + '">'
      ].join('\n');

      const files = [
        { name: 'favicon.ico', blob: ico },
        { name: 'favicon-16x16.png', blob: png[16] },
        { name: 'favicon-32x32.png', blob: png[32] },
        { name: 'favicon-48x48.png', blob: png[48] },
        { name: 'apple-touch-icon.png', blob: png[180] },
        { name: 'android-chrome-192x192.png', blob: png[192] },
        { name: 'android-chrome-512x512.png', blob: png[512] },
        { name: 'site.webmanifest', text: manifestText }
      ];

      const zip = await createZip(files);
      generated = { ico, zip, files, manifestText, htmlText };
      els.htmlCode.value = htmlText;
      els.manifestCode.value = manifestText;
      els.downloadIco.disabled = false;
      els.downloadZip.disabled = false;
      els.install.hidden = false;
      setStatus('Favicon package ready: ICO, PNG sizes, Apple icon, web app icons and manifest.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('The browser could not generate the favicon package. Try a different source image.', 'error');
    } finally {
      els.generate.disabled = false;
    }
  }

  async function copyText(value, button) {
    try {
      await navigator.clipboard.writeText(value);
      const previous = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = previous; }, 1200);
    } catch {
      setStatus('Clipboard access was blocked. Select and copy the code manually.', 'error');
    }
  }

  document.querySelectorAll('.source-tab').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
  document.querySelectorAll('.quick-glyphs button').forEach(button => button.addEventListener('click', () => {
    els.text.value = button.dataset.glyph;
    switchMode('text');
  }));

  els.file.addEventListener('change', event => loadFile(event.target.files[0]));
  ['dragenter', 'dragover'].forEach(type => els.drop.addEventListener(type, event => {
    event.preventDefault();
    els.drop.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(type => els.drop.addEventListener(type, event => {
    event.preventDefault();
    els.drop.classList.remove('dragover');
  }));
  els.drop.addEventListener('drop', event => loadFile(event.dataTransfer.files[0]));

  [els.text, els.bg, els.fg, els.padding, els.radius, els.fit, els.transparent].forEach(control => {
    control.addEventListener('input', () => {
      els.paddingValue.value = els.padding.value + '%';
      els.radiusValue.value = els.radius.value + '%';
      renderPreviews();
    });
    control.addEventListener('change', renderPreviews);
  });

  els.generate.addEventListener('click', generate);
  els.downloadIco.addEventListener('click', () => generated && downloadBlob('favicon.ico', generated.ico));
  els.downloadZip.addEventListener('click', () => generated && downloadBlob('favicon-package.zip', generated.zip));
  els.copyHtml.addEventListener('click', () => copyText(els.htmlCode.value, els.copyHtml));
  els.copyManifest.addEventListener('click', () => copyText(els.manifestCode.value, els.copyManifest));

  switchMode('text');
})();