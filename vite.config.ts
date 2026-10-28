// Builds the site: mdBook renders every edition into book/html, then Vite adds the reader bundle
// (/reader.js from web/reader.ts) and public/ (/…). In dev, Vite serves the reader from source
// and rebuilds the book when its sources change.
import { resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig } from 'vite';
import { buildBook } from './web/mdbook.ts';

const out = resolve('book/html');
const reader = resolve('web/reader.ts');
const bookSources = ['src', 'theme', 'book.toml', 'web/localize.ts', 'web/mdbook.ts'].map((path) => resolve(path));

/** Vite plugin that owns the mdBook part of the site. */
function mdbook(): Plugin {
  let building: Promise<void> | null = null;
  let again = false;
  // One book build at a time; changes during a build queue a single further build.
  async function rebuild(server: ViteDevServer) {
    if (building) return void (again = true);
    building = buildBook().then(
      () => {
        // book/html is not watched, so cached transforms of its files (theme CSS) are stale now.
        server.moduleGraph.invalidateAll();
        server.ws.send({ type: 'full-reload' });
      },
      (error: Error) => server.config.logger.error(error.message),
    );
    await building;
    building = null;
    if (again) {
      again = false;
      await rebuild(server);
    }
  }
  return {
    name: 'mdbook',
    // `vite build`: the book first, then Vite bundles the reader and copies public/ into it.
    async buildStart() {
      if (this.meta.watchMode) return;
      await buildBook();
    },
    // The pages load /reader.js; in dev that is the TypeScript source.
    resolveId(id) {
      if (id === '/reader.js') return reader;
    },
    // `vite` (npm start): build the book now and again whenever a book source changes.
    configureServer(server) {
      server.watcher.add(bookSources);
      server.watcher.on('all', (_, file) => {
        if (bookSources.some((source) => file === source || file.startsWith(source + '/'))) void rebuild(server);
      });
      void rebuild(server);
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
