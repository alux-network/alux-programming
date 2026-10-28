// mdBook renderer that writes the book it receives (after preprocessors) to <destination>/book.json.
//
// The tests' source of truth: site.ts enables it through MDBOOK_OUTPUT for one run per edition, so
// the expected pages, titles and parts are mdBook's own, after localize.ts. mdBook sends the
// RenderContext JSON on stdin and runs the renderer with the destination as cwd.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const context = JSON.parse(readFileSync(0, 'utf8')) as { book: unknown; destination: string };
mkdirSync(context.destination, { recursive: true });
writeFileSync(path.join(context.destination, 'book.json'), JSON.stringify(context.book));
