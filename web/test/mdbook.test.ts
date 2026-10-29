// Publication swaps completed sibling directories and restores the previous site on failure.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
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

test('backup cleanup failure reports the retained copy without rejecting publication', async (t) => {
  const out = await site('cleanup-old', 'previous complete site');
  const staged = await site('cleanup-new', 'new complete site');
  const backup = staged + '.previous';
  const remove = fs.rm;
  const failure = Object.assign(new Error('backup is locked'), { code: 'EBUSY' });
  t.mock.method(fs, 'rm', async (target: Parameters<typeof fs.rm>[0], options?: Parameters<typeof fs.rm>[1]) => {
    if (target === backup) throw failure;
    return remove(target, options);
  });
  const warning = t.mock.method(console, 'warn', () => {});
  // Named built-in imports must see the injected filesystem failure too.
  syncBuiltinESMExports();
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  });
  await replaceDirectory(staged, out);
  assert.equal(await readFile(path.join(out, 'index.html'), 'utf8'), 'new complete site');
  assert.equal(await readFile(path.join(backup, 'index.html'), 'utf8'), 'previous complete site');
  assert.equal(warning.mock.callCount(), 1);
  assert.ok(String(warning.mock.calls[0]!.arguments[0]).includes(backup), 'warning identifies recovery copy');
  assert.equal(warning.mock.calls[0]!.arguments[1], failure, 'warning includes cleanup error');
});
