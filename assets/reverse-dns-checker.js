(() => {
  'use strict';
  if (!document.body.hasAttribute('data-reverse-dns-checker')) return;

  const form = document.getElementById('rdnsForm');
  const input = document.getElementById('rdnsIp');
  const progress = document.getElementById('rdnsProgress');
  const error = document.getElementById('rdnsError');
  const results = document.getElementById('rdnsResults');
  const title = document.getElementById('rdnsTitle');
  const meta = document.getElementById('rdnsMeta');
  const family = document.getElementById('rdnsFamily');
  const ptrCount = document.getElementById('rdnsPtrCount');
  const fcrdns = document.getElementById('rdnsFcrdns');
  const agreement = document.getElementById('rdnsAgreement');
  const reverseName = document.getElementById('rdnsReverseName');
  const ptrRecords = document.getElementById('rdnsPtrRecords');
  const resolvers = document.getElementById('rdnsResolvers');
  const findings = document.getElementById('rdnsFindings');
  const methodology = document.getElementById('rdnsMethodology');
  let lastReport = null;

  function clearNode(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function badge(text, kind='') {
    const span = document.createElement('span');
    span.className = 'rdns-badge' + (kind ? ' ' + kind : '');
    span.textContent = text;
    return span;
  }
  function line(text) {
    const p = document.createElement('p');
    p.className = 'rdns-meta-line';
    p.textContent = text;
    return p;
  }
  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    results.hidden = true;
  }
  function statusName(code) {
    return ({0:'NOERROR',2:'SERVFAIL',3:'NXDOMAIN',5:'REFUSED'})[code] || (code == null ? 'Unknown' : 'RCODE ' + code);
  }

  function render(report) {
    lastReport = report;
    error.hidden = true;
    results.hidden = false;
    title.textContent = 'Reverse DNS for ' + report.ip;
    meta.textContent = 'Checked ' + report.checked_at + ' using Google Public DNS and Cloudflare DNS.';
    family.textContent = report.family;
    ptrCount.textContent = String(report.ptr_records.length);
    fcrdns.textContent = report.fcrdns.status === 'confirmed' ? 'Confirmed' : (report.fcrdns.status === 'failed' ? 'Mismatch' : 'N/A');
    agreement.textContent = report.resolver_agreement ? 'Agree' : 'Review';
    reverseName.textContent = report.reverse_name;

    clearNode(ptrRecords);
    if (!report.ptr_records.length) {
      const empty = document.createElement('div');
      empty.className = 'rdns-record';
      empty.append(badge('No PTR', 'review'), line('Neither checked resolver returned a PTR hostname for this public IP.'));
      ptrRecords.appendChild(empty);
    } else {
      report.ptr_records.forEach(record => {
        const card = document.createElement('article');
        card.className = 'rdns-record';
        const head = document.createElement('div');
        head.className = 'rdns-record-head';
        const host = document.createElement('strong');
        host.textContent = record.hostname;
        head.append(host, badge(record.forward_confirmed ? 'FCrDNS pass' : 'No forward match', record.forward_confirmed ? 'good' : 'review'));
        card.appendChild(head);
        card.appendChild(line('PTR TTL: ' + (record.ttl ?? 'n/a') + ' seconds · Seen by: ' + record.resolvers.join(', ')));
        const forwards = [...(record.ipv4 || []), ...(record.ipv6 || [])];
        card.appendChild(line(forwards.length ? 'Forward DNS: ' + forwards.join(', ') : 'Forward DNS: no public A/AAAA address returned.'));
        ptrRecords.appendChild(card);
      });
    }

    clearNode(resolvers);
    report.resolvers.forEach(item => {
      const card = document.createElement('article');
      card.className = 'rdns-resolver';
      const head = document.createElement('div');
      head.className = 'rdns-resolver-head';
      const name = document.createElement('strong');
      name.textContent = item.resolver;
      head.append(name, badge(statusName(item.status), item.ok && item.status === 0 ? 'good' : 'review'));
      card.appendChild(head);
      const values = (item.ptr || []).map(x => x.hostname);
      card.appendChild(line((values.length ? values.join(', ') : 'No PTR answer') + ' · ' + item.time_ms + ' ms'));
      resolvers.appendChild(card);
    });

    clearNode(findings);
    report.findings.forEach(item => {
      const card = document.createElement('article');
      card.className = 'rdns-finding';
      const head = document.createElement('div');
      head.className = 'rdns-finding-head';
      const name = document.createElement('strong');
      name.textContent = item.title;
      const kind = item.status === 'present' ? 'good' : (item.status === 'critical' ? 'bad' : 'review');
      head.append(name, badge(item.status, kind));
      card.appendChild(head);
      card.appendChild(line(item.why));
      if (item.action) card.appendChild(line('Action: ' + item.action));
      findings.appendChild(card);
    });

    methodology.textContent = report.methodology;
    results.scrollIntoView({behavior:'smooth', block:'start'});
  }

  async function run() {
    const ip = input.value.trim();
    if (!ip) {
      showError('Enter a public IPv4 or IPv6 address.');
      return;
    }
    error.hidden = true;
    progress.hidden = false;
    results.hidden = true;
    try {
      const response = await fetch('/api/reverse-dns-check.php?ip=' + encodeURIComponent(ip), {headers:{Accept:'application/json'}});
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || 'Reverse DNS lookup failed.');
      render(data);
    } catch (caught) {
      showError(caught?.message || String(caught));
    } finally {
      progress.hidden = true;
    }
  }

  form.addEventListener('submit', event => { event.preventDefault(); run(); });
  document.querySelectorAll('.rdns-example').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.ip || '';
      input.focus();
    });
  });
  document.getElementById('rdnsCopy').addEventListener('click', async () => {
    if (!lastReport) return;
    const text = [
      'Reverse DNS: ' + lastReport.ip,
      'Reverse name: ' + lastReport.reverse_name,
      'PTR: ' + (lastReport.ptr_records.map(x => x.hostname).join(', ') || 'none'),
      'FCrDNS: ' + lastReport.fcrdns.status,
      'Resolver agreement: ' + (lastReport.resolver_agreement ? 'yes' : 'no')
    ].join('\n');
    try { await navigator.clipboard.writeText(text); }
    catch {
      const area = document.createElement('textarea');
      area.value = text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    }
    meta.textContent = 'Report copied. Checked ' + lastReport.checked_at + '.';
  });
})();