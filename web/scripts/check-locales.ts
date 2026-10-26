import fs from 'node:fs/promises';
import path from 'node:path';
import { languages } from '../src/locale-routing.ts';
import type { ReaderBook } from '../src/book.ts';
import { validateReaderEdition, validateMessages } from './book-validation.ts';
const web = path.resolve(import.meta.dirname, '..');
const load = async (locale: string): Promise<ReaderBook> =>
  JSON.parse(
    await fs.readFile(
      path.join(web, 'public/content', locale + '.json'),
      'utf8'
    )
  ) as ReaderBook;
const canonical = await load('en');
for (const { code } of languages) {
  const messages: unknown = JSON.parse(
    await fs.readFile(path.join(web, 'locales/ui', code + '.json'), 'utf8')
  );
  validateMessages(messages, code);
  const book = await load(code);
  validateReaderEdition(book, canonical, code);
  console.log(
    code +
      ': ' +
      book.pages.length +
      ' chapters with canonical identities, protected technical content and ' +
      Object.keys(messages).length +
      ' UI messages.'
  );
}
