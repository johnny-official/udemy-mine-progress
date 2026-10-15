const assert = require('node:assert/strict');
const I = require('../i18n.js');
assert.deepEqual(I.supported, ['vi', 'en']);
assert.equal(I.validLanguage('en'), 'en');
assert.equal(I.validLanguage('vi'), 'vi');
assert.equal(I.validLanguage('fr'), null);
assert.equal(I.initialLanguage('en-US'), 'en');
assert.equal(I.initialLanguage('vi-VN'), 'en');
assert.equal(I.initialLanguage('fr-FR'), 'en');
assert.equal(I.initialLanguage(), 'en');
assert.equal(I.create('invalid').language, 'en');
assert.equal(I.create('vi').language, 'vi');
assert.deepEqual(Object.keys(I.dictionaries.en).sort(), Object.keys(I.dictionaries.vi).sort());
assert.equal(I.create('en').t('resumeDesc', {id:'42', time:'1:23'}), 'Lesson 42, at 1:23. Continue from this computer’s position?');
for (const lang of I.supported) {
  const dict = I.dictionaries[lang];
  for (const [key, text] of Object.entries(dict)) {
    assert.equal(typeof text, 'string', `${lang}.${key} must be text`);
    assert.equal(text.includes('{unknown}'), false, `${lang}.${key} has unexpected interpolation`);
  }
}
console.log('PASS: language validation, fallback and translated interpolation');
