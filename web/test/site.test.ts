// The built site (`npm run build`) against the site expected from mdBook, and the verifier against
// deliberately broken copies of it.
//
// Needs a built site: run `npm run build` first. Every check in verifySite has a negative test
// here, so a verifier that silently stops checking fails.
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { languages } from '../languages.ts';
import type { Edition } from './site.ts';
import { expectedSite, verifySite } from './site.ts';

const site = 'book/html';
const editions = await expectedSite();
const english = editions.find((e) => e.lang === 'en')!;

test('the built site matches the book in every edition', () => {
  assert.deepEqual(verifySite(site, editions), []);
});

test('every edition has the canonical chapters and parts', () => {
  for (const edition of editions) {
    assert.deepEqual(edition.pages.map((p) => p.file), english.pages.map((p) => p.file), edition.lang);
    assert.equal(edition.parts.length, english.parts.length, edition.lang);
  }
});

describe('the verifier reports', () => {
  // A copy of the English edition alone, broken in one way per test.
  const others = new Set<string>(languages.map((l) => l.code).filter((c) => c !== 'en'));
  const copies: string[] = [];
  const copy = () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'alux-site-'));
    cpSync(site, dir, { recursive: true, filter: (src) => !others.has(path.relative(site, src).split(path.sep)[0]!) });
    copies.push(dir);
    return dir;
  };
  const chapter = english.pages[2]!.file;
  const verify = (dir: string, edition: Edition = english) => verifySite(dir, [edition]);
  after(() => copies.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  test('nothing for an intact copy', () => {
    assert.deepEqual(verify(copy()), []);
  });
  test('a removed chapter page', () => {
    const dir = copy();
    rmSync(path.join(dir, chapter));
    assert.ok(verify(dir).includes(`en: missing page ${chapter}`));
  });
  test('an unexpected page', () => {
    const dir = copy();
    writeFileSync(path.join(dir, 'stray.html'), '<html></html>');
    assert.ok(verify(dir).includes('en: unexpected page stray.html'));
  });
  test('a renamed source chapter', () => {
    const renamed = { ...english, pages: english.pages.map((p) => (p.file === chapter ? { ...p, file: 'renamed.html' } : p)) };
    const problems = verify(copy(), renamed);
    assert.ok(problems.includes('en: missing page renamed.html'));
    assert.ok(problems.includes(`en: unexpected page ${chapter}`));
  });
  test('a broken anchor', () => {
    const dir = copy();
    const file = path.join(dir, 'index.html');
    writeFileSync(file, readFileSync(file, 'utf8').replace('</main>', '<a href="#no-such-heading">x</a></main>'));
    assert.ok(verify(dir).some((p) => p.includes('broken anchor #no-such-heading')));
  });
  test('a missing asset', () => {
    const dir = copy();
    rmSync(path.join(dir, 'reader.js'));
    assert.ok(verify(dir).some((p) => p.includes('broken link /reader.js')));
  });
  test('a wrong title', () => {
    const retitled = { ...english, pages: english.pages.map((p) => (p.file === chapter ? { ...p, title: 'Another title' } : p)) };
    assert.ok(verify(copy(), retitled).some((p) => p.startsWith(`en/${chapter}: title`)));
  });
});
