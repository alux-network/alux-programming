// Two complete mdBook + Vite builds produce identical files, so the output depends only on the
// sources (no timestamps, random ids or file-order effects). Builds into temporary directories;
// book/html is untouched.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { build } from 'vite';

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
  for (const outDir of [first, second]) {
    await build({ configFile: path.resolve('vite.config.ts'), build: { outDir }, logLevel: 'warn' });
    assert.ok(readFileSync(path.join(outDir, 'reader.js')).length, 'reader bundle is included');
    assert.ok(readFileSync(path.join(outDir, 'forest-gateway.webp')).length, 'public assets are included');
  }
  const a = hashes(first), b = hashes(second);
  assert.deepEqual([...a.keys()], [...b.keys()], 'same files');
  assert.deepEqual([...a].filter(([file, hash]) => b.get(file) !== hash).map(([file]) => file), [], 'same contents');
});

test('a failed reader bundle leaves the previous complete site untouched', async () => {
  const outDir = path.join(work, 'previous');
  mkdirSync(outDir);
  writeFileSync(path.join(outDir, 'index.html'), 'previous complete site');
  await assert.rejects(build({
    configFile: path.resolve('vite.config.ts'),
    build: { outDir, rollupOptions: { input: path.join(work, 'missing-reader.ts') } },
    logLevel: 'silent',
  }));
  assert.deepEqual(readdirSync(outDir), ['index.html']);
  assert.equal(readFileSync(path.join(outDir, 'index.html'), 'utf8'), 'previous complete site');
});
