import path from 'node:path';
import { defineConfig } from 'vite';
import { buildReaderBook } from './scripts/book.ts';
import solid from 'vite-plugin-solid';
import { languages } from './src/locale-routing.ts';
import type { LanguageCode } from './src/locale-routing.ts';

export default defineConfig({
  server: { host: '127.0.0.1', port: 4173 },
  preview: { host: '127.0.0.1', port: 4174 },
  plugins: [
    solid(),
    {
      name: 'mdbook-content',
      configureServer(server) {
        const root = path.resolve(import.meta.dirname, '..');
        const sources = path.join(root, 'src');
        server.watcher.add([sources, path.join(root, 'book.toml')]);
        let timer: ReturnType<typeof setTimeout> | undefined;
        let queued = Promise.resolve();
        const pending = new Set<LanguageCode>();
        let rebuildAll = false;
        const rebuild = (file: string): void => {
          const changed = path.resolve(file);
          if (!(
            changed.startsWith(sources + path.sep) ||
            changed === path.join(root, 'book.toml')
          ))
            return;
          const locale = languages.find(
            (language) =>
              language.code !== 'en' &&
              changed.endsWith('.' + language.code + '.md')
          )?.code;
          if (locale) pending.add(locale);
          else rebuildAll = true;
          clearTimeout(timer);
          timer = setTimeout(() => {
            const selected = rebuildAll ? undefined : [...pending];
            pending.clear();
            rebuildAll = false;
            queued = queued.then(async () => {
              try {
                await buildReaderBook(selected);
                server.ws.send({ type: 'full-reload' });
              } catch (error) {
                server.config.logger.error(
                  error instanceof Error
                    ? error.stack || error.message
                    : String(error)
                );
              }
            });
          }, 100);
        };
        server.watcher
          .on('change', rebuild)
          .on('add', rebuild)
          .on('unlink', rebuild);
        server.httpServer?.once('close', () => {
          clearTimeout(timer);
          server.watcher
            .off('change', rebuild)
            .off('add', rebuild)
            .off('unlink', rebuild);
        });
      }
    }
  ]
});
