(() => {
  'use strict';

  const input = document.getElementById('jwtInput');
  const headerOut = document.getElementById('jwtHeader');
  const payloadOut = document.getElementById('jwtPayload');
  const claimsOut = document.getElementById('jwtClaims');
  const status = document.getElementById('jwtStatus');
  const error = document.getElementById('jwtError');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const setStatus = (msg, kind='neutral') => {
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

  function decodeBase64Url(part) {
    let normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    if (pad) normalized += '='.repeat(4 - pad);
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  function parsePart(part, label) {
    try {
      const text = decodeBase64Url(part);
      return JSON.parse(text);
    } catch {
      throw new Error(`${label} is not valid Base64URL-encoded JSON.`);
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
        if (['exp','nbf','iat'].includes(key)) {
          const date = formatUnix(value);
          value = date ? `${value} (${date})` : value;
        } else if (Array.isArray(value) || (value && typeof value === 'object')) {
          value = JSON.stringify(value);
        }
        return `<tr><th>${label}</th><td class="record-value">${String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</td></tr>`;
      }).join('');

    claimsOut.innerHTML = rows
      ? `<table class="record-table"><tbody>${rows}</tbody></table>`
      : '<div class="empty">No standard JWT claims were found in the payload.</div>';
  }

  function decode() {
    clearError();
    const token = input.value.trim();
    headerOut.value = '';
    payloadOut.value = '';
    claimsOut.innerHTML = '';

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
      renderClaims(payload);

      const alg = header.alg || 'unknown';
      setStatus(`Decoded · alg: ${alg} · signature not verified`, 'success');
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
    claimsOut.innerHTML = '';
    clearError();
    setStatus('Ready');
    input.focus();
  });
  document.getElementById('exampleJwt').addEventListener('click', () => {
    input.value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlNtYXJ0IFdlYiBVdGlsaXR5IiwiaWF0IjoxNzY5NDM4NDAwLCJleHAiOjE3Njk0NDIwMDB9.dummy-signature';
    decode();
  });

  document.getElementById('copyJwtHeader').addEventListener('click', e => copyValue(headerOut, e.currentTarget));
  document.getElementById('copyJwtPayload').addEventListener('click', e => copyValue(payloadOut, e.currentTarget));

  input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      decode();
    }
  });
})();