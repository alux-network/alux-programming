// mdBook renderer for the magic world: writes the book it receives, after the preprocessors, as
// <destination>/book.json in the shape the magic app reads (MagicBook in web/magic/book.ts).
//
// mdbook.ts enables it for every edition (MDBOOK_OUTPUT__MAGIC__COMMAND) and copies the file to
// /magic/data/<lang>.json. Admonish and KaTeX run for this renderer too (book.toml), so chapter
// Markdown already holds their finished HTML. This renderer turns it into HTML with the
// conventions of mdBook's own HTML renderer, so mdBook's stylesheets and highlight.js apply to it
// unchanged: header anchors with mdBook's ids, wrapped tables, fence classes and playground blocks,
// and links to chapters as .html. KaTeX's stylesheet comes with the app instead of each chapter. mdBook sends the RenderContext JSON on stdin and runs the
// renderer with the destination as cwd.
import { mkdirSync, writeFileSync } from 'node:fs';
import { text } from 'node:stream/consumers';
import path from 'node:path';
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

interface Chapter {
  name: string;
  content: string;
  path: string | null;
  sub_items: BookItem[];
}
type BookItem = { Chapter: Chapter } | { PartTitle: string } | 'Separator';

/** One entry of the table of contents: a separator, a part title or a chapter page with its HTML. */
export type MagicItem = { separator: true } | { part: string } | { path: string; name: string; depth: number; html: string };

/** Returns mdBook's id for a heading text (utils::normalize_id). */
export function normalizeId(text: string): string {
  return [...text.trim()].flatMap((ch) => /[\p{L}\p{N}_-]/u.test(ch) ? [ch.toLowerCase()] : /\s/u.test(ch) ? ['-'] : []).join('');
}

/** Applies mdBook's HTML renderer conventions to a chapter's tree. */
function mdbookConventions() {
  return (tree: Root) => {
    const used = new Map<string, number>();
    visit(tree, 'element', (node: Element, index, parent) => {
      if (/^h[1-6]$/.test(node.tagName)) {
        // Heading attributes, "Title {#id .class}", set the id and classes as in mdBook.
        const last = node.children.at(-1);
        const attributes = last?.type === 'text' ? last.value.match(/\s*\{([^{}]*)\}\s*$/) : null;
        if (last?.type === 'text' && attributes) {
          last.value = last.value.slice(0, attributes.index);
          for (const attribute of attributes[1]!.trim().split(/\s+/)) {
            if (attribute.startsWith('#')) node.properties.id = attribute.slice(1);
            else if (attribute.startsWith('.')) node.properties.className = [...((node.properties.className as string[] | undefined) ?? []), attribute.slice(1)];
          }
        }
        // A repeated id gets mdBook's -1, -2, … suffix.
        const base = typeof node.properties.id === 'string' ? node.properties.id : normalizeId(toString(node));
        const seen = used.get(base) ?? 0;
        used.set(base, seen + 1);
        const id = seen ? `${base}-${seen}` : base;
        node.properties.id = id;
        node.children = [{ type: 'element', tagName: 'a', properties: { className: ['header'], href: '#' + id }, children: node.children }];
        return 'skip';
      }
      if (node.tagName === 'table' && parent && index !== undefined) {
        parent.children[index] = { type: 'element', tagName: 'div', properties: { className: ['table-wrapper'] }, children: [node] };
        return 'skip';
      }
      if (node.tagName === 'code' && parent && 'tagName' in parent && parent.tagName === 'pre') {
        // A fence's info string "rust,noplayground" becomes the classes language-rust noplayground;
        // Rust code mdBook could run is marked as a playground.
        const info = String((node.properties.className as string[] | undefined)?.[0] ?? '').replace(/^language-/, '');
        if (!info) return;
        const [language, ...attributes] = info.split(/[\s,]+/).filter(Boolean);
        node.properties.className = ['language-' + language, ...attributes];
        if (language !== 'rust') return;
        // Rust code passes through mdBook's hidden-line processing, which drops the final newline;
        // code it could run sits in a nested pre.playground.
        const last = node.children.at(-1);
        if (last?.type === 'text') last.value = last.value.replace(/\n$/, '');
        if (!attributes.some((a) => ['noplayground', 'ignore', 'noplaypen'].includes(a)) && index !== undefined) {
          parent.children[index] = { type: 'element', tagName: 'pre', properties: { className: ['playground'] }, children: [node] };
          return 'skip';
        }
      }
      // mdbook-katex links its stylesheet from a CDN at the start of every chapter. The app bundles
      // the same version (package.json), so the link loses its href, or KaTeX's fonts would load
      // twice; the element stays, since reader.css lays out the heading after it.
      if (node.tagName === 'link' && String(node.properties.href).includes('katex')) delete node.properties.href;
      if (node.tagName === 'a' && typeof node.properties.href === 'string' && !/^[a-z][a-z\d+.-]*:/i.test(node.properties.href)) {
        node.properties.href = node.properties.href.replace(/\.md(#|$)/, '.html$1');
      }
    });
  };
}

const toHtml = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(mdbookConventions)
  .use(rehypeStringify);

/** Renders a chapter's Markdown as mdBook's HTML renderer would. */
export function chapterHtml(markdown: string): string {
  return String(toHtml.processSync(markdown));
}

// Run as mdBook's renderer; imported (by tests) only for its functions.
if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  // Read stdin as a stream: mdBook's pipe may be non-blocking, which a synchronous read rejects.
  const context = JSON.parse(await text(process.stdin)) as {
    book: { sections: BookItem[] };
    config: { book: { title: string; language: string } };
    destination: string;
  };
  const items: MagicItem[] = [];
  const add = (list: BookItem[], depth: number) => {
    for (const item of list) {
      if (item === 'Separator') items.push({ separator: true });
      else if ('PartTitle' in item) items.push({ part: item.PartTitle });
      else {
        const { name, content, path: source, sub_items } = item.Chapter;
        // Draft chapters (no path) have no page in either world.
        if (source) items.push({ path: source.replace(/\.md$/, '.html'), name, depth, html: chapterHtml(content) });
        add(sub_items, depth + 1);
      }
    }
  };
  add(context.book.sections, 0);
  mkdirSync(context.destination, { recursive: true });
  writeFileSync(path.join(context.destination, 'book.json'),
    JSON.stringify({ title: context.config.book.title, lang: context.config.book.language, items }));
}
