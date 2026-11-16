import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseEntranceLanguage, languageFromCountry } from '../entrance.ts';

test('manual preference wins without calling country detection', async () => {
  let called = false;
  const language = await chooseEntranceLanguage('ja', async () => { called = true; return { country: 'DE' }; });
  assert.equal(language, 'ja');
  assert.equal(called, false);
});

test('country detection maps supported country and invalid country falls back to browser language', async () => {
  assert.equal(await chooseEntranceLanguage(undefined, async () => ({ country: 'CN' }), 'en-US'), 'zh');
  assert.equal(await chooseEntranceLanguage(undefined, async () => ({ country: '??' }), 'es-MX'), 'es');
  assert.equal(languageFromCountry({ country: 'not-a-country' }), undefined);
  assert.equal(await chooseEntranceLanguage(undefined, async () => ({ country: 'IN' }), 'zh-CN'), 'en');
});

test('country timeout falls back without waiting a UI-length request', async () => {
  const started = Date.now();
  const language = await chooseEntranceLanguage(undefined, () => new Promise(() => undefined), 'ko-KR');
  assert.equal(language, 'ko');
  assert.ok(Date.now() - started < 1200);
});

test('country rejection falls back to browser language', async () => {
  assert.equal(await chooseEntranceLanguage(undefined, async () => { throw new Error('offline'); }, 'zh-TW'), 'zh-hant');
});
