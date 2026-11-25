const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalize, defaults, foreground} = require('../settings.js').TagBadgeSettings;
test('stored preferences are sanitized without accepting unknown keys', () => {
  assert.deepEqual(normalize(null), defaults);
  assert.deepEqual(normalize({maxTags: -1, radius: Infinity, position: 'invalid', debug: 'true', unknown: 1}), defaults);
  assert.equal(normalize({tableMaxTags: 3.8, radius: 7.9, pill: false}).tableMaxTags, 3);
  assert.equal(normalize({maxTags: 3.8, radius: 7.9, pill: false}).radius, 7);
  assert.equal(normalize({tableMaxTags: 10000}).tableMaxTags, 1000);
});
test('foreground picks the higher WCAG contrast for every RGB cube sample', () => {
  for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17) {
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    const channels = [r, g, b].map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const l = channels.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const contrast = foreground(hex) === '#000000' ? (l + .05) / .05 : 1.05 / (l + .05);
    assert.ok(contrast >= 4.5, hex);
  }
});

test('old limits migrate and explicit view limits win', () => {
  assert.equal(normalize({maxTags: 3}).tableMaxTags, 3);
  assert.equal(normalize({maxTags: 3}).cardMaxTags, 3);
  const result = normalize({maxTags: 3, tableMaxTags: 0, cardMaxTags: 7});
  assert.equal(result.tableMaxTags, 0);
  assert.equal(result.cardMaxTags, 7);
  assert.equal(normalize({size: 'invalid'}).size, 'compact');
});
test('display order is stable, alphabetical or keyed by priority', () => {
  const {sortTags} = require('../settings.js').TagBadgeSettings;
  const tags = [{key:'a',tag:'Zulu'}, {key:'b',tag:'Alpha'}, {key:'c',tag:'Beta'}];
  assert.deepEqual(sortTags(tags, normalize()).map(t => t.key), ['a','b','c']);
  assert.deepEqual(sortTags(tags, normalize({order:'alphabetical'})).map(t => t.key), ['b','c','a']);
  assert.deepEqual(sortTags(tags, normalize({order:'priority',priority:['missing','c','c']})).map(t => t.key), ['c','a','b']);
  assert.equal(tags[0].key,'a');
});
