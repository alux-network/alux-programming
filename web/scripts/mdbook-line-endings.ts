import path from 'node:path';
import { parseMdBookExport, record } from './mdbook-model.ts';
import type { MdBook, MdBookItem } from './mdbook-model.ts';

/** mdbook-katex 0.9.4 removes LF from generated MathML but leaves CR, breaking Markdown on Windows. */
export function normalizeBookLineEndings(book: MdBook): MdBook {
  const normalize = (items: MdBookItem[]): MdBookItem[] => items.map(item => typeof item === 'object' && 'Chapter' in item
    ? { Chapter: { ...item.Chapter, content: item.Chapter.content.replace(/\r\n?/g, '\n'), sub_items: normalize(item.Chapter.sub_items) } }
    : item);
  return { ...book, sections: normalize(book.sections) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  if (process.argv[2] !== 'supports') {
    process.stdin.setEncoding('utf8'); let input = '';
    for await (const chunk of process.stdin) input += String(chunk);
    const envelope = JSON.parse(input) as unknown;
    if (!Array.isArray(envelope) || envelope.length !== 2) throw new Error('Expected mdBook preprocessor context and Book');
    const context = record(envelope[0], 'PreprocessorContext');
    const { book } = parseMdBookExport({ version: context.mdbook_version, book: envelope[1] });
    process.stdout.write(JSON.stringify(normalizeBookLineEndings(book)));
  }
}
