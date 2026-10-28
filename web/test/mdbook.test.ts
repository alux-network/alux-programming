// Publication swaps completed sibling directories and restores the previous site on failure.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { replaceDirectory } from '../mdbook.ts';

const work = await mkdtemp(path.join(tmpdir(), 'alux-publication-'));
after(() => rm(work, { recursive: true, force: true }));

async function site(name: string, content: string) {
  const dir = path.join(work, name);
  await mkdir(dir);
  await writeFile(path.join(dir, 'index.html'), content);
  return dir;
}

test('a completed site replaces the previous output without leaving a backup', async () => {
  const out = await site('old', 'old');
  const staged = await site('replacement', 'new');
  await replaceDirectory(staged, out);
  assert.equal(await readFile(path.join(out, 'index.html'), 'utf8'), 'new');
  assert.ok(!(await readdir(work)).includes('replacement.previous'));
});

test('an initial publication needs no previous output', async () => {
  const staged = await site('initial', 'new');
  const out = path.join(work, 'first');
  await replaceDirectory(staged, out);
  assert.equal(await readFile(path.join(out, 'index.html'), 'utf8'), 'new');
});

test('a failed replacement restores the previous output', async () => {
  const out = await site('rollback', 'previous complete site');
  await assert.rejects(replaceDirectory(path.join(work, 'missing-stage'), out));
  assert.equal(await readFile(path.join(out, 'index.html'), 'utf8'), 'previous complete site');
  assert.deepEqual(await readdir(out), ['index.html']);
});
