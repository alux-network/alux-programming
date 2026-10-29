import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { chapterAssets } from '../public-assets.ts';

test('public media paths resolve from each chapter and the native print page', () => {
  const content = '<img class="section-image" src="/picture.png">\n\n![picture](/picture.png)';
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

test('literal Markdown examples are preserved across code forms and containers', () => {
  const examples = [
    '    <img src="/literal.png">',
    '\t![literal](/literal.png)',
    '``![literal](/literal.png) ` example``',
    '`before\n![literal](/literal.png)\nafter`',
    '> ```html\n> <img src="/literal.png">\n> ```',
    '- example\n\n      <img src="/literal.png">',
    '\\![literal](/literal.png)',
    '<!-- <img src="/literal.png"> -->',
    `<script>const example = '<img src="/literal.png">';</script>`,
    '~~~html\n~~~not-a-closing-fence\n<img src="/literal.png">\n~~~',
  ];
  for (const example of examples) assert.equal(chapterAssets(example, 'part/chapter.md', 'ar'), example, example);
});

test('HTML normalization changes only the actual image source attribute', () => {
  const content = `<img title='src="/literal.png"' data-src="/lazy.png" src=/picture.png>`;
  const transformed = chapterAssets(content, 'part/chapter.md', 'ar');
  assert.equal(transformed, `<img title='src="/literal.png"' data-src="/lazy.png" src="../../picture.png">`);
  assert.equal(chapterAssets(`<img src='/picture.png'>`, 'part/chapter.md', 'en'), '<img src="../picture.png">');
});

test('reference images are normalized without changing shared ordinary links', () => {
  const content = '![picture][asset]\n\n[ordinary link][asset]\n\n[asset]: /picture.png "Picture"';
  const transformed = chapterAssets(content, 'part/chapter.md', 'ar');
  assert.ok(transformed.includes('![picture](../../picture.png "Picture")'));
  assert.ok(transformed.includes('[ordinary link][asset]'));
  assert.ok(transformed.includes('[asset]: /picture.png "Picture"'));
});

test('the native preprocessor chain normalizes admonition images while preserving nested code', async () => {
  const project = process.cwd();
  const fixture = await mkdtemp(path.join(tmpdir(), 'alux-media-'));
  try {
    await mkdir(path.join(fixture, 'src/part'), { recursive: true });
    await writeFile(path.join(fixture, 'src/SUMMARY.md'), '# Summary\n\n- [Root](index.md)\n- [Nested](part/chapter.md)\n');
    await writeFile(path.join(fixture, 'src/index.md'), '# Root\n');
    const content = [
      '# Nested', '', '![outside](/picture.png)', '',
      '````admonish note', '![inside](/picture.png)', '', '> ![quoted](/picture.png)', '',
      '```html', '<img src="/literal.png">', '```', '````', '',
      '    <img src="/indented.png">', '', '``![inline](/inline.png) ` code``', '',
    ].join('\n');
    await writeFile(path.join(fixture, 'src/part/chapter.md'), content);
    // Exercise the real configured order, not a second preprocessor chain maintained by the test.
    const config = (await readFile('book.toml', 'utf8'))
      .replace(/\[output\.html\][\s\S]*/, '[output.html]\n')
      .replace(/command = "node (web\/[^" ]+\.ts)"/g, (_, file: string) =>
        'command = ' + JSON.stringify('node "' + path.join(project, file).replaceAll('\\', '/') + '"'));
    await writeFile(path.join(fixture, 'book.toml'), config);
    for (const lang of ['en', 'ar']) {
      execFileSync('mdbook', ['build'], { cwd: fixture, env: {
        ...process.env, MDBOOK_BOOK__LANGUAGE: lang, MDBOOK_BUILD__BUILD_DIR: 'out/' + lang,
        MDBOOK_OUTPUT__HTML__SITE_URL: lang === 'en' ? '/' : '/ar/',
      }, stdio: 'pipe' });
      for (const file of ['part/chapter.html', 'print.html']) {
        const html = await readFile(path.join(fixture, 'out', lang, 'html', file), 'utf8');
        const images = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]!);
        assert.equal(images.length, 3, lang + '/' + file + ': every actual image is present');
        const base = 'https://example.test/' + (lang === 'en' ? '' : lang + '/') + file;
        for (const image of images) assert.equal(new URL(image, base).pathname, '/picture.png', lang + '/' + file);
        assert.ok(html.includes('&lt;img src="/literal.png"&gt;'), 'fenced example retains its literal path');
        assert.ok(html.includes('&lt;img src="/indented.png"&gt;'), 'indented example retains its literal path');
        assert.ok(html.includes('![inline](/inline.png) ` code'), 'multi-backtick inline example is preserved');
      }
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('destination edits preserve multiline labels, titles and container prefixes', () => {
  for (const source of [
    '> ![multi\n> line](/picture.png "Original title")',
    '- ![multi\n  line](/picture.png)',
    '![a `]` name](/picture.png "Original title")',
    '[![picture](/picture.png)](/target)',
  ]) assert.equal(chapterAssets(source, 'part/chapter.md', 'ar'), source.replace('/picture.png', '../../picture.png'));
  const source = '> ![multi\n> line][asset]\n\n[asset]: /picture.png "Title"';
  assert.equal(chapterAssets(source, 'part/chapter.md', 'ar'), '> ![multi\n> line](../../picture.png "Title")\n\n[asset]: /picture.png "Title"');
  assert.equal(chapterAssets('![picture](/picture.png)', 'part\\chapter.md', 'ar'), '![picture](../../picture.png)');
});
