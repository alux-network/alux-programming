// Builds the site: mdBook renders every edition into book/html, then Vite adds the reader bundle
// (/reader.js from web/reader.ts) and public/ (/…). In dev, Vite serves the reader from source
// and rebuilds the book when its sources change.
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig, normalizePath } from 'vite';
import { buildBook, replaceDirectory } from './web/mdbook.ts';

const out = resolve('book/html');
const reader = resolve('web/reader.ts');
const bookSources = ['src', 'theme', 'book.toml', 'web/localize.ts', 'web/public-assets.ts', 'web/mdbook.ts'].map((path) => normalizePath(resolve(path)));

/** Vite plugin that owns the mdBook part of the site. */
function mdbook(): Plugin {
  let destination = out;
  let serving = false;
  let staged: string | undefined;
  let written = false;
  let building: Promise<void> | null = null;
  let again = false;
  // One book build at a time; changes during a build queue a single further build.
  async function rebuild(server: ViteDevServer, initial = false) {
    if (building) return void (again = true);
    building = buildBook(destination);
    try {
      await building;
      // The output is not watched, so cached transforms of its files are stale now.
      server.moduleGraph.invalidateAll();
      server.ws.send({ type: 'full-reload' });
    } catch (error) {
      if (initial) throw error;
      server.config.logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      building = null;
    }
    if (again) {
      again = false;
      await rebuild(server, initial);
    }
  }
  return {
    name: 'mdbook',
    async config(config, { command }) {
      serving = command === 'serve';
      if (serving) return;
      destination = resolve(config.root ?? '.', config.build?.outDir ?? out);
      await mkdir(dirname(destination), { recursive: true });
      staged = await mkdtemp(join(dirname(destination), `.${basename(destination)}-site-`));
      return { build: { outDir: staged } };
    },
    configResolved(config) {
      if (config.command === 'serve') destination = config.root;
    },
    // `vite build`: the book first, then Vite bundles the reader and copies public/ into it.
    async buildStart() {
      if (serving || this.meta.watchMode) return;
      await buildBook(staged ?? destination);
    },
    // Publish only after both the book and Vite's bundle/public files have finished.
    writeBundle() {
      written = true;
    },
    async buildEnd(error) {
      if (error && staged) await rm(staged, { recursive: true, force: true });
    },
    async closeBundle() {
      if (!staged) return;
      try {
        if (written) await replaceDirectory(staged, destination);
      } finally {
        await rm(staged, { recursive: true, force: true });
      }
    },
    // The pages load /reader.js; in dev that is the TypeScript source.
    resolveId(id) {
      if (id === '/reader.js') return reader;
    },
    // `vite` (npm start): build the book now and again whenever a book source changes.
    async configureServer(server) {
      server.watcher.add(bookSources);
      server.watcher.on('all', (_, file) => {
        file = normalizePath(file);
        if (bookSources.some((source) => file === source || file.startsWith(source + '/'))) void rebuild(server);
      });
      await rebuild(server, true);
    },
  };
}

export default defineConfig(({ command }) => ({
  // Dev serves the built site; the production build only reads web/ and public/.
  root: command === 'serve' ? out : process.cwd(),
  publicDir: resolve('public'),
  appType: 'mpa',
  // The book build rewrites book/html; the plugin reloads once it has finished instead.
  server: { port: 3478, strictPort: true, watch: { ignored: [out + '/**'] } },
  build: {
    outDir: out,
    emptyOutDir: false,
    rollupOptions: {
      input: reader,
      output: { entryFileNames: 'reader.js' },
    },
  },
  plugins: [mdbook()],
}));
