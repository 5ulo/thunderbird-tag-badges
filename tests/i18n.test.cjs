const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const catalogs = Object.fromEntries(['en','sk'].map(locale => [locale, JSON.parse(fs.readFileSync(path.join(root, '_locales', locale, 'messages.json')))]));
const html = fs.readFileSync(path.join(root,'options/options.html'),'utf8');
const script = fs.readFileSync(path.join(root,'options/i18n.js'),'utf8');
test('both catalogs cover every static and dynamic UI message', () => {
  assert.deepEqual(Object.keys(catalogs.en).sort(), Object.keys(catalogs.sk).sort());
  const keys = [...html.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g)].map(m => m[1]);
  const options = fs.readFileSync(path.join(root,'options/options.js'),'utf8');
  keys.push(...[...options.matchAll(/message\("([^"]+)"/g)].map(m => m[1]));
  keys.push('locale','hiddenTagsLabel','extensionDescription','detailsDescription');
  for (const locale of ['en','sk']) for (const key of keys) assert.ok(catalogs[locale][key]?.message, `${locale}: ${key}`);
  for (const key of Object.keys(catalogs.en)) {
    assert.deepEqual(catalogs.en[key].message.match(/\$\d+/g), catalogs.sk[key].message.match(/\$\d+/g), key);
  }
});
for (const locale of ['en','sk']) test(`localization updates page text, language and accessibility labels: ${locale}`, () => {
  const elements = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => ({dataset:{i18n:m[1]}, textContent:''}));
  const aria = {dataset:{i18nAriaLabel:'preview'},setAttribute(key,value){this[key]=value;}};
  const document = {documentElement:{},querySelectorAll:selector => selector==='[data-i18n]' ? elements : [aria]};
  const messenger = {i18n:{getMessage:key => key==='@@bidi_dir' ? 'ltr' : catalogs[locale][key]?.message || ''}};
  vm.runInNewContext(script,{document,messenger});
  assert.equal(document.documentElement.lang,locale);
  assert.equal(document.documentElement.dir,'ltr');
  assert.equal(aria['aria-label'],catalogs[locale].preview.message);
  assert.ok(elements.every(e => e.textContent===catalogs[locale][e.dataset.i18n].message));
  assert.equal(elements.find(e => e.dataset.i18n==='save').textContent, locale==='en' ? 'Save settings' : 'Uložiť nastavenia');
});
test('manifest defines English as the fallback and localizes the description', () => {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
  assert.equal(manifest.default_locale,'en');
  assert.equal(manifest.description,'__MSG_extensionDescription__');
});
