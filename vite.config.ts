// Builds the site. mdBook renders every edition into book/html: the real world's pages and each
// edition's book as JSON for the magic world (/magic/data/<lang>.json). Vite then adds the magic
// world's React app (magic/index.html -> /magic/), /real.js (the real world's title link) and
// public/. In dev, Vite serves the app from source and book/html as it is, rebuilding the book
// when its sources change.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HtmlTagDescriptor, Plugin, ViteDevServer } from 'vite';
import { defineConfig, normalizePath } from 'vite';
import type { MagicItem } from './web/magic-book.ts';
import { languages } from './web/languages.ts';
import { buildBook, replaceDirectory } from './web/mdbook.ts';

// Sources belong to this repository; the book and its output to the working directory, which the
// dev test points at a fixture book.
const project = dirname(fileURLToPath(import.meta.url));
const out = resolve('book/html');
const magicPage = join(project, 'magic/index.html');
const real = join(project, 'web/real.ts');
const bookSources = ['src', 'theme', 'book.toml', 'web/localize.ts', 'web/public-assets.ts', 'web/mdbook-assets.ts', 'web/mdbook.ts', 'web/magic-book.ts']
  .map((path) => normalizePath(resolve(path)));
const types: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.txt': 'text/plain', '.xml': 'application/xml',
};

/** Copies the app's page to every route a visitor may open directly, so static hosting serves them. */
async function writeMagicRoutes(site: string) {
  const page = join(site, 'magic/index.html');
  for (const file of await readdir(join(site, 'magic/data'))) {
    const lang = basename(file, '.json');
    const { items } = JSON.parse(await readFile(join(site, 'magic/data', file), 'utf8')) as { items: MagicItem[] };
    // The entrance (/magic/<lang>/) and every chapter at its mdBook path.
    const routes = ['index.html', ...items.flatMap((item) => 'path' in item ? [item.path] : [])];
    for (const route of new Set(routes)) {
      const target = join(site, 'magic', lang, route);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(page, target);
    }
  }
}

/**
 * Returns mdBook's stylesheets and scripts as its built pages link them (content-hashed names),
 * root-absolute, for the magic world's page: the same CSS, code highlighting and search as the
 * book. highlight.js, elasticlunr and mark.js load with the page; mdBook's searcher binds to the
 * rendered markup, so its URL and each edition's search index are listed in #mdbook-assets.
 */
async function mdbookHead(site: string): Promise<HtmlTagDescriptor[]> {
  const page = await readFile(join(site, 'index.html'), 'utf8');
  const head = page.slice(0, page.indexOf('</head>'));
  const absolute = (url: string) => /^(?:[a-z]+:|\/)/i.test(url) ? url : '/' + url.replace(/^\.\//, '');
  const tags: HtmlTagDescriptor[] = [];
  for (const [tag] of head.matchAll(/<link rel="stylesheet"[^>]*>/g)) {
    const attrs: Record<string, string> = {};
    for (const [, name, value] of tag.matchAll(/([a-z-]+)="([^"]*)"/g)) attrs[name!] = value!;
    attrs.href = absolute(attrs.href!);
    tags.push({ tag: 'link', attrs, injectTo: 'head-prepend' });
  }
  const script = (name: string) => page.match(new RegExp(`<script[^>]* src="([^"]*${name}-[^"]*\\.js)"`))?.[1];
  for (const name of ['highlight', 'elasticlunr', 'mark']) {
    const src = script(name);
    if (src) tags.push({ tag: 'script', attrs: { src: absolute(src) }, injectTo: 'head' });
  }
  const searchIndex: Record<string, string> = {};
  for (const { code } of languages) {
    const root = code === 'en' ? '/' : `/${code}/`;
    const edition = await readFile(join(site, root, 'index.html'), 'utf8');
    const index = edition.match(/path_to_searchindex_js = "([^"]*)"/)?.[1];
    if (index) searchIndex[code] = root + index;
  }
  const searcher = script('searcher');
  tags.push({ tag: 'script', attrs: { id: 'mdbook-assets', type: 'application/json' },
    children: JSON.stringify({ searcher: searcher && absolute(searcher), searchIndex }), injectTo: 'head' });
  return tags;
}

/** Vite plugin that owns the mdBook part of the site. */
function mdbook(): Plugin {
  let serving = false;
  let destination = out;
  let staged: string | undefined;
  let written = false;
  let building: Promise<void> | null = null;
  let again = false;
  // One book build at a time; changes during a build queue a single further build.
  async function rebuild(server: ViteDevServer, initial = false) {
    if (building) return void (again = true);
    building = buildBook(out);
    try {
      await building;
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
      // The output directory may be overridden (the build test builds into temporary ones).
      destination = resolve(config.build?.outDir ?? out);
      await mkdir(dirname(destination), { recursive: true });
      staged = await mkdtemp(join(dirname(destination), `.${basename(destination)}-site-`));
      return { build: { outDir: staged } };
    },
    // The magic world's page links the book's own stylesheets and highlight.js.
    transformIndexHtml: {
      order: 'pre',
      handler: async (html, context) => context.filename.endsWith('magic/index.html') ? { html, tags: await mdbookHead(staged ?? out) } : html,
    },
    // `vite build`: the book first, then Vite bundles the app and copies public/ into it.
    async buildStart() {
      if (serving || this.meta.watchMode) return;
      await buildBook(staged!);
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
        if (written) {
          await writeMagicRoutes(staged);
          await replaceDirectory(staged, destination);
        }
      } finally {
        await rm(staged, { recursive: true, force: true });
      }
    },
    // `vite` (npm start): build the book now and again whenever a book source changes.
    async configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = decodeURIComponent(new URL(request.url ?? '/', 'http://dev').pathname);
        // mdBook's pages load the real world's script by its built name.
        if (path === '/real.js') {
          request.url = '/web/real.ts';
          return next();
        }
        // Every page of the magic world is its app; React Router reads the path.
        if (path.startsWith('/magic/') && !path.startsWith('/magic/data/') && (!extname(path) || path.endsWith('.html'))) {
          request.url = '/magic/index.html';
          return next();
        }
        // Everything else mdBook wrote is served as it is, its pages with Vite's reload client.
        let file = join(out, path);
        if (!file.startsWith(out) || !existsSync(file)) return next();
        if (statSync(file).isDirectory()) file = join(file, 'index.html');
        if (!existsSync(file)) return next();
        response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
        if (extname(file) !== '.html') return void createReadStream(file).pipe(response);
        response.end(await server.transformIndexHtml(path, await readFile(file, 'utf8')));
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

export default defineConfig({
  root: project,
  publicDir: join(project, 'public'),
  appType: 'mpa',
  // The book build rewrites book/html; the plugin reloads once it has finished instead.
  preview: { headers: { 'Cache-Control': 'no-store' } },
  // ALUX_DEV_HOST lets a container listen beyond its loopback (see .devcontainer/devcontainer.json).
  server: { host: process.env.ALUX_DEV_HOST, port: 3478, strictPort: true, watch: { ignored: [out + '/**'] } },
  build: {
    outDir: out,
    emptyOutDir: false,
    // The reader's stylesheet ships as written: the minifier merges prefixed declarations
    // (it drops backdrop-filter beside -webkit-backdrop-filter, so Chromium stops blurring).
    cssMinify: false,
    rollupOptions: {
      input: { magic: magicPage, real },
      output: {
        // real.js is a classic script at a fixed name, linked by theme/head.hbs.
        entryFileNames: (chunk) => chunk.name === 'real' ? 'real.js' : 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [mdbook()],
});
