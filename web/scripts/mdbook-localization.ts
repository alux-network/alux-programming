import path from 'node:path';
import { record, parseMdBookExport } from './mdbook-model.ts';
import { localizeSources } from './source-localization.ts';
import { normalizeLanguage } from '../src/locale-routing.ts';

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  if (process.argv[2] === 'supports')
    process.exit(
      ['html', 'reader-json'].includes(process.argv[3] || '') ? 0 : 1
    );
  process.stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of process.stdin) input += String(chunk);
  const envelope: unknown = JSON.parse(input);
  if (!Array.isArray(envelope) || envelope.length !== 2)
    throw Error('Expected mdBook preprocessor context and Book');
  const context = record(envelope[0], 'PreprocessorContext'),
    config = record(context.config, 'mdBook configuration'),
    settings = record(config.book, 'book configuration');
  const locale = normalizeLanguage(settings.language);
  if (!locale) throw Error('Unsupported mdBook language');
  if (typeof settings.src !== 'string')
    throw Error('Missing book source directory');
  const { book } = parseMdBookExport({
    version: context.mdbook_version,
    book: envelope[1]
  });
  process.stdout.write(
    JSON.stringify(
      await localizeSources(
        book,
        path.resolve(String(context.root), settings.src),
        locale
      )
    )
  );
}
