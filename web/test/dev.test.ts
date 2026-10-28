// A minimal native mdBook fixture checks Vite startup and real watched edits without touching src/.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { test } from 'node:test';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

const project = process.cwd();
test('dev startup completes the book before serving and watched edits rebuild it', async () => {
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
    await writeFile(chapter, '# Fixture\n\nUpdated fixture content.\n');
    const deadline = Date.now() + 15_000;
    let updated = '';
    while (Date.now() < deadline) {
      updated = await (await fetch(base + 'index.html')).text();
      if (updated.includes('Updated fixture content')) break;
      await setTimeout(100);
    }
    assert.match(updated, /Updated fixture content/, 'real filesystem changes trigger a rebuild');
  } finally {
    await server?.close();
    process.chdir(project);
    await rm(fixture, { recursive: true, force: true });
  }
});
