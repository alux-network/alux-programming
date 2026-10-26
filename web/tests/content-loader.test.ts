import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookLoader } from '../src/content-loader.ts';
import { parseReaderBook } from '../src/book-data.ts';
const chapter = {
  id: 'chapter.md',
  title: 'Chapter',
  source: 'chapter.md',
  slug: 'chapter.html',
  hash: 'source-hash',
  group: 'Welcome',
  markdown: '# Chapter',
  html: '<h1>Chapter</h1>',
  text: 'Chapter',
  minutes: 1,
  parentId: null,
  children: [],
  headings: []
};

test('reader data fetches only the requested edition, coalesces requests, and retries failure', async () => {
  const requested: string[] = [];
  let unavailable = true;
  const book = { pages: [chapter], groups: [], toc: [] };
  const load = createBookLoader((async (input) => {
    requested.push(String(input));
    if (String(input).endsWith('ar.json') && unavailable) {
      unavailable = false;
      return new Response('', { status: 503 });
    }
    return Response.json(book);
  }) as typeof fetch);
  const first = load('zh');
  assert.strictEqual(load('zh'), first);
  assert.deepEqual(await first, book);
  assert.deepEqual(requested, ['/content/zh.json']);
  await assert.rejects(load('ar'), /unavailable/);
  assert.deepEqual(await load('ar'), book);
  assert.deepEqual(requested, [
    '/content/zh.json',
    '/content/ar.json',
    '/content/ar.json'
  ]);
  assert.strictEqual(load('zh'), first);
});

test('reader model boundary rejects malformed pages and broken references', () => {
  assert.throws(
    () =>
      parseReaderBook({ pages: [{ id: 'chapter.md' }], groups: [], toc: [] }),
    /Invalid/
  );
  assert.throws(
    () => parseReaderBook({ pages: [chapter, chapter], groups: [], toc: [] }),
    /Duplicate/
  );
  assert.throws(
    () =>
      parseReaderBook({
        pages: [chapter],
        groups: [{ title: 'Part', pages: ['missing.html'] }],
        toc: []
      }),
    /membership/
  );
  assert.throws(
    () =>
      parseReaderBook({
        pages: [{ ...chapter, parentId: 'missing.md' }],
        groups: [],
        toc: []
      }),
    /hierarchy/
  );
  assert.throws(
    () =>
      parseReaderBook({
        pages: [{ ...chapter, minutes: NaN }],
        groups: [],
        toc: []
      }),
    /Invalid/
  );
});

test('invalid or empty content fails visibly rather than caching an unusable edition', async () => {
  let calls = 0;
  const load = createBookLoader((async () => {
    calls++;
    return Response.json({ pages: [], groups: [], toc: [] });
  }) as typeof fetch);
  await assert.rejects(load('en'), /Invalid/);
  await assert.rejects(load('en'), /Invalid/);
  assert.equal(calls, 2);
});
