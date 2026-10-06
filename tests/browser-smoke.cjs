const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');

const origin = process.env.SMOKE_ORIGIN || 'http://127.0.0.1:8765';
const cases = [
  ['json-formatter', async p => {
    await p.locator('#jsonInput').fill('{"name":"SmartWebUtility","n":2}');
    await p.locator('#formatJson').click();
    assert.match(await p.locator('#jsonOutput').inputValue(), /"name"/);
    await p.locator('#jsonInput').fill('{"bad":');
    await p.locator('#validateJson').click();
    assert.equal(await p.locator('#jsonError').isHidden(), false);
  }],
  ['xml-to-json', async p => {
    await p.locator('#converterInput').fill('<users><user id="1"><name>Ada</name></user><user id="2"><name>Linus</name></user></users>');
    await p.locator('#convertBtn').click();
    assert.ok((await p.locator('#converterOutput').inputValue()).includes('"user"'));
    assert.equal(await p.locator('#converterError').isHidden(), true);
  }],
  ['json-to-csv', async p => {
    await p.locator('#converterInput').fill('[{"name":"Ada","role":"admin"},{"name":"Linus","role":"developer"}]');
    await p.locator('#convertBtn').click();
    const csv = await p.locator('#converterOutput').inputValue();
    assert.ok(csv.includes('name,role'));
    assert.ok(csv.includes('Ada,admin'));
  }],
  ['yaml-to-json', async p => {
    await p.locator('#converterIndent').selectOption('4');
    await p.locator('#converterInput').fill('service:\n  name: api\n---\nservice:\n  name: worker');
    await p.locator('#convertBtn').click();
    const output = await p.locator('#converterOutput').inputValue();
    const parsed = JSON.parse(output);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].service.name, 'api');
    assert.equal(parsed[1].service.name, 'worker');
    assert.ok(output.includes('\n    {'));
  }],
  ['json-to-yaml', async p => {
    await p.locator('#converterIndent').selectOption('4');
    await p.locator('#converterInput').fill('{"service":{"name":"api","port":8080}}');
    await p.locator('#convertBtn').click();
    const output = await p.locator('#converterOutput').inputValue();
    assert.ok(output.includes('service:'));
    assert.match(output, /service:\n {4}name: api/);
  }],
  ['csv-viewer', async p => {
    await p.locator('#csvInput').fill('name,role\nAda,admin\nLinus,developer');
    await p.locator('#viewCsv').click();
    assert.ok((await p.locator('#csvTable').innerText()).includes('Ada'));
    await p.locator('#csvFilter').fill('Linus');
    assert.ok((await p.locator('#csvTable').innerText()).includes('Linus'));
    assert.equal((await p.locator('#csvTable').innerText()).includes('Ada'), false);
  }],
  ['yaml-formatter', async p => {
    await p.locator('#yamlInput').fill('service:\n name: api\n port: 8080');
    await p.locator('#formatYaml').click();
    let output = await p.locator('#yamlOutput').inputValue();
    assert.ok(output.includes('service:'));
    assert.equal(output.startsWith('---\n'), false);
    assert.equal(await p.locator('#yamlError').isHidden(), true);

    await p.locator('#yamlIndent').selectOption('4');
    await p.locator('#yamlInput').fill('service:\n  name: api\n---\nservice:\n  name: worker');
    await p.locator('#formatYaml').click();
    output = await p.locator('#yamlOutput').inputValue();
    assert.equal((output.match(/^---$/gm) || []).length, 2);
    assert.match(output, /service:\n {4}name: api/);
    assert.match(output, /service:\n {4}name: worker/);
    assert.match(await p.locator('#yamlStatus').innerText(), /formatted stream/i);
    assert.match(await p.locator('#yamlStats').innerText(), /2\s+documents/i);

    await p.locator('#yamlInput').fill('service:\n  name: api\n---\nservice: [broken');
    await p.locator('#formatYaml').click();
    assert.equal(await p.locator('#yamlError').isHidden(), false);
    assert.equal(await p.locator('#yamlOutput').inputValue(), '');
  }],
  ['xml-to-csv', async p => {
    await p.locator('#xmlCsvInput').fill('<users><user id="1"><name>Ada</name></user><user id="2"><name>Linus</name></user></users>');
    await p.locator('#convertXmlCsv').click();
    const csv = await p.locator('#xmlCsvOutput').inputValue();
    assert.ok(csv.includes('@id,name'));
    assert.ok(csv.includes('1,Ada'));
  }],
  ['xml-formatter-validator', async p => {
    await p.locator('#xmlFormatInput').fill('<catalog><item id="1"><name>Ada</name></item><item id="2"><name>Linus</name></item></catalog>');
    await p.locator('#formatXml').click();
    const formatted = await p.locator('#xmlFormatOutput').inputValue();
    assert.ok(formatted.includes('<catalog>'));
    assert.ok(formatted.includes('  <item id="1">'));
    assert.equal(await p.locator('#xmlFormatError').isHidden(), true);

    await p.locator('#xmlFormatInput').fill('<catalog>\n  <item>\n</catalog>');
    await p.locator('#validateXml').click();
    assert.equal(await p.locator('#xmlFormatError').isHidden(), false);
    const parseError = await p.locator('#xmlFormatError').innerText();
    assert.match(parseError, /Invalid XML/i);
    assert.match(parseError, /line\s+\d+/i);
    assert.match(parseError, /column\s+\d+/i);
  }],
  ['toml-formatter-validator', async p => {
    await p.locator('#tomlInput').fill('title = "Example"\n\n[database]\nserver = "db.example.com"\n');
    await p.locator('#formatToml').click();
    await p.waitForFunction(() => document.getElementById('tomlStatus').textContent === 'Formatted');
    assert.ok((await p.locator('#tomlOutput').inputValue()).includes('[database]'));
    assert.equal(await p.locator('#tomlError').isHidden(), true);
    await p.locator('#tomlInput').fill('title = ');
    await p.locator('#validateToml').click();
    assert.equal(await p.locator('#tomlError').isHidden(), false);
  }],
  ['curl-converter', async p => {
    await p.locator('#curlInput').fill("curl -X POST https://api.example.com/v1/items -H 'Content-Type: application/json' -H 'Authorization: Bearer test-token' -d '{\"name\":\"Ada\",\"active\":true}'");
    await p.locator('#convertCurl').click();
    let code = await p.locator('#curlOutput').inputValue();
    assert.ok(code.includes('requests.request'));
    assert.ok(code.includes('api.example.com/v1/items'));
    assert.equal(await p.locator('#curlError').isHidden(), true);
    await p.locator('#curlTarget').selectOption('fetch');
    code = await p.locator('#curlOutput').inputValue();
    assert.ok(code.includes('fetch('));
    assert.ok(code.includes('JSON.stringify'));

    await p.locator('#curlInput').fill("curl --json '{\"name\":' --json '\"Ada\",\"active\":true}' https://api.example.com/v1/items");
    await p.locator('#curlTarget').selectOption('python');
    await p.locator('#convertCurl').click();
    code = await p.locator('#curlOutput').inputValue();
    assert.ok(code.includes('json=payload'));
    assert.ok(code.includes('Content-Type'));
    assert.ok(code.includes('application/json'));
    assert.ok(code.includes('Accept'));
    assert.equal(await p.locator('#curlError').isHidden(), true);

    await p.locator('#curlInput').fill("curl --json '{\"name\":\"Ada\"}' -H 'Content-Type: application/vnd.api+json' -H 'Accept: application/problem+json' https://api.example.com/v1/items");
    await p.locator('#curlTarget').selectOption('fetch');
    await p.locator('#convertCurl').click();
    code = await p.locator('#curlOutput').inputValue();
    assert.ok(code.includes('application/vnd.api+json'));
    assert.ok(code.includes('application/problem+json'));
    assert.ok(code.includes('JSON.stringify'));
    assert.equal((code.match(/Content-Type/g) || []).length, 1);

    await p.locator('#curlInput').fill("curl --json @payload.json https://api.example.com/v1/items");
    await p.locator('#convertCurl').click();
    assert.equal(await p.locator('#curlError').isHidden(), false);
    assert.match(await p.locator('#curlError').innerText(), /file\/stdin/i);

    await p.locator('#curlInput').fill("curl https://example.com -F 'file=@demo.txt'");
    await p.locator('#convertCurl').click();
    assert.equal(await p.locator('#curlError').isHidden(), false);
  }],
  ['json-escape-unescape', async p => {
    await p.locator('#jsonEscapeInput').fill('Line 1\nLine 2\t"quoted"');
    await p.locator('#escapeJsonString').click();
    let value = await p.locator('#jsonEscapeOutput').inputValue();
    assert.ok(value.includes('\\n'));
    assert.ok(value.includes('\\t'));
    assert.ok(value.includes('\\"quoted\\"'));
    await p.locator('#jsonEscapeInput').fill(value);
    await p.locator('#unescapeJsonString').click();
    value = await p.locator('#jsonEscapeOutput').inputValue();
    assert.ok(value.includes('Line 1\nLine 2'));
    assert.equal(await p.locator('#jsonEscapeError').isHidden(), true);

    await p.locator('#jsonEscapeInput').fill('</script>');
    await p.locator('#jsonEscapeSlashes').check();
    await p.locator('#escapeJsonString').click();
    value = await p.locator('#jsonEscapeOutput').inputValue();
    assert.equal(value[0], '<');
    assert.equal(value.charCodeAt(1), 92);
    assert.equal(value.slice(2), '/script>');

    await p.locator('#jsonEscapeInput').fill(value);
    await p.locator('#unescapeJsonString').click();
    assert.equal(await p.locator('#jsonEscapeOutput').inputValue(), '</script>');

    await p.locator('#jsonEscapeSlashes').uncheck();
    await p.locator('#jsonEscapeInput').fill('café 😀');
    await p.locator('#escapeJsonString').click();
    value = await p.locator('#jsonEscapeOutput').inputValue();
    assert.equal(value, 'café 😀');

    await p.locator('#jsonEscapeInput').fill('\\q');
    await p.locator('#unescapeJsonString').click();
    assert.equal(await p.locator('#jsonEscapeError').isHidden(), false);
  }],
  ['csv-to-json', async p => {
    await p.locator('#csvJsonInput').fill('name,role,active,score\n"Ada Lovelace","admin,owner",true,98.5\nLinus,developer,false,100');
    await p.locator('#convertCsvJson').click();
    let data = JSON.parse(await p.locator('#csvJsonOutput').inputValue());
    assert.equal(data[0].name, 'Ada Lovelace');
    assert.equal(data[0].role, 'admin,owner');
    assert.equal(data[0].active, 'true');
    await p.locator('#csvJsonTypes').check();
    data = JSON.parse(await p.locator('#csvJsonOutput').inputValue());
    assert.equal(data[0].active, true);
    assert.equal(data[0].score, 98.5);

    await p.locator('#csvJsonOutputFormat').selectOption('jsonl');
    const jsonLines = (await p.locator('#csvJsonOutput').inputValue()).trim().split(/\r?\n/);
    assert.equal(jsonLines.length, 2);
    assert.equal(JSON.parse(jsonLines[0]).name, 'Ada Lovelace');
    assert.equal(JSON.parse(jsonLines[0]).active, true);

    await p.locator('#csvJsonOutputFormat').selectOption('compact');
    const compact = await p.locator('#csvJsonOutput').inputValue();
    assert.equal(compact.includes('\n'), false);
    assert.equal(JSON.parse(compact).length, 2);

    await p.locator('#csvJsonOutputFormat').selectOption('pretty4');
    const pretty4 = await p.locator('#csvJsonOutput').inputValue();
    assert.match(pretty4, /\n {4}\{/);

    await p.locator('#csvJsonOutputFormat').selectOption('pretty2');
    await p.locator('#csvJsonHeader').uncheck();
    data = JSON.parse(await p.locator('#csvJsonOutput').inputValue());
    assert.ok(Array.isArray(data[0]));
    await p.locator('#csvJsonInput').fill('name,role\n"Ada,admin');
    await p.locator('#convertCsvJson').click();
    assert.equal(await p.locator('#csvJsonError').isHidden(), false);
  }],
  ['sql-formatter', async p => {
    await p.waitForFunction(() => document.getElementById('sqlStatus').textContent === 'Ready');
    await p.locator('#sqlInput').fill('select u.id,u.name from users u where u.active=true order by u.name;');
    await p.locator('#sqlDialect').selectOption('postgresql');
    await p.locator('#sqlKeywordCase').selectOption('upper');
    await p.locator('#formatSql').click();
    const sql = await p.locator('#sqlOutput').inputValue();
    assert.ok(sql.includes('SELECT'));
    assert.ok(sql.includes('FROM'));
    assert.ok(sql.includes('WHERE'));
    assert.ok(sql.includes('\n'));
    assert.equal(await p.locator('#sqlError').isHidden(), true);
  }],
  ['markdown-to-html', async p => {
    await p.waitForFunction(() => document.getElementById('markdownHtmlStatus').textContent === 'Ready');
    const source = '# Hello\n\n| A | B |\n| --- | --- |\n| one | two |\n\n<script>window.__mdXss = true</script>\n\n<img src="x" onerror="window.__mdXss=true">';
    await p.locator('#markdownInput').fill(source);
    await p.locator('#convertMarkdownHtml').click();

    let html = await p.locator('#markdownHtmlOutput').inputValue();
    assert.ok(html.includes('<h1>Hello</h1>'));
    assert.ok(html.includes('<table>'));
    assert.equal(html.includes('<script'), false);
    assert.equal(/onerror\s*=/.test(html), false);
    assert.match(await p.locator('#markdownHtmlStatus').innerText(), /sanitized/i);
    assert.equal(await p.locator('#markdownHtmlPreview').getAttribute('sandbox'), '');

    await p.locator('#markdownSanitize').uncheck();
    html = await p.locator('#markdownHtmlOutput').inputValue();
    assert.ok(html.includes('<script>window.__mdXss = true</script>'));
    assert.ok(/onerror\s*=/.test(html));
    assert.match(await p.locator('#markdownHtmlStatus').innerText(), /raw html/i);

    const frame = p.frameLocator('#markdownHtmlPreview');
    await frame.locator('body').waitFor();
    const executed = await frame.locator('body').evaluate(() => Boolean(window.__mdXss));
    assert.equal(executed, false);

    await p.locator('#markdownSanitize').check();
    html = await p.locator('#markdownHtmlOutput').inputValue();
    assert.equal(html.includes('<script'), false);
    assert.equal(/onerror\s*=/.test(html), false);
    assert.equal(await p.locator('#markdownHtmlError').isHidden(), true);
  }],
  ['html-to-markdown', async p => {
    await p.waitForFunction(() => document.getElementById('htmlMarkdownStatus').textContent === 'Ready');

    let probeRequests = 0;
    const requestListener = request => {
      if (request.url().includes('swu-probe.invalid')) probeRequests += 1;
    };
    p.on('request', requestListener);

    await p.locator('#htmlMarkdownInput').fill('<h1>Hello</h1><p>A <strong>bold</strong> paragraph with <a href="https://example.com/docs">docs</a> and <a href="javascript:alert(1)">unsafe</a>.</p><img src="https://swu-probe.invalid/pixel.png" alt="probe"><script>window.__htmlMdXss=true</script><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>one</td><td>two</td></tr></tbody></table><pre><code class="language-js">const fence = "\x60\x60\x60";\nconsole.log(fence);</code></pre>');
    await p.locator('#convertHtmlMarkdown').click();
    const markdown = await p.locator('#htmlMarkdownOutput').inputValue();

    assert.ok(markdown.includes('# Hello'));
    assert.ok(markdown.includes('**bold**'));
    assert.ok(markdown.includes('[docs](https://example.com/docs)'));
    assert.equal(markdown.includes('javascript:'), false);
    assert.ok(markdown.includes('![probe](https://swu-probe.invalid/pixel.png)'));
    assert.equal(markdown.includes('__htmlMdXss'), false);
    assert.ok(markdown.includes('| A'));
    assert.ok(markdown.includes('\x60\x60\x60\x60js'));
    assert.ok(markdown.includes('const fence = "\x60\x60\x60";'));

    await p.waitForTimeout(250);
    p.off('request', requestListener);
    assert.equal(probeRequests, 0);
    assert.equal(await p.locator('#htmlMarkdownError').isHidden(), true);
  }],
  ['html-minifier', async p => {
    await p.waitForFunction(() => window.__swuHtmlMinifierScriptLoaded === true || window.__swuHtmlMinifierScriptError === true, null, {timeout: 10000});
    await p.waitForFunction(() =>
      window.__swuHtmlMinifierEngineReady === true ||
      Boolean(window.__swuHtmlMinifierEngineError),
      null,
      {timeout: 25000}
    );

    const startup = await p.evaluate(() => ({
      loaded: window.__swuHtmlMinifierScriptLoaded === true,
      loadError: window.__swuHtmlMinifierScriptError === true,
      booted: window.__swuHtmlMinifierBooted === true,
      workerType: typeof Worker,
      engineReady: window.__swuHtmlMinifierEngineReady === true,
      engineProvider: window.__swuHtmlMinifierEngineProvider || '',
      engineError: window.__swuHtmlMinifierEngineError || '',
      status: document.getElementById('htmlMinifierStatus')?.textContent || ''
    }));

    assert.equal(startup.loaded, true);
    assert.equal(startup.loadError, false);
    assert.equal(startup.booted, true);
    assert.equal(startup.workerType, 'function');
    assert.equal(startup.engineReady, true, startup.engineError || 'HTML minifier engine did not become ready.');
    assert.ok(['jsdelivr', 'unpkg'].includes(startup.engineProvider));
    assert.equal(startup.engineError, '');
    assert.equal(startup.status, 'Ready');

    assert.equal(await p.locator('#minAttributeQuotes').isChecked(), false);

    const waitForHtmlMinifier = async () => {
      await p.waitForFunction(() => {
        const status = document.getElementById('htmlMinifierStatus')?.textContent || '';
        const error = document.getElementById('htmlMinifierError');
        return status === 'Minified' || (error && !error.hidden);
      }, null, {timeout: 15000});

      if (!await p.locator('#htmlMinifierError').isHidden()) {
        const message = await p.locator('#htmlMinifierError').innerText();
        throw new Error('HTML Minifier runtime error: ' + message);
      }
      assert.equal(await p.locator('#htmlMinifierStatus').innerText(), 'Minified');
    };

    // Exercise provider fallback deterministically without depending on the fallback CDN.
    await p.evaluate(() => {
      window.__swuNativeWorker = window.Worker;
      let primaryFailed = false;

      window.Worker = class TestWorker extends EventTarget {
        constructor(url) {
          super();
          this.url = String(url);
          this.terminated = false;

          setTimeout(() => {
            if (this.terminated) return;
            if (!primaryFailed && this.url.includes('engine=jsdelivr')) {
              primaryFailed = true;
              this.dispatchEvent(new ErrorEvent('error', {message:'synthetic primary provider failure'}));
              return;
            }

            this.dispatchEvent(new MessageEvent('message', {
              data:{type:'ready', provider:'unpkg'}
            }));
          }, 0);
        }

        terminate() {
          this.terminated = true;
        }

        postMessage(data) {
          if (this.terminated || data?.type !== 'minify') return;
          const result = String(data.source || '').replace(/>\s+</g, '><').trim();
          setTimeout(() => {
            if (this.terminated) return;
            this.dispatchEvent(new MessageEvent('message', {
              data:{
                type:'result',
                provider:'unpkg',
                requestId:data.requestId,
                result
              }
            }));
          }, 0);
        }
      };
    });

    await p.locator('#htmlMinifierInput').fill('<p>fallback</p>\n<p>provider</p>');
    await p.locator('#minifyHtml').click();
    await waitForHtmlMinifier();
    assert.equal(await p.locator('#htmlMinifierOutput').inputValue(), '<p>fallback</p><p>provider</p>');

    await p.evaluate(() => {
      window.Worker = window.__swuNativeWorker;
    });

    // Exercise the real production worker/minifier path with its normal provider order.
    const source = '<!doctype html>\n<html>\n  <body>\n    <!-- remove me -->\n    <main>\n      <h1>Hello</h1>\n      <p>World</p>\n    </main>\n  </body>\n</html>';
    await p.locator('#htmlMinifierInput').fill(source);
    await p.locator('#minifyHtml').click();
    await waitForHtmlMinifier();
    const minified = await p.locator('#htmlMinifierOutput').inputValue();
    assert.ok(minified.length < source.length);
    assert.ok(!minified.includes('remove me'));
    assert.ok(minified.includes('<h1>Hello</h1>'));

    const legacy = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html><head><style type="text/css">body { color: red; }</style><script type="text/javascript">console.log("x");</script></head><body><input disabled="disabled"></body></html>';
    await p.locator('#htmlMinifierInput').fill(legacy);
    await p.locator('#minHtml5Cleanup').check();
    await p.locator('#minifyHtml').click();
    await waitForHtmlMinifier();
    const html5 = await p.locator('#htmlMinifierOutput').inputValue();
    assert.match(html5, /^<!doctype html>/i);
    assert.ok(!html5.includes('type="text/css"'));
    assert.ok(!html5.includes('type="text/javascript"'));
    assert.ok(html5.includes(' disabled'));
    assert.ok(!html5.includes('disabled="disabled"'));

    await p.locator('#htmlMinifierInput').fill('<meta property="og:image" content="https://example.com/image.jpg">');
    await p.locator('#minAttributeQuotes').check();
    await p.locator('#minifyHtml').click();
    await waitForHtmlMinifier();
    const unquoted = await p.locator('#htmlMinifierOutput').inputValue();
    assert.ok(unquoted.includes('property=og:image'));
    assert.ok(unquoted.includes('content=https://example.com/image.jpg'));

    await p.locator('#htmlMinifierInput').evaluate(el => {
      el.value = '\t'.repeat(550000) + '.\t1x';
    });
    await p.locator('#minifyHtml').click();
    await p.waitForTimeout(75);
    await p.locator('#clearHtmlMinifier').click({timeout: 1500});
    assert.equal(await p.locator('#htmlMinifierInput').inputValue(), '');
    assert.equal(await p.locator('#htmlMinifierStatus').innerText(), 'Ready');

    assert.equal(await p.locator('#htmlMinifierError').isHidden(), true);

    await p.evaluate(() => {
      if (window.__swuNativeWorker) {
        window.Worker = window.__swuNativeWorker;
        delete window.__swuNativeWorker;
      }
    });
  }],
  ['jsonpath-tester', async p => {
    await p.waitForFunction(() => document.getElementById('jsonPathStatus').textContent === 'Ready');
    await p.locator('#jsonPathInput').fill(JSON.stringify({store:{book:[{title:'A'},{title:'B'}]}}));
    await p.locator('#jsonPathExpression').fill('$.store.book[*].title');
    await p.locator('#runJsonPath').click();
    let result = JSON.parse(await p.locator('#jsonPathOutput').inputValue());
    assert.equal(result.length, 2);
    assert.equal(result[0].path, "$['store']['book'][0]['title']");
    assert.equal(result[0].value, 'A');
    await p.locator('#jsonPathOutputMode').selectOption('paths');
    result = JSON.parse(await p.locator('#jsonPathOutput').inputValue());
    assert.equal(result[1], "$['store']['book'][1]['title']");
    await p.locator('#jsonPathExpression').fill('$[');
    await p.locator('#runJsonPath').click();
    assert.equal(await p.locator('#jsonPathError').isHidden(), false);
  }],
  ['css-minifier', async p => {
    await p.waitForFunction(() =>
      window.__swuCssMinifierEngineReady === true ||
      Boolean(window.__swuCssMinifierEngineError),
      null,
      {timeout: 25000}
    );

    const startup = await p.evaluate(() => ({
      booted: window.__swuCssMinifierBooted === true,
      engineReady: window.__swuCssMinifierEngineReady === true,
      engineProvider: window.__swuCssMinifierEngineProvider || '',
      engineError: window.__swuCssMinifierEngineError || '',
      status: document.getElementById('cssMinifierStatus')?.textContent || ''
    }));

    assert.equal(startup.booted, true);
    assert.equal(startup.engineReady, true, startup.engineError || 'CSS minifier engine did not become ready.');
    assert.ok(['jsdelivr', 'unpkg'].includes(startup.engineProvider));
    assert.equal(startup.engineError, '');
    assert.equal(startup.status, 'Ready');
    assert.equal(await p.locator('#cssPreserveComments').isChecked(), true);

    const source = '/*! Package license */\n/* remove this note */\n.card { color: #ff0000; margin: 0px 0px 0px 0px; padding: 16px 16px 16px 16px; }';
    await p.locator('#cssMinifierInput').fill(source);
    await p.locator('#minifyCss').click();
    await p.waitForFunction(() => document.getElementById('cssMinifierStatus').textContent === 'Minified');
    let minified = await p.locator('#cssMinifierOutput').inputValue();
    assert.ok(minified.length < source.length);
    assert.ok(minified.includes('/*! Package license */'));
    assert.equal(minified.includes('remove this note'), false);
    assert.ok(minified.includes('.card{'));
    assert.ok(minified.includes('color:red'));
    assert.equal(await p.locator('#cssMinifierError').isHidden(), true);

    await p.locator('#cssPreserveComments').uncheck();
    minified = await p.locator('#cssMinifierOutput').inputValue();
    assert.equal(minified.includes('Package license'), false);
    assert.match(await p.locator('#cssMinifierStats').innerText(), /Remove all\s+comments/i);

    await p.locator('#cssRestructure').check();
    await p.locator('#minifyCss').click();
    const restructured = await p.locator('#cssMinifierOutput').inputValue();
    assert.ok(restructured.length > 0);
    assert.equal(await p.locator('#cssMinifierError').isHidden(), true);

    await p.locator('#clearCssMinifier').click();
    assert.equal(await p.locator('#cssPreserveComments').isChecked(), true);
    assert.equal(await p.locator('#cssRestructure').isChecked(), false);
  }],
  ['json-to-xml', async p => {
    await p.locator('#converterInput').fill(JSON.stringify({store:{book:[{title:'A'},{title:'B'}]},'first name':'Ada',active:true,note:null}));
    await p.locator('#convertBtn').click();
    let xml = await p.locator('#converterOutput').inputValue();
    assert.ok(xml.includes('<root>'));
    assert.ok(xml.includes('<book>'));
    assert.ok(xml.includes('<title>A</title>'));
    assert.ok(xml.includes('<property name="first name">Ada</property>'));
    assert.ok(xml.includes('<note />'));
    assert.equal(await p.locator('#converterError').isHidden(), true);
    await p.locator('#converterInput').fill('[1,2]');
    await p.locator('#jsonXmlRoot').fill('records');
    await p.locator('#jsonXmlItem').fill('row');
    await p.locator('#convertBtn').click();
    xml = await p.locator('#converterOutput').inputValue();
    assert.ok(xml.includes('<records>'));
    assert.ok(xml.includes('<row>1</row>'));
    await p.locator('#jsonXmlRoot').fill('123bad');
    await p.locator('#convertBtn').click();
    assert.equal(await p.locator('#converterError').isHidden(), false);
  }],
  ['csv-to-xml', async p => {
    const csv = 'name,role,first name\n"Ada Lovelace","admin,owner",Ada\nLinus,developer,Linus';
    await p.locator('#csvXmlInput').fill(csv);
    await p.locator('#convertCsvXml').click();
    let xml = await p.locator('#csvXmlOutput').inputValue();
    assert.ok(xml.includes('<rows>'));
    assert.ok(xml.includes('<role>admin,owner</role>'));
    assert.ok(xml.includes('<field name="first name">Ada</field>'));
    assert.equal(await p.locator('#csvXmlError').isHidden(), true);

    await p.locator('#csvXmlHeader').uncheck();
    await p.locator('#csvXmlInput').fill('a,b\n1,2');
    await p.locator('#convertCsvXml').click();
    xml = await p.locator('#csvXmlOutput').inputValue();
    assert.ok(xml.includes('<column index="1">a</column>'));
    assert.ok(xml.includes('<column index="2">2</column>'));

    await p.locator('#csvXmlRoot').fill('123bad');
    await p.locator('#convertCsvXml').click();
    assert.equal(await p.locator('#csvXmlError').isHidden(), false);
  }],
  ['html-to-json', async p => {
    const html = '<main id="app"><h1>Hello <em>world</em></h1><p data-x="1">Text</p><script>window.__htmlJsonExecuted=1</script></main>';
    await p.locator('#htmlJsonInput').fill(html);
    await p.locator('#convertHtmlJson').click();
    let tree = JSON.parse(await p.locator('#htmlJsonOutput').inputValue());
    assert.equal(tree.tag, 'html');
    const asText = JSON.stringify(tree);
    assert.ok(asText.includes('"tag":"main"') || asText.includes('"tag": "main"'));
    assert.ok(asText.includes('"id":"app"') || asText.includes('"id": "app"'));
    assert.equal(await p.evaluate(() => window.__htmlJsonExecuted), undefined);
    assert.equal(await p.locator('#htmlJsonError').isHidden(), true);

    await p.locator('#htmlJsonMode').selectOption('tables');
    await p.locator('#htmlJsonInput').fill('<table><tr><th>Name</th><th>Role</th></tr><tr><td>Ada</td><td>Admin</td></tr><tr><td>Linus</td><td>Developer</td></tr></table>');
    await p.locator('#convertHtmlJson').click();
    const tables = JSON.parse(await p.locator('#htmlJsonOutput').inputValue());
    assert.equal(tables.length, 1);
    assert.equal(tables[0].rows[0].Name, 'Ada');
    assert.equal(tables[0].rows[1].Role, 'Developer');
  }],
  ['json-to-html', async p => {
    await p.locator('#jsonHtmlInput').fill(JSON.stringify([
      {name:'Ada',role:'Admin',payload:'<script>window.__jsonHtmlExecuted=1</script>'},
      {name:'Linus',role:'Developer',active:true}
    ]));
    await p.locator('#convertJsonHtml').click();
    let html = await p.locator('#jsonHtmlOutput').inputValue();
    assert.ok(html.includes('<table>'));
    assert.ok(html.includes('<th>name</th>'));
    assert.ok(html.includes('&lt;script&gt;window.__jsonHtmlExecuted=1&lt;/script&gt;'));
    assert.ok(!html.includes('<script>window.__jsonHtmlExecuted=1</script>'));
    assert.equal(await p.locator('#jsonHtmlPreview').getAttribute('sandbox'), '');
    assert.equal(await p.evaluate(() => window.__jsonHtmlExecuted), undefined);
    assert.equal(await p.locator('#jsonHtmlError').isHidden(), true);

    await p.locator('#jsonHtmlMode').selectOption('nested');
    await p.locator('#jsonHtmlInput').fill(JSON.stringify({user:{name:'Ada'},roles:['admin','editor']}));
    await p.locator('#convertJsonHtml').click();
    html = await p.locator('#jsonHtmlOutput').inputValue();
    assert.ok(html.includes('<dl>'));
    assert.ok(html.includes('<ol>'));
    assert.ok(html.includes('<dt>user</dt>'));
  }],
  ['uuid-validator', async p => {
    const values = [
      '550e8400-e29b-41d4-a716-446655440000',
      '01890f4e-7c88-7abc-8def-0123456789ab',
      '00000000-0000-0000-0000-000000000000',
      '{550E8400-E29B-41D4-A716-446655440000}',
      '(550E8400-E29B-41D4-A716-446655440000)',
      '550e8400-e29b-41d4-c716-446655440000',
      'not-a-uuid'
    ].join('\n');
    await p.locator('#uuidValidatorInput').fill(values);
    await p.locator('#validateUuid').click();

    const normalized = (await p.locator('#uuidValidatorOutput').inputValue()).split('\n').filter(Boolean);
    assert.equal(normalized.length, 5);
    assert.ok(normalized.includes('550e8400-e29b-41d4-a716-446655440000'));
    assert.ok(normalized.includes('00000000-0000-0000-0000-000000000000'));

    const rows = p.locator('#uuidValidatorTable tbody tr');
    assert.equal(await rows.count(), 7);
    assert.equal(await rows.nth(0).getAttribute('data-valid'), 'true');
    assert.equal(await rows.nth(4).getAttribute('data-valid'), 'true');
    assert.ok((await rows.nth(4).innerText()).includes('550e8400-e29b-41d4-a716-446655440000'));
    assert.equal(await rows.nth(5).getAttribute('data-format-valid'), 'true');
    assert.equal(await rows.nth(5).getAttribute('data-valid'), 'false');
    assert.equal(await rows.nth(6).getAttribute('data-format-valid'), 'false');
    assert.ok((await rows.nth(1).innerText()).includes('v7 time:'));

    await p.locator('#uuidAcceptWrappers').uncheck();
    assert.equal(await p.locator('#uuidValidatorTable tbody tr').nth(3).getAttribute('data-format-valid'), 'false');
    assert.equal(await p.locator('#uuidValidatorTable tbody tr').nth(4).getAttribute('data-format-valid'), 'false');
    assert.equal(await p.locator('#uuidValidatorError').isHidden(), true);
  }],
  ['xml-escape-unescape', async p => {
    await p.locator('#xmlEscapeInput').fill('Tom & Jerry < 5 > 3 "quoted" \'single\'');
    await p.locator('#xmlEscapeContext').selectOption('text');
    await p.locator('#runXmlEscape').click();
    let result = await p.locator('#xmlEscapeOutput').inputValue();
    assert.equal(result, 'Tom &amp; Jerry &lt; 5 &gt; 3 "quoted" \'single\'');

    await p.locator('#xmlEscapeContext').selectOption('double');
    result = await p.locator('#xmlEscapeOutput').inputValue();
    assert.ok(result.includes('&quot;quoted&quot;'));
    assert.ok(result.includes("'single'"));

    await p.evaluate(() => {
      const input = document.getElementById('xmlEscapeInput');
      input.value = 'safe' + String.fromCharCode(0) + 'unsafe';
    });
    await p.locator('#runXmlEscape').click();
    assert.equal(await p.locator('#xmlEscapeOutput').inputValue(), '');
    assert.equal(await p.locator('#xmlEscapeError').isHidden(), false);
    const invalidMessage = await p.locator('#xmlEscapeError').innerText();
    assert.ok(invalidMessage.includes('XML 1.0'));
    assert.ok(invalidMessage.includes('U+0000'));

    await p.locator('#xmlEscapeMode').selectOption('unescape');
    await p.locator('#xmlEscapeInput').fill('&lt;tag&gt;Tom &amp; Jerry&#33; &#x1F600; &nbsp; &#0;');
    await p.locator('#runXmlEscape').click();
    result = await p.locator('#xmlEscapeOutput').inputValue();
    assert.ok(result.includes('<tag>Tom & Jerry! 😀 &nbsp; &#0;'));
    assert.ok((await p.locator('#xmlEscapeWarnings').innerText()).includes('unknown named entity preserved'));
    assert.ok((await p.locator('#xmlEscapeWarnings').innerText()).includes('invalid numeric reference preserved'));

    await p.locator('#xmlEscapeInput').fill('&amp;lt;');
    await p.locator('#runXmlEscape').click();
    assert.equal(await p.locator('#xmlEscapeOutput').inputValue(), '&lt;');
    assert.equal(await p.locator('#xmlEscapeError').isHidden(), true);
  }],
  ['regex-escaper', async p => {
    await p.locator('#regexEscapeInput').fill('foo.bar-baz');
    await p.locator('#escapeRegex').click();
    let escaped = await p.locator('#regexEscapeOutput').inputValue();
    assert.equal(escaped, '\\x66oo\\.bar\\x2dbaz');
    const matchesLiteral = await p.evaluate(({pattern, value}) => new RegExp(pattern).test(value), {pattern: escaped, value: 'foo.bar-baz'});
    assert.equal(matchesLiteral, true);

    await p.locator('#regexEscapeFormat').selectOption('constructor');
    await p.locator('#regexEscapeFlags').fill('i');
    await p.locator('#escapeRegex').click();
    let rendered = await p.locator('#regexEscapeOutput').inputValue();
    assert.ok(rendered.startsWith('new RegExp('));
    assert.ok(rendered.endsWith(', "i")'));

    await p.locator('#regexEscapeFormat').selectOption('literal');
    await p.locator('#regexEscapeFlags').fill('u');
    await p.locator('#escapeRegex').click();
    rendered = await p.locator('#regexEscapeOutput').inputValue();
    assert.ok(rendered.startsWith('/'));
    assert.ok(rendered.endsWith('/u'));

    await p.locator('#regexEscapeInput').fill('1abc');
    await p.locator('#regexEscapeFormat').selectOption('pattern');
    await p.locator('#escapeRegex').click();
    assert.equal(await p.locator('#regexEscapeOutput').inputValue(), '\\x31abc');

    await p.locator('#regexEscapeFormat').selectOption('constructor');
    await p.locator('#regexEscapeFlags').fill('gg');
    await p.locator('#escapeRegex').click();
    assert.equal(await p.locator('#regexEscapeError').isHidden(), false);
  }],
  ['json-diff', async p => {
    await p.locator('#jsonDiffLeft').fill('{"port":8080,"enabled":false}');
    await p.locator('#jsonDiffRight').fill('{"port":8443,"enabled":true,"region":"us"}');
    await p.locator('#compareJson').click();
    let text = await p.locator('#jsonDiffResult').innerText();
    assert.ok(text.includes('$.port'));
    assert.ok(text.includes('$.region'));
    assert.equal(await p.locator('#downloadJsonDiff').isDisabled(), false);

    await p.locator('#jsonDiffLeftFile').setInputFiles({
      name: 'left.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"service":{"port":8080},"regions":["us","eu"]}')
    });
    await p.locator('#jsonDiffRightFile').setInputFiles({
      name: 'right.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"service":{"port":8443},"regions":["eu","us"],"enabled":true}')
    });
    await p.waitForFunction(() => document.getElementById('jsonDiffResult')?.textContent.includes('$.service.port'));
    text = await p.locator('#jsonDiffResult').innerText();
    assert.ok(text.includes('$.service.port'));
    assert.ok(text.includes('$.enabled'));

    await p.locator('#jsonDiffIgnoreOrder').check();
    text = await p.locator('#jsonDiffResult').innerText();
    assert.ok(text.includes('$.service.port'));
    assert.equal(text.includes('$.regions'), false);

    await p.locator('#swapJsonDiff').click();
    text = await p.locator('#jsonDiffResult').innerText();
    assert.equal(await p.locator('#jsonDiffResult tr[data-kind="removed"]').count(), 1);

    const downloadPromise = p.waitForEvent('download');
    await p.locator('#downloadJsonDiff').click();
    const reportDownload = await downloadPromise;
    assert.equal(reportDownload.suggestedFilename(), 'json-diff-report.json');
    const reportPath = await reportDownload.path();
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    assert.equal(report.format, 'smartwebutility-json-diff-report');
    assert.equal(report.version, 1);
    assert.equal(report.ignoreArrayOrder, true);
    assert.ok(report.summary.differences >= 2);
    assert.ok(report.differences.some(row => row.path === '$.service.port' && row.status === 'changed'));
    assert.ok(report.differences.some(row => row.path === '$.enabled' && row.status === 'removed'));
  }],
  ['base64-encoder-decoder', async p => {
    await p.locator('#base64Input').fill('hello');
    await p.locator('#runBase64').click();
    assert.equal((await p.locator('#base64Output').inputValue()).trim(), 'aGVsbG8=');

    await p.locator('#base64File').setInputFiles({
      name: 'sample.bin',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from([0xfb, 0xff])
    });
    await p.waitForFunction(() => document.getElementById('base64Output').value === '+/8=');
    assert.equal((await p.locator('#base64Output').inputValue()).trim(), '+/8=');

    await p.locator('#urlSafe').check();
    await p.waitForFunction(() => document.getElementById('base64Output').value === '-_8');
    assert.equal((await p.locator('#base64Output').inputValue()).trim(), '-_8');
  }],
  ['unix-timestamp-converter', async p => {
    await p.locator('#unixInput').fill('1767225600');
    await p.locator('#convertUnix').click();
    let dateText = await p.locator('#dateResult').innerText();
    assert.ok(dateText.includes('2026-01-01T00:00:00.000Z'));
    assert.ok(dateText.includes('1767225600000000000'));

    await p.locator('#unixUnit').selectOption('microseconds');
    await p.locator('#unixInput').fill('1767225600123456');
    await p.locator('#convertUnix').click();
    dateText = await p.locator('#dateResult').innerText();
    assert.ok(dateText.includes('2026-01-01T00:00:00.123Z'));
    assert.ok(dateText.includes('1767225600123456'));
    assert.equal(await p.locator('#timestampStatus').innerText(), 'Converted from microseconds');

    await p.locator('#unixUnit').selectOption('nanoseconds');
    await p.locator('#unixInput').fill('1767225600123456789');
    await p.locator('#convertUnix').click();
    dateText = await p.locator('#dateResult').innerText();
    assert.ok(dateText.includes('2026-01-01T00:00:00.123Z'));
    assert.ok(dateText.includes('1767225600123456789'));

    await p.locator('#unixInput').fill('-1');
    await p.locator('#convertUnix').click();
    dateText = await p.locator('#dateResult').innerText();
    assert.ok(dateText.includes('1969-12-31T23:59:59.999Z'));
    assert.ok(dateText.includes('-1'));

    await p.locator('#unixUnit').selectOption('auto');
    await p.locator('#unixInput').fill('1767225600123456');
    await p.locator('#convertUnix').click();
    assert.equal(await p.locator('#timestampStatus').innerText(), 'Converted from microseconds');

    await p.locator('#dateTimeZone').selectOption('utc');
    await p.locator('#dateInput').fill('2026-01-01T00:00');
    await p.locator('#convertDate').click();
    const unixText = await p.locator('#unixResult').innerText();
    assert.ok(unixText.includes('1767225600'));
    assert.ok(unixText.includes('1767225600000000000'));
    assert.equal(await p.locator('#timestampStatus').innerText(), 'UTC date converted');
  }],
  ['uuid-generator', async p => {
    await p.locator('#uuidCount').fill('3');
    await p.locator('#uuidVersion').selectOption('4');
    await p.locator('#uuidFormat').selectOption('canonical');
    await p.locator('#generateUuid').click();
    let values = (await p.locator('#uuidOutput').inputValue()).trim().split(/\r?\n/);
    assert.equal(values.length, 3);
    values.forEach(value => assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));

    await p.locator('#uuidFormat').selectOption('braces');
    let braced = (await p.locator('#uuidOutput').inputValue()).trim().split(/\r?\n/)[0];
    assert.match(braced, /^\{[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}$/);

    const fixedV7Ms = 1767225600123;
    await p.evaluate(ms => {
      window.__uuidOriginalDateNow = Date.now;
      Date.now = () => ms;
    }, fixedV7Ms);
    await p.locator('#uuidCount').fill('100');
    await p.locator('#uuidVersion').selectOption('7');
    await p.locator('#uuidFormat').selectOption('canonical');
    await p.locator('#generateUuid').click();
    values = (await p.locator('#uuidOutput').inputValue()).trim().split(/\r?\n/);
    assert.equal(values.length, 100);
    values.forEach(value => assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
    assert.equal(new Set(values).size, values.length);
    assert.deepEqual(values, [...values].sort());
    const timestamps = new Set(values.map(value => parseInt(value.replace(/-/g, '').slice(0, 12), 16)));
    assert.deepEqual([...timestamps], [fixedV7Ms]);

    await p.locator('#uuidFormat').selectOption('urn');
    await p.locator('#uuidUppercase').check();
    const urn = (await p.locator('#uuidOutput').inputValue()).trim().split(/\r?\n/)[0];
    assert.match(urn, /^urn:uuid:[0-9A-F]{8}-[0-9A-F]{4}-7[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
    await p.evaluate(() => {
      Date.now = window.__uuidOriginalDateNow;
      delete window.__uuidOriginalDateNow;
    });

    await p.locator('#uuidVersion').selectOption('4');
    await p.locator('#uuidUppercase').uncheck();
    await p.locator('#uuidFormat').selectOption('parentheses');
    await p.locator('#uuidListFormat').selectOption('json');
    await p.locator('#uuidCount').fill('2');
    await p.locator('#generateUuid').click();
    const jsonValues = JSON.parse(await p.locator('#uuidOutput').inputValue());
    assert.equal(jsonValues.length, 2);
    jsonValues.forEach(value => assert.match(value, /^\([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\)$/));
    assert.equal(await p.locator('#uuidError').isHidden(), true);

    await p.locator('#uuidListFormat').selectOption('lines');
    await p.locator('#uuidFormat').selectOption('canonical');
    await p.locator('#uuidUppercase').uncheck();
    await p.locator('#uuidNil').click();
    assert.equal((await p.locator('#uuidOutput').inputValue()).trim(), '00000000-0000-0000-0000-000000000000');
    await p.locator('#uuidMax').click();
    assert.equal((await p.locator('#uuidOutput').inputValue()).trim(), 'ffffffff-ffff-ffff-ffff-ffffffffffff');
    assert.match(await p.locator('#uuidOutputTitle').innerText(), /Max UUID/);
  }],
  ['chmod-calculator', async p => {
    await p.locator('#chmodOctal').fill('644');
    assert.equal(await p.locator('#chmodSymbolic').inputValue(), 'rw-r--r--');
    assert.equal(await p.locator('#chmodOctalResult').innerText(), '644');

    await p.locator('#chmodSymbolic').fill('rwxr-xr-x');
    assert.equal(await p.locator('#chmodOctal').inputValue(), '755');

    await p.locator('#chmodSymbolic').fill('-rwsr-xr-x');
    assert.equal(await p.locator('#chmodOctal').inputValue(), '4755');
    assert.equal(await p.locator('#chmodSymbolic').inputValue(), 'rwsr-xr-x');
    assert.equal(await p.locator('#chmodSpecialResult').innerText(), 'setuid');

    await p.locator('#chmodSymbolic').fill('drwxrwxrwt');
    assert.equal(await p.locator('#chmodOctal').inputValue(), '1777');
    assert.equal(await p.locator('#chmodSymbolic').inputValue(), 'rwxrwxrwt');
    assert.equal(await p.locator('#chmodSpecialResult').innerText(), 'sticky');

    await p.locator('[data-mode="1777"]').click();
    assert.equal(await p.locator('#chmodOctal').inputValue(), '1777');
    assert.equal(await p.locator('#chmodSymbolic').inputValue(), 'rwxrwxrwt');

    await p.locator('#chmodTarget').fill('/srv/app');
    await p.locator('#chmodRecursive').check();
    assert.equal((await p.locator('#chmodCommand').innerText()).trim(), 'chmod -R 1777 /srv/app');
    assert.equal((await p.locator('#chmodSymbolicCommand').innerText()).trim(), 'chmod -R u=rwx,g=rwx,o=rwxt /srv/app');

    await p.locator('#chmodSymbolic').fill('-rwSr-xr-x');
    assert.equal(await p.locator('#chmodOctal').inputValue(), '4655');
    assert.equal((await p.locator('#chmodSymbolicCommand').innerText()).trim(), 'chmod -R u=rws,g=rx,o=rx /srv/app');

    await p.locator('#umaskValue').fill('027');
    assert.equal(await p.locator('#umaskFileResult').innerText(), '640');
    assert.equal(await p.locator('#umaskDirResult').innerText(), '750');
    assert.equal(await p.locator('#chmodError').isHidden(), true);
  }],
  ['ulid-generator', async p => {
    await p.locator('#ulidCount').fill('3');
    await p.locator('#ulidCustomTime').check();
    await p.locator('#ulidTimestamp').fill('2026-01-02T03:04:05.006');
    await p.locator('#ulidMonotonic').check();
    await p.locator('#generateUlid').click();

    const values = (await p.locator('#ulidOutput').inputValue()).trim().split(/\r?\n/);
    assert.equal(values.length, 3);
    values.forEach(value => assert.match(value, /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/));
    assert.deepEqual(values, [...values].sort());
    assert.equal(new Set(values.map(value => value.slice(0, 10))).size, 1);

    const rows = p.locator('#ulidTable tbody tr');
    assert.equal(await rows.count(), 3);
    const expectedMs = await p.locator('#ulidTimestamp').evaluate(el => new Date(el.value).getTime());
    const firstMsText = await rows.nth(0).locator('td').nth(1).innerText();
    const decodedMs = Number(firstMsText.replace(/,/g, ''));
    assert.equal(decodedMs, expectedMs);

    await p.locator('#useFirstUlid').click();
    assert.equal(await p.locator('#ulidInspectError').isHidden(), true);
    assert.equal((await p.locator('#ulidInspectNormalized').innerText()).trim(), values[0]);
    assert.equal(Number((await p.locator('#ulidInspectTimestampMs').innerText()).replace(/,/g, '')), expectedMs);
    assert.equal((await p.locator('#ulidInspectRandomBase32').innerText()).trim().length, 16);
    assert.match((await p.locator('#ulidInspectRandomHex').innerText()).trim(), /^[0-9A-F]{20}$/);

    await p.locator('#ulidInspectInput').fill(values[0].toLowerCase());
    await p.locator('#inspectUlid').click();
    assert.equal((await p.locator('#ulidInspectNormalized').innerText()).trim(), values[0]);

    await p.locator('#ulidInspectInput').fill('8' + '0'.repeat(25));
    await p.locator('#inspectUlid').click();
    assert.equal(await p.locator('#ulidInspectError').isHidden(), false);
    assert.equal(await p.locator('#ulidError').isHidden(), true);

    await p.locator('#clearUlid').click();
    const rollbackStartMs = 1767225600123;
    await p.evaluate(start => {
      window.__ulidOriginalDateNow = Date.now;
      const sequence = [start, start, start - 123];
      let index = 0;
      Date.now = () => sequence[Math.min(index++, sequence.length - 1)];
    }, rollbackStartMs);

    await p.locator('#ulidCount').fill('3');
    await p.locator('#generateUlid').click();
    const rollbackValues = (await p.locator('#ulidOutput').inputValue()).trim().split(/\r?\n/);
    assert.equal(rollbackValues.length, 3);
    assert.equal(new Set(rollbackValues).size, 3);
    assert.deepEqual(rollbackValues, [...rollbackValues].sort());
    assert.equal(new Set(rollbackValues.map(value => value.slice(0, 10))).size, 1);

    const rollbackRows = p.locator('#ulidTable tbody tr');
    assert.equal(await rollbackRows.count(), 3);
    for (let index = 0; index < 3; index += 1) {
      const text = await rollbackRows.nth(index).locator('td').nth(1).innerText();
      assert.equal(Number(text.replace(/,/g, '')), rollbackStartMs);
    }

    await p.evaluate(() => {
      Date.now = window.__ulidOriginalDateNow;
      delete window.__ulidOriginalDateNow;
    });
  }],
  ['random-port-generator', async p => {
    await p.locator('#portRangePreset').selectOption('dynamic');
    await p.locator('#portCount').fill('20');
    await p.locator('#portUnique').check();
    await p.locator('#portSort').check();
    await p.locator('#generatePorts').click();

    let values = (await p.locator('#portOutput').inputValue()).trim().split(/\r?\n/).map(Number);
    assert.equal(values.length, 20);
    assert.equal(new Set(values).size, 20);
    values.forEach(value => assert.ok(value >= 49152 && value <= 65535));
    assert.deepEqual(values, [...values].sort((a,b) => a-b));
    assert.equal(await p.locator('#portError').isHidden(), true);

    await p.locator('#portRangePreset').selectOption('custom');
    await p.locator('#portMin').fill('5000');
    await p.locator('#portMax').fill('5002');
    await p.locator('#portCount').fill('4');
    await p.locator('#portUnique').check();
    await p.locator('#generatePorts').click();
    assert.equal(await p.locator('#portError').isHidden(), false);
  }],
  ['mac-address-generator', async p => {
    await p.locator('#macCount').fill('25');
    await p.locator('#macFormat').selectOption('colon');
    await p.locator('#macListFormat').selectOption('lines');
    await p.locator('#macUppercase').check();
    await p.locator('#generateMac').click();

    let values = (await p.locator('#macOutput').inputValue()).trim().split(/\r?\n/);
    assert.equal(values.length, 25);
    assert.equal(new Set(values).size, 25);
    values.forEach(value => {
      assert.match(value, /^[0-9A-F]{2}(?::[0-9A-F]{2}){5}$/);
      const first = parseInt(value.slice(0,2), 16);
      assert.equal(first & 1, 0);
      assert.equal(first & 2, 2);
    });
    const canonical = values.map(value => value.replace(/:/g, '').toLowerCase());

    await p.locator('#macFormat').selectOption('cisco');
    await p.locator('#macUppercase').uncheck();
    values = (await p.locator('#macOutput').inputValue()).trim().split(/\r?\n/);
    values.forEach(value => assert.match(value, /^[0-9a-f]{4}(?:\.[0-9a-f]{4}){2}$/));
    assert.deepEqual(values.map(value => value.replace(/\./g, '')), canonical);

    await p.locator('#macListFormat').selectOption('json');
    const jsonValues = JSON.parse(await p.locator('#macOutput').inputValue());
    assert.equal(jsonValues.length, 25);

    await p.locator('#macListFormat').selectOption('csv');
    const csv = await p.locator('#macOutput').inputValue();
    assert.match(csv, /^mac_address\n/);
    assert.equal(csv.trim().split(/\r?\n/).length, 26);

    await p.locator('#macListFormat').selectOption('lines');
    await p.locator('#macFormat').selectOption('colon');
    await p.locator('#macUppercase').check();
    await p.locator('#macCount').fill('10');

    await p.locator('#macAdministration').selectOption('universal');
    await p.locator('#macTransmission').selectOption('unicast');
    await p.locator('#generateMac').click();
    values = (await p.locator('#macOutput').inputValue()).trim().split(/\r?\n/);
    values.forEach(value => {
      const first = parseInt(value.slice(0,2), 16);
      assert.equal(first & 1, 0);
      assert.equal(first & 2, 0);
    });

    await p.locator('#macAdministration').selectOption('local');
    await p.locator('#macTransmission').selectOption('multicast');
    await p.locator('#generateMac').click();
    values = (await p.locator('#macOutput').inputValue()).trim().split(/\r?\n/);
    values.forEach(value => {
      const first = parseInt(value.slice(0,2), 16);
      assert.equal(first & 1, 1);
      assert.equal(first & 2, 2);
    });

    await p.locator('#macAdministration').selectOption('universal');
    await p.locator('#macTransmission').selectOption('multicast');
    await p.locator('#generateMac').click();
    values = (await p.locator('#macOutput').inputValue()).trim().split(/\r?\n/);
    values.forEach(value => {
      const first = parseInt(value.slice(0,2), 16);
      assert.equal(first & 1, 1);
      assert.equal(first & 2, 0);
    });

    assert.equal(await p.locator('#macError').isHidden(), true);
  }],
  ['hash-generator', async p => {
    const helloSha256 = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

    await p.locator('#hashInput').fill('hello');
    await p.locator('#expectedHash').fill(helloSha256);
    await p.locator('#generateHash').click();
    await p.waitForFunction(() => document.getElementById('hashOutput').value.trim().length === 64);
    assert.equal(await p.locator('#hashOutput').inputValue(), helloSha256);
    assert.match(await p.locator('#hashVerifyStatus').innerText(), /matches/i);

    await p.locator('#expectedHash').fill('0'.repeat(64));
    assert.match(await p.locator('#hashVerifyStatus').innerText(), /does not match/i);

    await p.locator('#expectedHash').fill(helloSha256.toUpperCase() + '  hello.txt');
    assert.match(await p.locator('#hashVerifyStatus').innerText(), /matches/i);

    await p.locator('#hashFile').setInputFiles({
      name: 'hello.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello')
    });
    await p.waitForFunction(() => document.getElementById('hashStatus')?.textContent.includes('hello.txt'));
    assert.equal(await p.locator('#hashOutput').inputValue(), helloSha256);
    assert.match(await p.locator('#hashVerifyStatus').innerText(), /matches/i);
  }],
  ['jwt-decoder', async p => {
    await p.locator('#exampleJwt').click();
    assert.ok((await p.locator('#jwtHeader').inputValue()).includes('alg'));
    assert.ok((await p.locator('#jwtPayload').inputValue()).includes('"exp"'));
    assert.equal(await p.locator('#jwtSignature').inputValue(), 'signature-not-verified');
    assert.match(await p.locator('#jwtTimeStatus').innerText(), /Not expired by exp/i);

    const expiredToken = await p.evaluate(() => {
      const encode = value => btoa(JSON.stringify(value))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
      const now = Math.floor(Date.now() / 1000);
      return [
        encode({alg:'HS256',typ:'JWT',kid:'test-key'}),
        encode({sub:'user-1',iat:now-3600,nbf:now-3600,exp:now-60}),
        'test-signature'
      ].join('.');
    });

    await p.locator('#jwtInput').fill('Bearer ' + expiredToken);
    await p.locator('#decodeJwt').click();
    assert.equal(await p.locator('#jwtError').isHidden(), true);
    assert.match(await p.locator('#jwtStatus').innerText(), /Bearer prefix removed/i);
    assert.equal(await p.locator('#jwtSignature').inputValue(), 'test-signature');
    assert.match(await p.locator('#jwtTimeStatus').innerText(), /Expired by exp/i);

    await p.locator('#jwtInput').fill('one.two');
    await p.locator('#decodeJwt').click();
    assert.equal(await p.locator('#jwtError').isHidden(), false);
    assert.match(await p.locator('#jwtError').innerText(), /three dot-separated parts/i);
  }],
  ['regex-tester', async p => {
    await p.locator('#regexPattern').fill('(?<digits>\\d+)');
    await p.locator('#regexFlags').fill('gd');
    await p.locator('#regexInput').fill('A12 B34');
    await p.locator('#regexReplace').fill('[$<digits>]');
    await p.locator('#runRegex').click();

    let matchesText = await p.locator('#regexMatches').innerText();
    assert.ok(matchesText.includes('12'));
    assert.ok(matchesText.includes('1 → 3'));
    assert.ok(matchesText.includes('Named: {"digits":"12"}'));
    assert.equal(await p.locator('#regexHighlighted mark').count(), 2);
    assert.equal(await p.locator('#regexOutput').inputValue(), 'A[12] B[34]');

    await p.locator('#regexPattern').fill('(?=a)');
    await p.locator('#regexFlags').fill('g');
    await p.locator('#regexInput').fill('aa');
    await p.locator('#regexReplace').fill('');
    await p.locator('#runRegex').click();
    matchesText = await p.locator('#regexMatches').innerText();
    assert.ok(matchesText.includes('0 → 0'));
    assert.equal(await p.locator('#regexHighlighted mark').count(), 2);
    assert.equal(await p.locator('#regexHighlighted').textContent(), '↧a↧a');
    assert.equal(await p.locator('#regexStatus').innerText(), '2 matches');

    await p.locator('#regexPattern').fill('a');
    await p.locator('#regexInput').fill('a'.repeat(501));
    await p.locator('#runRegex').click();
    assert.equal(await p.locator('#regexStatus').innerText(), '500+ matches · display capped');
    assert.equal(await p.locator('#regexMatches tbody tr').count(), 500);
  }],
  ['url-encoder-decoder', async p => {
    await p.locator('#urlInput').fill('hello world');
    await p.locator('#runUrlCodec').click();
    assert.equal((await p.locator('#urlOutput').inputValue()).trim(), 'hello%20world');
    assert.equal(await p.locator('#urlStatus').innerText(), 'Encoded · component');

    await p.locator('#urlFormEncoding').check();
    assert.equal((await p.locator('#urlOutput').inputValue()).trim(), 'hello+world');
    assert.equal(await p.locator('#urlStatus').innerText(), 'Encoded · form value');

    await p.locator('#urlInput').fill('a+b c');
    await p.locator('#runUrlCodec').click();
    assert.equal(await p.locator('#urlOutput').inputValue(), 'a%2Bb+c');

    await p.locator('#urlMode').selectOption('decode');
    await p.locator('#urlInput').fill('a%2Bb+c');
    await p.locator('#runUrlCodec').click();
    assert.equal(await p.locator('#urlOutput').inputValue(), 'a+b c');

    await p.locator('#urlComponent').uncheck();
    await p.locator('#urlMode').selectOption('encode');
    await p.locator('#urlInput').fill('https://example.com/a b?q=x y');
    await p.locator('#runUrlCodec').click();
    assert.equal(await p.locator('#urlOutput').inputValue(), 'https://example.com/a%20b?q=x%20y');
    assert.equal(await p.locator('#urlFormEncoding').isDisabled(), true);

    await p.locator('#urlComponent').check();
    await p.locator('#urlMode').selectOption('decode');
    await p.locator('#urlInput').fill('bad%2');
    await p.locator('#runUrlCodec').click();
    assert.equal(await p.locator('#urlError').isHidden(), false);
    assert.match(await p.locator('#urlError').innerText(), /index 3/i);
  }],
  ['html-entity-encoder-decoder', async p => {
    await p.locator('#htmlEntityInput').fill('<p title="café">Tom & Jerry\'s 😀</p>');
    await p.locator('#runHtmlEntity').click();
    assert.equal(
      await p.locator('#htmlEntityOutput').inputValue(),
      '&lt;p title=&quot;café&quot;&gt;Tom &amp; Jerry&#39;s 😀&lt;/p&gt;'
    );
    assert.equal(await p.locator('#htmlEntityStatus').innerText(), 'Encoded · named essentials');

    await p.locator('#htmlEntityFormat').selectOption('decimal');
    await p.locator('#htmlEntityNonAscii').check();
    await p.locator('#htmlEntityInput').fill('é 😀 & <');
    await p.locator('#runHtmlEntity').click();
    assert.equal(
      await p.locator('#htmlEntityOutput').inputValue(),
      '&#233; &#128512; &#38; &#60;'
    );

    await p.locator('#htmlEntityFormat').selectOption('hex');
    assert.equal(
      await p.locator('#htmlEntityOutput').inputValue(),
      '&#xE9; &#x1F600; &#x26; &#x3C;'
    );

    await p.locator('#htmlEntityMode').selectOption('decode');
    assert.equal(await p.locator('#htmlEntityFormat').isDisabled(), true);
    assert.equal(await p.locator('#htmlEntityNonAscii').isDisabled(), true);
    await p.locator('#htmlEntityInput').fill('&lt;b&gt;caf&eacute; &#x1F600; &#128512;&lt;/b&gt;');
    await p.locator('#runHtmlEntity').click();
    assert.equal(await p.locator('#htmlEntityOutput').inputValue(), '<b>café 😀 😀</b>');
    assert.equal(await p.locator('#htmlEntityStatus').innerText(), 'Decoded · one pass');

    await p.locator('#htmlEntityInput').fill('&amp;lt;');
    await p.locator('#runHtmlEntity').click();
    assert.equal(await p.locator('#htmlEntityOutput').inputValue(), '&lt;');
  }],
  ['cron-expression-helper', async p => {
    await p.locator('#cronMinute').fill('*/15');
    await p.locator('#cronHour').fill('*');
    await p.locator('#cronDay').fill('*');
    await p.locator('#cronMonth').fill('*');
    await p.locator('#cronWeekday').fill('*');
    assert.equal((await p.locator('#cronInput').inputValue()).trim(), '*/15 * * * *');
    assert.match(await p.locator('#cronDescription').innerText(), /Every 15 minutes/i);
    assert.equal(await p.locator('#cronNextRuns li').count(), 5);

    await p.locator('#cronInput').fill('0 9 * * MON-FRI');
    await p.locator('#parseCron').click();
    assert.equal(await p.locator('#cronError').isHidden(), true);
    assert.equal(await p.locator('#cronWeekday').inputValue(), 'MON-FRI');
    assert.equal(await p.locator('#cronNextRuns li').count(), 5);

    await p.locator('#cronInput').fill('0 0 9 * * 1-5');
    await p.locator('#parseCron').click();
    assert.equal(await p.locator('#cronError').isHidden(), false);
    assert.match(await p.locator('#cronError').innerText(), /5-field/i);
  }],
  ['meta-tag-generator', async p => {
    await p.locator('#metaTitle').fill('The "Sample" Page & Tools');
    await p.locator('#metaDescription').fill('A sample description for search and social previews.');
    await p.locator('#metaCanonical').fill('https://example.com/sample?x=1&y=2');
    await p.locator('#metaSiteName').fill('Example Site');
    await p.locator('#metaImage').fill('https://example.com/social.jpg');
    await p.locator('#metaImageAlt').fill('Example "social" card');
    await p.locator('#metaTwitterSite').fill('@example');

    const meta = await p.locator('#metaOutput').inputValue();
    assert.ok(meta.includes('&quot;Sample&quot;'));
    assert.ok(meta.includes('https://example.com/sample?x=1&amp;y=2'));
    assert.ok(meta.includes('property="og:title"'));
    assert.ok(meta.includes('property="og:image:alt"'));
    assert.ok(meta.includes('name="twitter:card"'));
    assert.ok(meta.includes('name="twitter:site"'));
    assert.equal(meta.includes('name="keywords"'), false);
    assert.match(await p.locator('#metaTitleCount').innerText(), /25 characters/);
    assert.ok((await p.locator('#metaSearchPreview').innerText()).includes('Sample'));
    assert.ok((await p.locator('#metaSocialPreview').innerText()).includes('Example Site'));
    assert.equal(await p.locator('#metaSocialPreview img').count(), 0);
  }],
  ['robots-txt-generator', async p => {
    await p.locator('#robotsUserAgent').fill('Googlebot\nGooglebot-Image');
    await p.locator('#robotsDisallow').fill('/admin/\n/private/');
    await p.locator('#robotsAllow').fill('/public/');
    await p.locator('#robotsSitemap').fill('https://example.com/sitemap.xml\nhttps://cdn.example.com/images-sitemap.xml');

    let robots = await p.locator('#robotsOutput').inputValue();
    assert.ok(robots.includes('User-agent: Googlebot\nUser-agent: Googlebot-Image'));
    assert.ok(robots.includes('Disallow: /admin/'));
    assert.ok(robots.includes('Allow: /public/'));
    assert.ok(robots.includes('Sitemap: https://example.com/sitemap.xml'));
    assert.ok(robots.includes('Sitemap: https://cdn.example.com/images-sitemap.xml'));
    assert.equal(await p.locator('#robotsError').isHidden(), true);

    await p.locator('#robotsCrawlDelay').fill('10');
    robots = await p.locator('#robotsOutput').inputValue();
    assert.ok(robots.includes('Crawl-delay: 10'));
    assert.match(await p.locator('#robotsStatus').innerText(), /not supported by Google/i);

    await p.locator('#robotsDisallow').fill('admin/');
    assert.equal(await p.locator('#robotsError').isHidden(), false);
    assert.match(await p.locator('#robotsError').innerText(), /must start with/i);
    assert.equal(await p.locator('#robotsOutput').inputValue(), '');

    await p.locator('#robotsDisallow').fill('/admin/');
    await p.locator('#robotsSitemap').fill('/sitemap.xml');
    assert.equal(await p.locator('#robotsError').isHidden(), false);
    assert.match(await p.locator('#robotsError').innerText(), /fully qualified HTTP\(S\) URL/i);

    await p.locator('#robotsSitemap').fill('https://example.com/sitemap.xml');
    await p.locator('#robotsCrawlDelay').fill('slow');
    assert.equal(await p.locator('#robotsError').isHidden(), false);
    assert.match(await p.locator('#robotsError').innerText(), /non-negative number/i);
  }],
  ['schema-markup-generator', async p => {
    await p.locator('#schemaName').fill('Example Business');
    await p.locator('#schemaUrl').fill('https://example.com/');
    assert.ok((await p.locator('#schemaOutput').inputValue()).includes('Example Business'));
  }],
  ['open-graph-preview', async p => {
    await p.locator('#ogTitle').fill('Example OG');
    assert.ok((await p.locator('#ogOutput').inputValue()).includes('Example OG'));
  }],
  ['bulk-redirect-checker', async p => {
    await p.route('**/api/redirect-check.php*', async route => {
      const url = new URL(route.request().url()).searchParams.get('url');
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,redirects:1,final_url:url+'/final',chain:[{url,status:301,location:url+'/final'},{url:url+'/final',status:200,location:null}]})});
    });
    await p.locator('#bulkRedirectInput').fill('https://example.com/a\nhttps://example.com/b');
    await p.locator('#bulkRedirectForm button[type="submit"]').click();
    await p.waitForFunction(() => document.getElementById('bulkRedirectStatus').textContent.includes('Completed 2'));
    assert.ok((await p.locator('#bulkRedirectBody').innerText()).includes('example.com/a/final'));
  }],
  ['word-counter', async p => {
    await p.locator('#textInput').fill('One two three.');
    assert.ok((await p.locator('#textStats').innerText()).includes('3'));
  }],
  ['character-counter', async p => {
    await p.locator('#textInput').fill('abc def');
    assert.ok((await p.locator('#textStats').innerText()).includes('7'));
  }],
  ['reverse-dns-checker', async p => {
    await p.route('**/api/reverse-dns-check.php**', route => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({error:'Private, reserved, loopback and documentation IP addresses are not allowed.'})
    }));
    await p.locator('#rdnsIp').fill('127.0.0.1');
    await p.locator('#rdnsForm button[type="submit"]').click();
    await p.waitForFunction(() => {
      const e = document.getElementById('rdnsError');
      return e && !e.hidden && e.textContent.length > 0;
    });
    assert.match(await p.locator('#rdnsError').innerText(), /Private|reserved|loopback/i);
    await p.locator('.rdns-example[data-ip="8.8.8.8"]').click();
    assert.equal(await p.locator('#rdnsIp').inputValue(), '8.8.8.8');
  }],
  ['favicon-generator', async p => {
    await p.locator('[data-mode="text"]').click();
    await p.locator('#faviconText').fill('SW');
    await p.locator('#bgColor').fill('#123456');
    await p.locator('#transparentBg').check();
    await p.locator('#generateFavicons').click();
    await p.waitForFunction(() => {
      const status = document.getElementById('faviconStatus');
      const button = document.getElementById('generateFavicons');
      return status && /maskable/i.test(status.textContent || '') && button && !button.disabled;
    });

    const status = (await p.locator('#faviconStatus').innerText()).trim();
    assert.match(status, /maskable/i);

    const manifest = JSON.parse(await p.locator('#manifestCode').inputValue());
    const maskable = manifest.icons.filter(icon => icon.purpose === 'maskable');
    assert.equal(maskable.length, 2);
    assert.deepEqual(maskable.map(icon => icon.sizes), ['192x192', '512x512']);
    assert.deepEqual(maskable.map(icon => icon.src), [
      '/android-chrome-192x192-maskable.png',
      '/android-chrome-512x512-maskable.png'
    ]);
    assert.equal(manifest.icons.filter(icon => icon.purpose === 'any').length, 2);

    const cornerPixel = await p.locator('#previewMaskable192').evaluate(canvas =>
      [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data]
    );
    assert.deepEqual(cornerPixel, [18, 52, 86, 255]);
    assert.equal(await p.locator('#downloadZip').isEnabled(), true);
  }],
  ['case-converter', async p => {
    await p.locator('#caseInput').fill('hello world');
    await p.locator('[data-case="upper"]').click();
    assert.equal((await p.locator('#caseOutput').inputValue()).trim(), 'HELLO WORLD');
  }],
  ['slug-generator', async p => {
    await p.locator('#slugInput').fill('Hello Wonderful World');
    assert.equal((await p.locator('#slugOutput').inputValue()).trim(), 'hello-wonderful-world');
  }],
  ['lorem-ipsum-generator', async p => {
    await p.locator('#generateLorem').click();
    assert.ok((await p.locator('#loremOutput').inputValue()).trim().length > 20);
  }],
  ['password-generator', async p => {
    await p.locator('#generateStrings').click();
    assert.ok((await p.locator('#genOutput').inputValue()).trim().length >= 20);
  }],
  ['random-string-generator', async p => {
    await p.locator('#generateStrings').click();
    assert.ok((await p.locator('#genOutput').inputValue()).trim().length >= 20);
  }]
];

