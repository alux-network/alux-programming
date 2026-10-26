import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReaderEdition } from '../scripts/book-validation.ts';
import type { ReaderBook } from '../src/book.ts';
const book: ReaderBook = {
  groups: [],
  toc: [],
  pages: [
    {
      id: 'a.md',
      source: 'a.md',
      slug: 'a.html',
      title: 'English',
      group: 'Welcome',
      hash: 'hash',
      markdown: '# English',
      html: '<h1 id="stable">English</h1><p><code>x</code><a href="https://example.com/">link</a></p><pre><code>let x = 1;</code></pre><annotation encoding="application/x-tex">x^2</annotation>',
      text: 'English',
      minutes: 1,
      parentId: null,
      children: [],
      headings: [{ id: 'stable', level: 1, text: 'English' }]
    }
  ]
};
test('editions can change prose but not protected code, formulae, links or canonical identity', () => {
  const localized = structuredClone(book);
  localized.pages[0]!.title = '中文';
  localized.pages[0]!.html = localized.pages[0]!.html.replaceAll(
    'English',
    '中文'
  ).replace('>link<', '>链接<');
  assert.doesNotThrow(() => validateReaderEdition(localized, book, 'zh'));
  for (const [before, after] of [
    ['let x = 1;', 'let x = 2;'],
    ['x^2', 'x^3'],
    ['https://example.com/', 'https://other.example/']
  ]) {
    const broken = structuredClone(localized);
    broken.pages[0]!.html = broken.pages[0]!.html.replace(before!, after!);
    assert.throws(
      () => validateReaderEdition(broken, book, 'zh'),
      /protected technical content/
    );
  }
  const moved = structuredClone(localized);
  moved.pages[0]!.slug = 'changed.html';
  assert.throws(() => validateReaderEdition(moved, book, 'zh'), /identity/);
});

test('media sources, responsive images, video posters and iframe titles are protected together', () => {
  const canonical = structuredClone(book);
  canonical.pages[0]!.html +=
    '<iframe src="https://example.com/embed" title="Original clip"></iframe><video poster="poster.png"><source src="movie.mp4"></video><audio src="recording.mp3"></audio><img src="small.png" srcset="large.png 2x">';
  assert.doesNotThrow(() =>
    validateReaderEdition(structuredClone(canonical), canonical, 'zh')
  );
  for (const original of [
    'Original clip',
    'poster.png',
    'movie.mp4',
    'recording.mp3',
    'large.png'
  ]) {
    const broken = structuredClone(canonical);
    assert.ok(broken.pages[0]!.html.includes(original));
    broken.pages[0]!.html = broken.pages[0]!.html.replace(original, 'changed');
    assert.throws(
      () => validateReaderEdition(broken, canonical, 'zh'),
      /protected technical content/,
      original
    );
  }
});
