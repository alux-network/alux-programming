import path from 'node:path';
import { parseMdBookExport, record } from './mdbook-model.ts';
import type { MdBook, MdBookItem } from './mdbook-model.ts';
import { parseHTML } from 'linkedom';

/** Protect KaTeX's TeX annotation from a second Markdown escape pass. */
export function protectMathAnnotations(book: MdBook): MdBook {
  const protect = (items: MdBookItem[]): MdBookItem[] => items.map(item => typeof item === 'object' && 'Chapter' in item
    ? { Chapter: { ...item.Chapter, content: item.Chapter.content.replace(
      /(<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>)([\s\S]*?)(<\/annotation>)/gi,
      (_match: string, open: string, tex: string, close: string) => {
        const { document } = parseHTML('<html><body><span>' + tex + '</span></body></html>');
        const decoded = document.querySelector('span')?.textContent ?? '';
        return open + Array.from(decoded, character => '&#' + character.codePointAt(0) + ';').join('') + close;
      },
    ), sub_items: protect(item.Chapter.sub_items) } }
    : item);
  return { ...book, sections: protect(book.sections) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  if (process.argv[2] !== 'supports') {
    process.stdin.setEncoding('utf8'); let input = '';
    for await (const chunk of process.stdin) input += String(chunk);
    const envelope = JSON.parse(input) as unknown;
    if (!Array.isArray(envelope) || envelope.length !== 2) throw new Error('Expected mdBook preprocessor context and Book');
    const context = record(envelope[0], 'PreprocessorContext');
    const { book } = parseMdBookExport({ version: context.mdbook_version, book: envelope[1] });
    process.stdout.write(JSON.stringify(protectMathAnnotations(book)));
  }
}
