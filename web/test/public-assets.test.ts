import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chapterAssets } from '../public-assets.ts';

test('public media paths resolve from each chapter and the native print page', () => {
  const content = '<img class="section-image" src="/picture.png">\n![picture](/picture.png)';
  for (const lang of ['en', 'ar']) {
    for (const chapter of ['index.md', 'part/chapter.md', 'part/nested/chapter.md']) {
      const edition = lang === 'en' ? '' : lang + '/';
      const transformed = chapterAssets(content, chapter, lang);
      const links = [...transformed.matchAll(/(?:src="|\]\()([^"\)]+)/g)].map((m) => m[1]!);
      assert.equal(links.length, 2);
      for (const link of links) {
        assert.equal(new URL(link, 'https://example.test/' + edition + chapter).pathname, '/picture.png');
        const folder = chapter.includes('/') ? chapter.slice(0, chapter.lastIndexOf('/') + 1) : '';
        assert.equal(new URL(folder + link, 'https://example.test/' + edition + 'print.html').pathname, '/picture.png');
      }
    }
  }
});

test('public media normalization preserves code, external and relative links', () => {
  const content = ['```html', '<img src="/example.png">', '```', '`![example](/example.png)`', '![external](https://example.test/a.png)', '![cdn](//example.test/a.png)', '![local](../a.png)'].join('\n');
  assert.equal(chapterAssets(content, 'part/chapter.md', 'ar'), content);
});
