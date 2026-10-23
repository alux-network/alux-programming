import path from 'node:path';
import { defineConfig } from 'vite';
import { buildReaderBook } from './scripts/book.ts';

export default defineConfig({
  server: { host: '127.0.0.1', port: 4173 },
  preview: { host: '127.0.0.1', port: 4174 },
  plugins: [{
    name: 'mdbook-content',
    configureServer(server) {
      const root = path.resolve(import.meta.dirname, '..');
      const sources = path.join(root, 'src');
      server.watcher.add([sources, path.join(root, 'book.toml')]);
      let timer: ReturnType<typeof setTimeout> | undefined;
      let queued = Promise.resolve();
      const rebuild = (file: string): void => {
        const changed = path.resolve(file);
        if (!(changed.startsWith(sources + path.sep) || changed === path.join(root, 'book.toml'))) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          queued = queued.then(async () => {
            try { await buildReaderBook(); server.ws.send({ type: 'full-reload' }); }
            catch (error) { server.config.logger.error(error instanceof Error ? error.stack || error.message : String(error)); }
          });
        }, 100);
      };
      server.watcher.on('change', rebuild).on('add', rebuild).on('unlink', rebuild);
      server.httpServer?.once('close', () => { clearTimeout(timer); server.watcher.off('change', rebuild).off('add', rebuild).off('unlink', rebuild); });
    }
  }]
});