(async () => {
  const browser = await chromium.launch({headless: true});
  const failures = [];
  for (const [slug, check] of cases) {
    const context = await browser.newContext({viewport: {width: 1280, height: 800}});
    const page = await context.newPage();
    const exceptions = [];
    page.on('pageerror', error => exceptions.push(error.message));
    try {
      const response = await page.goto(origin + '/' + slug + '/', {waitUntil: 'networkidle', timeout: 20000});
      assert.equal(response.status(), 200, slug + ' page HTTP status');
      await check(page);
      assert.deepEqual(exceptions, [], slug + ' browser errors');
      console.log('PASS', slug);
    } catch (error) {
      failures.push({slug, error: error.message, exceptions});
      console.error('FAIL', slug, error.message);
    } finally {
      await context.close();
    }
  }
  // Catch JavaScript initialization failures across the full current indexable inventory,
  // including guides and pages without explicit functional test cases.
  const locs = [...readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)</g)]
    .map(match => new URL(match[1]).pathname);
  assert.ok(locs.length >= 89, 'sitemap unexpectedly shrank below the 89-page audit baseline');
  for (const path of locs) {
    const page = await browser.newPage();
    const exceptions = [];
    page.on('pageerror', error => exceptions.push(error.message));
    try {
      const response = await page.goto(origin + path, {waitUntil: 'domcontentloaded', timeout: 15000});
      assert.equal(response.status(), 200);
      await page.waitForTimeout(150);
      assert.deepEqual(exceptions, [], path + ' initialization errors');
    } catch (error) {
      failures.push({slug: path, error: error.message});
      console.error('FAIL page sweep', path, error.message);
    } finally {
      await page.close();
    }
  }
  console.log('Browser page sweep:', locs.length, 'pages checked');

  // Keep category navigation aligned as new tools are added.
  const navCases = [
    ['/chmod-calculator/', '/developer-tools/'],
    ['/dnssec-checker/', '/website-tools/'],
    ['/reverse-dns-checker/', '/website-tools/'],
    ['/cache-control-checker/', '/website-tools/'],
    ['/website-speed-test/', '/website-tools/'],
    ['/canonical-tag-checker/', '/seo-tools/'],
    ['/robots-txt-tester/', '/seo-tools/']
  ];
  for (const [path, expectedHref] of navCases) {
    const page = await browser.newPage();
    try {
      await page.goto(origin + path, {waitUntil: 'domcontentloaded', timeout: 15000});
      const active = page.locator('#primaryNav a[aria-current="page"]');
      assert.equal(await active.getAttribute('href'), expectedHref, path + ' active category');
      console.log('PASS active navigation', path);
    } catch (error) {
      failures.push({slug: 'active-nav:' + path, error: error.message});
      console.error('FAIL active-nav', path, error.message);
    } finally {
      await page.close();
    }
  }

  // Global service navigation and type-ahead tool search.
  {
    const page = await browser.newPage({viewport: {width: 1280, height: 800}});
    try {
      await page.goto(origin + '/json-formatter/', {waitUntil: 'networkidle', timeout: 20000});
      await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href && sheet.href.includes('/assets/header-nav-search.css')));
      const search = page.locator('#headerToolSearch');
      await search.fill('guid');
      await page.waitForFunction(() => {
        const box = document.getElementById('headerToolResults');
        return box && !box.hidden && box.querySelectorAll('[role="option"]').length > 0;
      });
      assert.equal(await page.locator('#headerToolResults [role="option"]').first().getAttribute('href'), '/uuid-generator/');

      await search.fill('301');
      await page.waitForFunction(() => [...document.querySelectorAll('#headerToolResults [role="option"]')].some(a => a.getAttribute('href') === '/redirect-checker/'));
      assert.ok(await page.locator('#headerToolResults a[href="/redirect-checker/"]').count());

      await search.fill('lower');
      await page.waitForFunction(() => [...document.querySelectorAll('#headerToolResults [role="option"]')].some(a => a.getAttribute('href') === '/case-converter/'));
      assert.ok(await page.locator('#headerToolResults a[href="/case-converter/"]').count());

      const developerGroup = page.locator('[data-nav-group="developer"]');
      assert.equal(await developerGroup.count(), 1);
      await developerGroup.locator('.nav-group-toggle').click();
      assert.equal(await developerGroup.locator('.nav-group-toggle').getAttribute('aria-expanded'), 'true');
      assert.ok(await developerGroup.locator('.nav-direct-list a[href="/uuid-generator/"]').count());
      console.log('PASS global tool search/navigation');
    } catch (error) {
      failures.push({slug: 'global-tool-search-navigation', error: error.message});
      console.error('FAIL global-tool-search-navigation', error.message);
    } finally {
      await page.close();
    }
  }

  // Mobile layout and navigation regression checks on a representative tool page.
  const mobile = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true});
  await mobile.addInitScript(() => { window.__swuCls = 0; new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__swuCls += entry.value; }).observe({type:'layout-shift', buffered:true}); });
  try {
    await mobile.goto(origin + '/json-formatter/');
    assert.equal(await mobile.locator('h1').count(), 1);
    const width = await mobile.evaluate(() => ({scroll: document.documentElement.scrollWidth, view: window.innerWidth}));
    assert.ok(width.scroll <= width.view + 3, 'mobile horizontal overflow ' + JSON.stringify(width));
    const mobileSearch = mobile.locator('#headerToolSearch');
    assert.equal(await mobileSearch.isVisible(), true);
    await mobileSearch.fill('ssl cert');
    await mobile.waitForFunction(() => [...document.querySelectorAll('#headerToolResults [role="option"]')].some(a => a.getAttribute('href') === '/ssl-checker/'));
    assert.ok(await mobile.locator('#headerToolResults a[href="/ssl-checker/"]').count());
    await mobileSearch.fill('');
    const toggle = mobile.locator('#menuToggle');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await mobile.waitForTimeout(250);
    const cls = await mobile.evaluate(() => window.__swuCls || 0);
    assert.ok(cls < 0.1, 'mobile header/layout CLS too high: ' + cls);
    console.log('PASS mobile navigation/layout');
  } catch (error) {
    failures.push({slug: 'mobile-navigation', error: error.message});
    console.error('FAIL mobile-navigation', error.message);
  }
  await mobile.close();
  await browser.close();
  console.log('Browser smoke:', cases.length + 1 + locs.length - failures.length, 'passed,', failures.length, 'failed');
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
