// mdBook preprocessor: replace each chapter with `chapter.<lang>.md` when it exists.
//
// The language is `book.language`. English sources and `SUMMARY.md` stay canonical; a missing
// translation falls back to English. A translation may start with a metadata comment
// `<!-- reader: {"title": …, "parts": {…}, "sourceHash": "sha256:…"} -->`; `title` names the
// chapter, `parts` (in `index.<lang>.md`) names part titles, and `sourceHash` is the English source
// the translation was reviewed against, so a changed English chapter is reported as stale.
//
// Protocol (https://rust-lang.github.io/mdBook/for_developers/preprocessors.html): mdBook calls
// `node web/localize.ts supports <renderer>` and then `node web/localize.ts` with
// `[context, book]` JSON on stdin, and reads the changed book from stdout. Log with
// console.error only; stdout is the book. book.toml runs it before the links, admonish and katex
// preprocessors so they process the translated text.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// The parts of mdBook's book JSON this preprocessor reads or writes.
interface Chapter {
  name: string;
  content: string;
  path: string | null;
  source_path: string | null;
  sub_items: BookItem[];
}
type BookItem = { Chapter: Chapter } | { PartTitle: string } | 'Separator';
interface Context {
  root: string;
  config: { book: { language?: string; src?: string } };
}
interface Metadata {
  title?: string;
  parts?: Record<string, string>;
  sourceHash?: string;
}

// Every renderer is supported: the swap happens on Markdown, before rendering.
if (process.argv[2] === 'supports') process.exit(0);

const [context, book] = JSON.parse(readFileSync(0, 'utf8')) as [Context, { sections: BookItem[] }];
const lang = context.config.book.language ?? 'en';
const src = path.join(context.root, context.config.book.src ?? 'src');
// English part title to translated part title, from the metadata of index.<lang>.md.
let parts: Record<string, string> = {};

/** Every chapter of the book, depth first, in table-of-contents order. */
function* chapters(items: BookItem[]): Generator<Chapter> {
  for (const item of items) {
    if (typeof item === 'object' && 'Chapter' in item) {
      yield item.Chapter;
      yield* chapters(item.Chapter.sub_items);
    }
  }
}

if (lang !== 'en') {
  for (const chapter of chapters(book.sections)) {
    const source = chapter.source_path ?? chapter.path;
    if (!source) continue;
    const translated = path.join(src, source.slice(0, -3) + '.' + lang + '.md');
    if (!existsSync(translated)) continue;
    const content = readFileSync(translated, 'utf8');
    const meta = JSON.parse(content.match(/^\s*<!--\s*reader:\s*([\s\S]*?)-->/)?.[1] ?? '{}') as Metadata;
    // The hash covers the English text exactly as mdBook loaded it, with normalized line ends.
    const english = chapter.content.replace(/\r\n?/g, '\n');
    const fingerprint = 'sha256:' + createHash('sha256').update(english).digest('hex');
    if (meta.sourceHash !== fingerprint)
      console.error(`[localize] ${lang} ${source}: translation may be stale (${fingerprint})`);
    const heading = content.match(/^#\s+(.+?)(?:\s+\{#[^}]+\})?\s*$/m)?.[1];
    // The chapter keeps its English path, so every edition has the same URLs.
    chapter.content = content;
    chapter.name = meta.title || heading || chapter.name;
    if (source === 'index.md') parts = meta.parts ?? {};
  }
}
// Part titles are top-level items of the book, not chapters.
book.sections = book.sections.map((item) =>
  typeof item === 'object' && 'PartTitle' in item
    ? { PartTitle: parts[item.PartTitle] ?? item.PartTitle }
    : item
);
process.stdout.write(JSON.stringify(book));
