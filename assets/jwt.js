(() => {
  'use strict';

  const input = document.getElementById('jwtInput');
  const headerOut = document.getElementById('jwtHeader');
  const payloadOut = document.getElementById('jwtPayload');
  const signatureOut = document.getElementById('jwtSignature');
  const claimsOut = document.getElementById('jwtClaims');
  const timeStatusOut = document.getElementById('jwtTimeStatus');
  const status = document.getElementById('jwtStatus');
  const error = document.getElementById('jwtError');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const setStatus = (msg, kind = 'neutral') => {
    status.textContent = msg;
    status.dataset.kind = kind;
  };

  const showError = (msg) => {
    error.textContent = msg;
    error.hidden = false;
    setStatus('Invalid JWT', 'error');
  };

  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
  };

  function normalizeToken(raw) {
    return raw.trim().replace(/^Bearer\s+/i, '').trim();
  }

  function decodeBase64Url(part) {
    if (!part || !/^[A-Za-z0-9_-]+$/.test(part)) {
      throw new Error('JWT header and payload parts must use Base64URL characters.');
    }
    let normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    if (pad === 1) throw new Error('Invalid Base64URL length.');
    if (pad) normalized += '='.repeat(4 - pad);
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  function parsePart(part, label) {
    try {
      const text = decodeBase64Url(part);
      return JSON.parse(text);
    } catch {
      throw new Error(`${label} is not valid Base64URL-encoded UTF-8 JSON.`);
    }
  }

  function pretty(value) {
    return JSON.stringify(value, null, 2);
  }

  function formatUnix(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const d = new Date(value * 1000);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function renderClaims(payload) {
    const known = [
      ['iss', 'Issuer'],
      ['sub', 'Subject'],
      ['aud', 'Audience'],
      ['exp', 'Expires'],
      ['nbf', 'Not before'],
      ['iat', 'Issued at'],
      ['jti', 'JWT ID']
    ];

    const rows = known
      .filter(([key]) => Object.prototype.hasOwnProperty.call(payload, key))
      .map(([key, label]) => {
        let value = payload[key];
        if (['exp', 'nbf', 'iat'].includes(key)) {
          const date = formatUnix(value);
          value = date ? `${value} (${date})` : value;
        } else if (Array.isArray(value) || (value && typeof value === 'object')) {
          value = JSON.stringify(value);
        }
        return `<tr><th>${label}</th><td class="record-value">${escapeHtml(value)}</td></tr>`;
      })
      .join('');

    claimsOut.innerHTML = rows
      ? `<table class="record-table"><tbody>${rows}</tbody></table>`
      : '<div class="empty">No registered JWT claims were found in the payload.</div>';
  }

  function renderTimeStatus(payload) {
    const now = Date.now() / 1000;
    const exp = typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : null;
    const nbf = typeof payload.nbf === 'number' && Number.isFinite(payload.nbf) ? payload.nbf : null;

    let kind = 'neutral';
    let title = 'No temporal verdict';
    let detail = 'No numeric exp or nbf claim is available. This does not verify the token.';

    if (nbf !== null && now < nbf) {
      kind = 'warning';
      title = 'Not active yet';
      detail = `nbf is ${formatUnix(nbf)}. The current browser clock is earlier than that time.`;
    } else if (exp !== null && now >= exp) {
      kind = 'error';
      title = 'Expired by exp';
      detail = `exp is ${formatUnix(exp)}. The current browser clock is at or after that time.`;
    } else if (exp !== null) {
      kind = 'success';
      title = 'Not expired by exp';
      detail = `exp is ${formatUnix(exp)}. This is only a time check, not signature or issuer validation.`;
    } else if (nbf !== null) {
      kind = 'success';
      title = 'Past nbf; no exp claim';
      detail = `nbf is ${formatUnix(nbf)}. The token has no numeric exp claim to evaluate here.`;
    }

    timeStatusOut.dataset.kind = kind;
    timeStatusOut.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>`;
  }

  function base64UrlEncodeJson(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decode() {
    clearError();
    const token = normalizeToken(input.value);
    headerOut.value = '';
    payloadOut.value = '';
    signatureOut.value = '';
    claimsOut.innerHTML = '';
    timeStatusOut.innerHTML = '';
    timeStatusOut.dataset.kind = 'neutral';

    if (!token) return showError('Paste a JWT first.');

    const parts = token.split('.');
    if (parts.length !== 3) {
      return showError('A JWT must contain exactly three dot-separated parts: header.payload.signature.');
    }

    try {
      const header = parsePart(parts[0], 'Header');
      const payload = parsePart(parts[1], 'Payload');

      headerOut.value = pretty(header);
      payloadOut.value = pretty(payload);
      signatureOut.value = parts[2];
      renderClaims(payload);
      renderTimeStatus(payload);

      const alg = typeof header.alg === 'string' && header.alg ? header.alg : 'unknown';
      const bearerPrefix = /^\s*Bearer\s+/i.test(input.value) ? ' · Bearer prefix removed' : '';
      const algWarning = alg.toLowerCase() === 'none' ? ' · alg:none' : '';
      setStatus(`Decoded · alg: ${alg}${algWarning}${bearerPrefix} · signature not verified`, alg.toLowerCase() === 'none' ? 'warning' : 'success');
    } catch (err) {
      showError(err.message || 'Unable to decode this JWT.');
    }
  }

  async function copyValue(el, button) {
    if (!el.value) return;
    try {
      await navigator.clipboard.writeText(el.value);
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = old, 1200);
    } catch {
      el.select();
      document.execCommand('copy');
    }
  }

  document.getElementById('decodeJwt').addEventListener('click', decode);

  document.getElementById('clearJwt').addEventListener('click', () => {
    input.value = '';
    headerOut.value = '';
    payloadOut.value = '';
    signatureOut.value = '';
    claimsOut.innerHTML = '<div class="empty">Decode a JWT to inspect registered claims.</div>';
    timeStatusOut.innerHTML = '<strong>No token decoded</strong><span>Temporal checks will appear here.</span>';
    timeStatusOut.dataset.kind = 'neutral';
    clearError();
    setStatus('Ready');
    input.focus();
  });

  document.getElementById('exampleJwt').addEventListener('click', () => {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'HS256', typ: 'JWT', kid: 'example-key' };
    const payload = {
      iss: 'https://issuer.example',
      sub: 'user-123',
      aud: 'smartwebutility-example',
      iat: now,
      nbf: now - 5,
      exp: now + 3600,
      jti: 'example-token'
    };
    input.value = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(payload)}.signature-not-verified`;
    decode();
  });

  document.getElementById('copyJwtHeader').addEventListener('click', e => copyValue(headerOut, e.currentTarget));
  document.getElementById('copyJwtPayload').addEventListener('click', e => copyValue(payloadOut, e.currentTarget));
  document.getElementById('copyJwtSignature').addEventListener('click', e => copyValue(signatureOut, e.currentTarget));

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      decode();
    }
  });
})();
