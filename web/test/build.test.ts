// Two clean builds of every edition produce identical files, so the output depends only on the
// sources (no timestamps, random ids or file-order effects). Builds into temporary directories;
// book/html is untouched.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { buildBook } from '../mdbook.ts';

function hashes(dir: string, prefix = ''): Map<string, string> {
  const found = new Map<string, string>();
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) hashes(full, prefix + name + '/').forEach((h, f) => found.set(f, h));
    else found.set(prefix + name, createHash('sha256').update(readFileSync(full)).digest('hex'));
  }
  return found;
}

const work = mkdtempSync(path.join(tmpdir(), 'alux-determinism-'));
after(() => rmSync(work, { recursive: true, force: true }));

test('two clean builds are identical', async () => {
  const first = path.join(work, 'first'), second = path.join(work, 'second');
  await buildBook(first);
  await buildBook(second);
  const a = hashes(first), b = hashes(second);
  assert.deepEqual([...a.keys()], [...b.keys()], 'same files');
  assert.deepEqual([...a].filter(([file, hash]) => b.get(file) !== hash).map(([file]) => file), [], 'same contents');
});
