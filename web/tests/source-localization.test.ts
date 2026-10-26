import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localizeSources,
  sourceMetadata,
  translatedSourcePath
} from '../scripts/source-localization.ts';
import type { MdBook, MdBookChapter } from '../scripts/mdbook-model.ts';

const chapter = (source = 'chapter.md'): MdBookChapter => ({
  name: 'Canonical title',
  content: '# Original {#stable}\n\nEnglish body',
  path: source,
  source_path: source,
  number: [1],
  parent_names: [],
  sub_items: []
});

test('source-level translations keep canonical identity and hierarchy with English fallback', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'alux-source-locales-')
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const original = chapter('index.md'),
    child = chapter('child.md');
  original.sub_items = [{ Chapter: child }];
  const input: MdBook = {
    sections: [{ PartTitle: 'Part One' }, { Chapter: original }, 'Separator']
  };
  await fs.writeFile(
    path.join(directory, 'index.zh.md'),
    '<!-- reader: {"title":"导言","parts":{"Part One":"第一部分"}} -->\n\n# 中文标题 {#stable}\n\n译文正文'
  );
  const localized = await localizeSources(input, directory, 'zh');
  assert.deepEqual(localized.sections[0], { PartTitle: '第一部分' });
  const parent = localized.sections[1];
  assert.ok(typeof parent === 'object' && 'Chapter' in parent);
  assert.equal(parent.Chapter.name, '导言');
  assert.equal(parent.Chapter.path, 'index.md');
  assert.equal(parent.Chapter.source_path, 'index.md');
  assert.deepEqual(parent.Chapter.number, [1]);
  assert.ok(parent.Chapter.content.includes('译文正文'));
  assert.deepEqual(parent.Chapter.sub_items, [{ Chapter: child }]);
  assert.equal(localized.sections[2], 'Separator');
  assert.equal(original.content, '# Original {#stable}\n\nEnglish body');
  assert.equal(original.name, 'Canonical title');
});

test('a new Markdown translation needs no manifest and only its selected locale changes', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'alux-source-edit-')
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input: MdBook = { sections: [{ Chapter: chapter() }] };
  await fs.writeFile(
    path.join(directory, 'chapter.zh.md'),
    '# 第一个标题 {#stable}\n\n第一版'
  );
  const before = await localizeSources(input, directory, 'zh');
  assert.deepEqual(await localizeSources(input, directory, 'de'), input);
  assert.strictEqual(await localizeSources(input, directory, 'en'), input);
  await fs.writeFile(
    path.join(directory, 'chapter.zh.md'),
    '# 第一个标题 {#stable}\n\n第二版'
  );
  const after = await localizeSources(input, directory, 'zh');
  assert.notDeepEqual(after, before);
  assert.deepEqual(await localizeSources(input, directory, 'de'), input);
  const item = after.sections[0];
  assert.ok(typeof item === 'object' && 'Chapter' in item);
  assert.equal(item.Chapter.name, '第一个标题');
  assert.equal(item.Chapter.path, 'chapter.md');
});

test('invalid source metadata and escaping source paths fail rather than corrupting the book', async () => {
  assert.throws(() => sourceMetadata('<!-- reader: {"title":12} -->'), /title/);
  assert.throws(
    () => sourceMetadata('<!-- reader: {"parts":{"Part":null}} -->'),
    /part/
  );
  assert.throws(
    () => sourceMetadata('<!-- reader: {"unknown":true} -->'),
    /Unknown/
  );
  assert.equal(
    translatedSourcePath('nested/chapter.md', 'zh-hant'),
    'nested/chapter.zh-hant.md'
  );
  assert.throws(() => translatedSourcePath('chapter.html', 'zh'), /Markdown/);
  await assert.rejects(
    localizeSources(
      { sections: [{ Chapter: chapter('../escape.md') }] },
      os.tmpdir(),
      'zh'
    ),
    /escapes/
  );
});
