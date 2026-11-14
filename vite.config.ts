// Builds the site: mdBook renders every edition into book/html, then Vite adds the reader from web/
// (/world.js and /reader-style.js, which theme/head.hbs and header.hbs load on every page, and
// /reader.js, /native-ready.js and /reader.css, which they load for the magic world and the
// entrance) and public/ (/…). In dev, Vite serves them from source and rebuilds the book when its
// sources change.
import { mkdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig, normalizePath } from 'vite';
import { buildBook, replaceDirectory } from './web/mdbook.ts';

const out = resolve('book/html');
const reader = resolve('web/reader.ts');
const nativeReady = resolve('web/native-ready.ts');
const world = resolve('web/world.ts');
const readerStyle = resolve('web/reader-style.ts');
const readerCss = resolve('web/reader.css');
// Root-absolute names the pages request, each served from its web/ source.
const entries: Record<string, string> = {
  '/reader.js': reader, '/native-ready.js': nativeReady, '/world.js': world, '/reader-style.js': readerStyle,
};
const pageFlipPackage = createRequire(import.meta.url).resolve('page-flip/package.json');
const pageFlipLicense = '/*! StPageFlip\n' + await readFile(join(dirname(pageFlipPackage), 'LICENSE'), 'utf8') + '\n*/';
const bookSources = ['src', 'theme', 'book.toml', 'web/localize.ts', 'web/public-assets.ts', 'web/mdbook-assets.ts', 'web/mdbook.ts'].map((path) => normalizePath(resolve(path)));

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
    // In dev the pages' scripts and stylesheet are their web/ sources.
    resolveId(id) {
      return entries[id];
    },
    // `vite` (npm start): build the book now and again whenever a book source changes.
    async configureServer(server) {
      // A stylesheet requested by <link> bypasses resolveId in dev, so serve the source directly.
      server.middlewares.use('/reader.css', async (_, response) => {
        response.setHeader('Content-Type', 'text/css');
        response.end(await readFile(readerCss));
      });
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
  preview: { headers: { 'Cache-Control': 'no-store' } },
  server: { port: 3478, strictPort: true, watch: { ignored: [out + '/**'] } },
  build: {
    outDir: out,
    emptyOutDir: false,
    rollupOptions: {
      // world.js and reader-style.js run as classic scripts, so neither may import a shared chunk.
      input: { reader, 'native-ready': nativeReady, world, 'reader-style': readerStyle, 'reader-sheet': readerCss },
      output: {
        entryFileNames: '[name].js', banner: pageFlipLicense,
        assetFileNames: (asset) => asset.names.includes('reader-sheet.css') ? 'reader.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [mdbook()],
}));
