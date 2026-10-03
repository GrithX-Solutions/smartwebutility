(() => {
  'use strict';
  if (!document.body.hasAttribute('data-chmod-calculator')) return;

  const octal = document.getElementById('chmodOctal');
  const symbolic = document.getElementById('chmodSymbolic');
  const target = document.getElementById('chmodTarget');
  const recursive = document.getElementById('chmodRecursive');
  const error = document.getElementById('chmodError');
  const status = document.getElementById('chmodStatus');
  const octalResult = document.getElementById('chmodOctalResult');
  const symbolicResult = document.getElementById('chmodSymbolicResult');
  const specialResult = document.getElementById('chmodSpecialResult');
  const command = document.getElementById('chmodCommand');
  const umask = document.getElementById('umaskValue');
  const umaskFile = document.getElementById('umaskFileResult');
  const umaskDir = document.getElementById('umaskDirResult');

  const bits = {
    u: [document.getElementById('uRead'), document.getElementById('uWrite'), document.getElementById('uExec')],
    g: [document.getElementById('gRead'), document.getElementById('gWrite'), document.getElementById('gExec')],
    o: [document.getElementById('oRead'), document.getElementById('oWrite'), document.getElementById('oExec')]
  };
  const digits = {u: document.getElementById('uDigit'), g: document.getElementById('gDigit'), o: document.getElementById('oDigit')};
  const special = {
    setuid: document.getElementById('setuid'),
    setgid: document.getElementById('setgid'),
    sticky: document.getElementById('sticky')
  };

  const values = [4, 2, 1];
  const chars = ['r', 'w', 'x'];

  function clearError() {
    error.hidden = true;
    error.textContent = '';
    status.textContent = 'Valid permissions';
    status.dataset.kind = 'success';
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    status.textContent = 'Invalid input';
    status.dataset.kind = 'error';
  }

  function specialDigit() {
    return (special.setuid.checked ? 4 : 0) + (special.setgid.checked ? 2 : 0) + (special.sticky.checked ? 1 : 0);
  }

  function classDigit(cls) {
    return bits[cls].reduce((sum, el, i) => sum + (el.checked ? values[i] : 0), 0);
  }

  function baseSymbolic() {
    return ['u','g','o'].map(cls => bits[cls].map((el, i) => el.checked ? chars[i] : '-').join('')).join('');
  }

  function displaySymbolic() {
    const out = baseSymbolic().split('');
    if (special.setuid.checked) out[2] = bits.u[2].checked ? 's' : 'S';
    if (special.setgid.checked) out[5] = bits.g[2].checked ? 's' : 'S';
    if (special.sticky.checked) out[8] = bits.o[2].checked ? 't' : 'T';
    return out.join('');
  }

  function currentOctal() {
    const core = ['u','g','o'].map(classDigit).join('');
    const lead = specialDigit();
    return lead ? String(lead) + core : core;
  }

  function updateOutputs() {
    clearError();
    const mode = currentOctal();
    const sym = displaySymbolic();
    octal.value = mode;
    symbolic.value = sym;
    ['u','g','o'].forEach(cls => digits[cls].textContent = String(classDigit(cls)));
    octalResult.textContent = mode;
    symbolicResult.textContent = sym;
    const specials = [];
    if (special.setuid.checked) specials.push('setuid');
    if (special.setgid.checked) specials.push('setgid');
    if (special.sticky.checked) specials.push('sticky');
    specialResult.textContent = specials.length ? specials.join(', ') : 'none';
    const safeTarget = (target.value.trim() || 'file').replace(/[\r\n]/g, ' ');
    command.textContent = 'chmod ' + (recursive.checked ? '-R ' : '') + mode + ' ' + safeTarget;
  }

  function applyOctal(raw) {
    const value = raw.trim();
    if (!/^[0-7]{3,4}$/.test(value)) {
      showError('Enter a 3- or 4-digit octal mode using digits 0 through 7, such as 755, 644 or 1777.');
      return false;
    }
    const padded = value.length === 3 ? '0' + value : value;
    const nums = [...padded].map(Number);
    special.setuid.checked = Boolean(nums[0] & 4);
    special.setgid.checked = Boolean(nums[0] & 2);
    special.sticky.checked = Boolean(nums[0] & 1);
    ['u','g','o'].forEach((cls, idx) => {
      bits[cls].forEach((el, bitIdx) => el.checked = Boolean(nums[idx + 1] & values[bitIdx]));
    });
    updateOutputs();
    return true;
  }

  function applySymbolic(raw) {
    const inputValue = raw.trim();
    const value = inputValue.length === 10 && /^[bcdlps-]/.test(inputValue)
      ? inputValue.slice(1)
      : inputValue;

    if (!/^[r-][w-][xSs-][r-][w-][xSs-][r-][w-][xTt-]$/.test(value)) {
      showError('Enter permissions such as rwxr-xr-x, rwxr-sr-t, or an ls -l field such as -rwxr-xr-x.');
      return false;
    }

    const positions = [[0,1,2],[3,4,5],[6,7,8]];
    ['u','g','o'].forEach((cls, group) => {
      const p = positions[group];
      bits[cls][0].checked = value[p[0]] === 'r';
      bits[cls][1].checked = value[p[1]] === 'w';
      bits[cls][2].checked = /[xst]/.test(value[p[2]]);
    });

    special.setuid.checked = /[sS]/.test(value[2]);
    special.setgid.checked = /[sS]/.test(value[5]);
    special.sticky.checked = /[tT]/.test(value[8]);
    updateOutputs();
    return true;
  }

  function updateUmask() {
    const raw = umask.value.trim();
    if (!/^[0-7]{1,4}$/.test(raw)) {
      umaskFile.textContent = '—';
      umaskDir.textContent = '—';
      return;
    }
    const mask = parseInt(raw, 8) & 0o777;
    umaskFile.textContent = (0o666 & ~mask & 0o777).toString(8).padStart(3, '0');
    umaskDir.textContent = (0o777 & ~mask & 0o777).toString(8).padStart(3, '0');
  }

  Object.values(bits).flat().forEach(el => el.addEventListener('change', updateOutputs));
  Object.values(special).forEach(el => el.addEventListener('change', updateOutputs));
  recursive.addEventListener('change', updateOutputs);
  target.addEventListener('input', updateOutputs);
  octal.addEventListener('input', () => applyOctal(octal.value));
  symbolic.addEventListener('input', () => applySymbolic(symbolic.value));
  umask.addEventListener('input', updateUmask);

  document.querySelectorAll('.chmod-preset').forEach(button => {
    button.addEventListener('click', () => applyOctal(button.dataset.mode));
  });

  document.getElementById('chmodReset').addEventListener('click', () => {
    target.value = 'file';
    recursive.checked = false;
    applyOctal('755');
  });

  document.getElementById('copyChmod').addEventListener('click', async () => {
    const text = command.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
    status.textContent = 'Command copied';
    status.dataset.kind = 'success';
  });

  applyOctal('755');
  updateUmask();
})();