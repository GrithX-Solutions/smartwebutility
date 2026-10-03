(() => {
  'use strict';

  const mode = document.body.dataset.converterMode;
  const input = document.getElementById('converterInput');
  const output = document.getElementById('converterOutput');
  const status = document.getElementById('converterStatus');
  const errorBox = document.getElementById('converterError');
  const stats = document.getElementById('converterStats');
  const fileInput = document.getElementById('converterFile');
  if (!mode || !input || !output) return;

  const examples = {
    'xml-to-json': '<user id="42"><name>Ada</name><roles><role>admin</role><role>editor</role></roles><active>true</active></user>',
    'json-to-csv': '[{"name":"Ada","role":"admin","active":true},{"name":"Linus","role":"developer","active":true}]',
    'yaml-to-json': 'service:\n  name: api\n  port: 8080\n  enabled: true\nregions:\n  - us-east\n  - eu-west',
    'json-to-yaml': '{"service":{"name":"api","port":8080,"enabled":true},"regions":["us-east","eu-west"]}',
    'json-to-xml': '{"store":{"book":[{"title":"Moby Dick","price":8.99},{"title":"Sword of Honour","price":12.99}],"open":true},"note":null}'
  };

  const downloads = {
    'xml-to-json': ['converted.json','application/json'],
    'json-to-csv': ['converted.csv','text/csv;charset=utf-8'],
    'yaml-to-json': ['converted.json','application/json'],
    'json-to-yaml': ['converted.yaml','text/yaml;charset=utf-8'],
    'json-to-xml': ['converted.xml','application/xml;charset=utf-8']
  };

  function setStatus(message, kind='neutral') {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    setStatus('Fix input', 'error');
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  function updateStats(text) {
    stats.hidden = false;
    const lines = text ? text.split(/\r?\n/).length : 0;
    stats.innerHTML = '<span><b>' + text.length.toLocaleString() + '</b> characters</span><span><b>' + lines.toLocaleString() + '</b> lines</span>';
  }

  function xmlNodeToValue(node) {
    const elementChildren = [...node.children];
    const attrs = [...node.attributes];
    const text = [...node.childNodes]
      .filter(n => n.nodeType === Node.TEXT_NODE || n.nodeType === Node.CDATA_SECTION_NODE)
      .map(n => n.nodeValue.trim()).filter(Boolean).join(' ');

    if (!attrs.length && !elementChildren.length) return text;

    const value = {};
    attrs.forEach(attr => { value['@' + attr.name] = attr.value; });
    if (text) value['#text'] = text;

    elementChildren.forEach(child => {
      const childValue = xmlNodeToValue(child);
      if (Object.prototype.hasOwnProperty.call(value, child.nodeName)) {
        if (!Array.isArray(value[child.nodeName])) value[child.nodeName] = [value[child.nodeName]];
        value[child.nodeName].push(childValue);
      } else {
        value[child.nodeName] = childValue;
      }
    });
    return value;
  }

  function xmlToJson(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) throw new Error('Invalid XML: ' + parserError.textContent.replace(/\s+/g, ' ').trim().slice(0, 260));
    if (!doc.documentElement) throw new Error('No XML root element found.');
    return JSON.stringify({[doc.documentElement.nodeName]: xmlNodeToValue(doc.documentElement)}, null, 2);
  }

  function csvEscape(value) {
    if (value == null) return '';
    let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/[",\n\r]/.test(text)) text = '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function jsonToCsv(text) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    if (!rows.length) return '';
    const normalized = rows.map(row => {
      if (row && typeof row === 'object' && !Array.isArray(row)) return row;
      return {value: row};
    });
    const headers = [...new Set(normalized.flatMap(row => Object.keys(row)))];
    return [headers.map(csvEscape).join(','), ...normalized.map(row => headers.map(h => csvEscape(row[h])).join(','))].join('\n');
  }

  function requireYaml() {
    if (!window.jsyaml || typeof window.jsyaml.load !== 'function') {
      throw new Error('YAML parser failed to load. Refresh the page and try again.');
    }
  }

  function selectedIndent() {
    return Number(document.getElementById('converterIndent')?.value) === 4 ? 4 : 2;
  }

  function yamlToJson(text) {
    requireYaml();
    const documents = [];
    window.jsyaml.loadAll(text, documentValue => {
      documents.push(documentValue === undefined ? null : documentValue);
    });
    const parsed = documents.length <= 1 ? (documents[0] ?? null) : documents;
    return JSON.stringify(parsed, null, selectedIndent());
  }

  function jsonToYaml(text) {
    requireYaml();
    const parsed = JSON.parse(text);
    return window.jsyaml.dump(parsed, {
      noRefs:true,
      lineWidth:-1,
      sortKeys:false,
      indent:selectedIndent()
    });
  }

  function validXmlName(name) {
    return /^[A-Za-z_][A-Za-z0-9._-]*$/.test(name);
  }

  function xmlEscapeText(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function xmlEscapeAttr(value) {
    return xmlEscapeText(value)
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function xmlElement(name, value, depth, itemName) {
    const indent = '  '.repeat(depth);
    const safeName = validXmlName(name);
    const tag = safeName ? name : 'property';
    const nameAttr = safeName ? '' : ' name="' + xmlEscapeAttr(name) + '"';

    if (value === null) return indent + '<' + tag + nameAttr + ' />';

    if (Array.isArray(value)) {
      if (!value.length) return indent + '<' + tag + nameAttr + ' />';
      return value.map(item => xmlElement(name, item, depth, itemName)).join('\n');
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (!entries.length) return indent + '<' + tag + nameAttr + ' />';
      const children = entries.map(([key, child]) => {
        if (Array.isArray(child)) {
          if (!child.length) return xmlElement(key, [], depth + 1, itemName);
          return child.map(item => xmlElement(key, item, depth + 1, itemName)).join('\n');
        }
        return xmlElement(key, child, depth + 1, itemName);
      }).join('\n');
      return indent + '<' + tag + nameAttr + '>\n' + children + '\n' + indent + '</' + tag + '>';
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('JSON contains a non-finite number, which is not valid JSON data.');
    }

    return indent + '<' + tag + nameAttr + '>' + xmlEscapeText(value) + '</' + tag + '>';
  }

  function jsonToXml(text) {
    const parsed = JSON.parse(text);
    const rootEl = document.getElementById('jsonXmlRoot');
    const itemEl = document.getElementById('jsonXmlItem');
    const rootName = (rootEl?.value || 'root').trim();
    const itemName = (itemEl?.value || 'item').trim();

    if (!validXmlName(rootName)) throw new Error('Root element must start with a letter or underscore and use only letters, numbers, dot, underscore or hyphen.');
    if (!validXmlName(itemName)) throw new Error('Array item element must start with a letter or underscore and use only letters, numbers, dot, underscore or hyphen.');

    let body = '';
    if (Array.isArray(parsed)) {
      body = parsed.length
        ? parsed.map(item => xmlElement(itemName, item, 1, itemName)).join('\n')
        : '';
    } else if (parsed && typeof parsed === 'object') {
      body = Object.entries(parsed).map(([key, value]) => {
        if (Array.isArray(value)) {
          if (!value.length) return xmlElement(key, [], 1, itemName);
          return value.map(item => xmlElement(key, item, 1, itemName)).join('\n');
        }
        return xmlElement(key, value, 1, itemName);
      }).join('\n');
    } else {
      body = xmlElement(itemName, parsed, 1, itemName);
    }

    return '<?xml version="1.0" encoding="UTF-8"?>\n<' + rootName + '>' +
      (body ? '\n' + body + '\n' : '') +
      '</' + rootName + '>';
  }

  function convert() {
    clearError();
    const raw = input.value.trim();
    if (!raw) {
      output.value = '';
      stats.hidden = true;
      setStatus('Add input', 'neutral');
      return;
    }
    try {
      let result = '';
      if (mode === 'xml-to-json') result = xmlToJson(raw);
      else if (mode === 'json-to-csv') result = jsonToCsv(raw);
      else if (mode === 'yaml-to-json') result = yamlToJson(raw);
      else if (mode === 'json-to-yaml') result = jsonToYaml(raw);
      else if (mode === 'json-to-xml') result = jsonToXml(raw);
      else throw new Error('Unknown converter mode.');
      output.value = result;
      updateStats(result);
      setStatus('Converted', 'success');
    } catch (error) {
      output.value = '';
      stats.hidden = true;
      showError(error && error.message ? error.message : String(error));
    }
  }

  document.getElementById('convertBtn')?.addEventListener('click', convert);
  document.getElementById('exampleBtn')?.addEventListener('click', () => {
    input.value = examples[mode] || '';
    convert();
  });
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    input.value = '';
    output.value = '';
    clearError();
    stats.hidden = true;
    setStatus('Ready', 'neutral');
    input.focus();
  });
  document.getElementById('copyBtn')?.addEventListener('click', async () => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      setStatus('Copied', 'success');
    } catch {
      output.select();
      document.execCommand('copy');
      setStatus('Copied', 'success');
    }
  });
  document.getElementById('downloadBtn')?.addEventListener('click', () => {
    if (!output.value) return;
    const [name, type] = downloads[mode] || ['converted.txt','text/plain'];
    const url = URL.createObjectURL(new Blob([output.value], {type}));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError('Please choose a file smaller than 5 MB.');
      fileInput.value = '';
      return;
    }
    input.value = await file.text();
    convert();
  });

  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      convert();
    }
  });

  document.getElementById('converterIndent')?.addEventListener('change', () => {
    if (input.value.trim()) convert();
  });

  for (const controlId of ['jsonXmlRoot','jsonXmlItem']) {
    document.getElementById(controlId)?.addEventListener('change', () => {
      if (mode === 'json-to-xml' && input.value.trim()) convert();
    });
  }
})();