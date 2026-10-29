// HTML-only mdBook preprocessor, after admonish and katex have expanded their fenced content.
// Receives [context, book] on stdin and emits that same book with public image paths normalized.
// Canonical Markdown, localization and other renderers are unaffected.
import { readFileSync } from 'node:fs';
import { chapterAssets } from './public-assets.ts';

interface Chapter { content: string; path: string | null; sub_items: BookItem[] }
type BookItem = { Chapter: Chapter } | { PartTitle: string } | 'Separator';
interface Context { config: { book: { language?: string } } }

if (process.argv[2] === 'supports') process.exit(process.argv[3] === 'html' ? 0 : 1);
const [context, book] = JSON.parse(readFileSync(0, 'utf8')) as [Context, { sections: BookItem[] }];

/** Normalizes each chapter in mdBook's existing tree without constructing a second book model. */
function normalize(items: BookItem[]): void {
  for (const item of items) {
    if (typeof item !== 'object' || !('Chapter' in item)) continue;
    const chapter = item.Chapter;
    if (chapter.path) chapter.content = chapterAssets(chapter.content, chapter.path, context.config.book.language ?? 'en');
    normalize(chapter.sub_items);
  }
}
normalize(book.sections);
process.stdout.write(JSON.stringify(book));
