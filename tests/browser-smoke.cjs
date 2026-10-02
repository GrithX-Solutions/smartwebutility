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
    await p.locator('#converterInput').fill('service:\n  name: api\n  port: 8080');
    await p.locator('#convertBtn').click();
    assert.ok((await p.locator('#converterOutput').inputValue()).includes('"service"'));
  }],
  ['json-to-yaml', async p => {
    await p.locator('#converterInput').fill('{"service":{"name":"api","port":8080}}');
    await p.locator('#convertBtn').click();
    assert.ok((await p.locator('#converterOutput').inputValue()).includes('service:'));
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
    assert.ok((await p.locator('#yamlOutput').inputValue()).includes('service:'));
    assert.equal(await p.locator('#yamlError').isHidden(), true);
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
    await p.locator('#xmlFormatInput').fill('<catalog><item></catalog>');
    await p.locator('#validateXml').click();
    assert.equal(await p.locator('#xmlFormatError').isHidden(), false);
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
    await p.locator('#markdownInput').fill('# Hello\n\n| A | B |\n| --- | --- |\n| one | two |');
    await p.locator('#convertMarkdownHtml').click();
    const html = await p.locator('#markdownHtmlOutput').inputValue();
    assert.ok(html.includes('<h1>Hello</h1>'));
    assert.ok(html.includes('<table>'));
    assert.equal(await p.locator('#markdownHtmlPreview').getAttribute('sandbox'), '');
    assert.equal(await p.locator('#markdownHtmlError').isHidden(), true);
  }],
  ['html-to-markdown', async p => {
    await p.waitForFunction(() => document.getElementById('htmlMarkdownStatus').textContent === 'Ready');
    await p.locator('#htmlMarkdownInput').fill('<h1>Hello</h1><p>A <strong>bold</strong> paragraph.</p><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>one</td><td>two</td></tr></tbody></table>');
    await p.locator('#convertHtmlMarkdown').click();
    const markdown = await p.locator('#htmlMarkdownOutput').inputValue();
    assert.ok(markdown.includes('# Hello'));
    assert.ok(markdown.includes('**bold**'));
    assert.ok(markdown.includes('| A'));
    assert.equal(await p.locator('#htmlMarkdownError').isHidden(), true);
  }],
  ['html-minifier', async p => {
    await p.waitForFunction(() => document.getElementById('htmlMinifierStatus').textContent === 'Ready');
    const source = '<!doctype html>\n<html>\n  <body>\n    <!-- remove me -->\n    <main>\n      <h1>Hello</h1>\n      <p>World</p>\n    </main>\n  </body>\n</html>';
    await p.locator('#htmlMinifierInput').fill(source);
    await p.locator('#minifyHtml').click();
    await p.waitForFunction(() => document.getElementById('htmlMinifierStatus').textContent === 'Minified');
    const minified = await p.locator('#htmlMinifierOutput').inputValue();
    assert.ok(minified.length < source.length);
    assert.ok(!minified.includes('remove me'));
    assert.ok(minified.includes('<h1>Hello</h1>'));
    assert.equal(await p.locator('#htmlMinifierError').isHidden(), true);
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
  ['json-diff', async p => {
    await p.locator('#jsonDiffLeft').fill('{"port":8080,"enabled":false}');
    await p.locator('#jsonDiffRight').fill('{"port":8443,"enabled":true,"region":"us"}');
    await p.locator('#compareJson').click();
    const text = await p.locator('#jsonDiffResult').innerText();
    assert.ok(text.includes('$.port'));
    assert.ok(text.includes('$.region'));
  }],
  ['base64-encoder-decoder', async p => {
    await p.locator('#base64Input').fill('hello');
    await p.locator('#runBase64').click();
    assert.equal((await p.locator('#base64Output').inputValue()).trim(), 'aGVsbG8=');
  }],
  ['unix-timestamp-converter', async p => {
    await p.locator('#unixInput').fill('1767225600');
    await p.locator('#convertUnix').click();
    assert.ok((await p.locator('#dateResult').innerText()).trim().length);
  }],
  ['uuid-generator', async p => {
    await p.locator('#uuidCount').fill('3');
    await p.locator('#generateUuid').click();
    assert.equal((await p.locator('#uuidOutput').inputValue()).trim().split(/\r?\n/).length, 3);
  }],
  ['hash-generator', async p => {
    await p.locator('#hashInput').fill('hello');
    await p.locator('#generateHash').click();
    await p.waitForFunction(() => document.getElementById('hashOutput').value.trim().length >= 32);
    assert.ok((await p.locator('#hashOutput').inputValue()).trim().length >= 32);
  }],
  ['jwt-decoder', async p => {
    await p.locator('#exampleJwt').click();
    await p.locator('#decodeJwt').click();
    assert.ok((await p.locator('#jwtHeader').inputValue()).includes('alg'));
  }],
  ['regex-tester', async p => {
    await p.locator('#regexPattern').fill('\\d+');
    await p.locator('#regexInput').fill('A12 B34');
    await p.locator('#runRegex').click();
    assert.ok((await p.locator('#regexMatches').innerText()).includes('12'));
  }],
  ['url-encoder-decoder', async p => {
    await p.locator('#urlInput').fill('hello world');
    await p.locator('#runUrlCodec').click();
    assert.equal((await p.locator('#urlOutput').inputValue()).trim(), 'hello%20world');
  }],
  ['html-entity-encoder-decoder', async p => {
    await p.locator('#htmlEntityInput').fill('<h1>Hi & bye</h1>');
    await p.locator('#runHtmlEntity').click();
    assert.ok((await p.locator('#htmlEntityOutput').inputValue()).includes('&lt;h1&gt;'));
  }],
  ['cron-expression-helper', async p => {
    await p.locator('#cronInput').fill('*/5 * * * *');
    await p.locator('#parseCron').click();
    assert.equal(await p.locator('#cronError').isHidden(), true);
  }],
  ['meta-tag-generator', async p => {
    await p.locator('#metaTitle').fill('Sample Page');
    await p.locator('#metaDescription').fill('A sample description');
    assert.ok((await p.locator('#metaOutput').inputValue()).includes('Sample Page'));
  }],
  ['robots-txt-generator', async p => {
    await p.locator('#robotsDisallow').fill('/admin/');
    assert.ok((await p.locator('#robotsOutput').inputValue()).includes('/admin/'));
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
  ['favicon-generator', async p => {
    await p.locator('[data-mode="text"]').click();
    await p.locator('#faviconText').fill('SW');
    await p.locator('#generateFavicons').click();
    assert.ok((await p.locator('#faviconStatus').innerText()).trim().length);
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
  // Catch JavaScript initialization failures on all 57 indexable pages,
  // including guides and pages without explicit functional test cases.
  const locs = [...readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)</g)]
    .map(match => new URL(match[1]).pathname);
  assert.ok(locs.length >= 57, 'sitemap unexpectedly shrank');
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
  // Mobile layout and navigation regression checks on a representative tool page.
  const mobile = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true});
  try {
    await mobile.goto(origin + '/json-formatter/');
    assert.equal(await mobile.locator('h1').count(), 1);
    const width = await mobile.evaluate(() => ({scroll: document.documentElement.scrollWidth, view: window.innerWidth}));
    assert.ok(width.scroll <= width.view + 3, 'mobile horizontal overflow ' + JSON.stringify(width));
    const toggle = mobile.locator('#menuToggle');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
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
