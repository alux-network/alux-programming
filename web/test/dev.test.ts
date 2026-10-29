// A minimal native mdBook fixture checks Vite startup and real watched edits without touching src/.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { test } from 'node:test';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

const project = process.cwd();
test('dev startup waits for the book and watched edits reload despite failed backup cleanup', async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'alux-dev-'));
  let server: ViteDevServer | undefined;
  try {
    await mkdir(path.join(fixture, 'src'));
    await mkdir(path.join(fixture, 'web'));
    await writeFile(path.join(fixture, 'book.toml'), '[book]\ntitle = "Fixture"\nsrc = "src"\n[output.html]\n[output.linkcheck]\n');
    await writeFile(path.join(fixture, 'src/SUMMARY.md'), '# Summary\n\n[Fixture](index.md)\n');
    const chapter = path.join(fixture, 'src/index.md');
    await writeFile(chapter, '# Fixture\n\nInitial fixture content.\n');
    await writeFile(path.join(fixture, 'web/reader.ts'), 'export {};');
    process.chdir(fixture);
    server = await createServer({
      configFile: path.join(project, 'vite.config.ts'),
      server: { host: '127.0.0.1', port: 0, strictPort: false, open: false }, logLevel: 'silent',
    });
    assert.ok(existsSync(path.join(fixture, 'book/html/ar/index.html')), 'all editions exist before listen');
    await server.listen();
    const base = server.resolvedUrls!.local[0]!;
    const response = await fetch(base + 'index.html');
    assert.equal(response.status, 200, 'first request succeeds');
    assert.match(await response.text(), /Initial fixture content/);
    const invalidation = t.mock.method(server.moduleGraph, 'invalidateAll');
    const reload = t.mock.method(server.ws, 'send');
    const remove = fs.rm;
    let retained = '';
    t.mock.method(fs, 'rm', async (target: Parameters<typeof fs.rm>[0], options?: Parameters<typeof fs.rm>[1]) => {
      if (String(target).startsWith(fixture) && String(target).endsWith('.previous')) {
        retained = String(target);
        throw Object.assign(new Error('backup is locked'), { code: 'EBUSY' });
      }
      return remove(target, options);
    });
    const warning = t.mock.method(console, 'warn', () => {});
    syncBuiltinESMExports();
    t.after(() => {
      t.mock.restoreAll();
      syncBuiltinESMExports();
    });
    await writeFile(chapter, '# Fixture\n\nUpdated fixture content.\n');
    const deadline = Date.now() + 15_000;
    let updated = '';
    while (Date.now() < deadline) {
      updated = await (await fetch(base + 'index.html')).text();
      if (updated.includes('Updated fixture content') && reload.mock.callCount() > 0) break;
      await setTimeout(100);
    }
    assert.match(updated, /Updated fixture content/, 'real filesystem changes trigger a rebuild');
    assert.ok(retained, 'the injected backup-cleanup failure was exercised');
    assert.ok(warning.mock.callCount() > 0, 'retained backup is reported');
    assert.ok(existsSync(retained), 'the failed cleanup leaves the backup available');
    assert.ok(invalidation.mock.callCount() > 0, 'published files invalidate cached transforms');
    const messages: unknown[] = reload.mock.calls.map((call) => call.arguments[0]);
    assert.ok(messages.some((message) => typeof message === 'object' && message !== null && 'type' in message && message.type === 'full-reload'), 'successful publication still reloads the browser');
  } finally {
    await server?.close();
    process.chdir(project);
    await rm(fixture, { recursive: true, force: true });
  }
});
