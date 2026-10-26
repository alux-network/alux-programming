import { createHash } from 'node:crypto';
import type {
  BookGroup,
  BookNode,
  ReaderBook,
  ReaderPage
} from '../src/book.ts';
import type { MdBook, MdBookChapter, MdBookItem } from './mdbook-model.ts';
import { presentChapter } from './reader-presentation.ts';
import { sourceMetadata } from './source-localization.ts';
import { englishMessages } from '../src/ui-messages.ts';
import type { UIMessages } from '../src/ui-messages.ts';

export function htmlPath(chapter: MdBookChapter): string | null {
  return chapter.path?.replace(/\.md$/, '.html') || null;
}
export function readerSlug(chapter: MdBookChapter): string | null {
  return (chapter.source_path || chapter.path) === 'index.md'
    ? 'introduction.html'
    : htmlPath(chapter);
}
export function chaptersOf(book: MdBook): MdBookChapter[] {
  const chapters: MdBookChapter[] = [];
  const visit = (items: MdBookItem[]): void => {
    for (const item of items)
      if (typeof item === 'object' && 'Chapter' in item) {
        chapters.push(item.Chapter);
        visit(item.Chapter.sub_items);
      }
  };
  visit(book.sections);
  return chapters;
}

/** Structure comes exclusively from the processed Book; rendered fragments come from mdBook HTML. */
export function transformBook(
  book: MdBook,
  rendered: ReadonlyMap<string, string>,
  messages: UIMessages = englishMessages
): ReaderBook {
  const chapters = chaptersOf(book);
  const welcome =
    sourceMetadata(
      chapters.find((chapter) => chapter.source_path === 'index.md')?.content ||
        ''
    ).parts?.Welcome || 'Welcome';
  const routes = new Map<string, string>();
  for (const chapter of chapters) {
    const native = htmlPath(chapter),
      slug = readerSlug(chapter);
    if (native && slug) {
      if (routes.has(native))
        throw new Error('Duplicate mdBook chapter path: ' + native);
      routes.set(native, slug);
    }
  }
  const pages: ReaderPage[] = [],
    groups: BookGroup[] = [];
  let group: BookGroup | null = null;
  const visit = (
    items: MdBookItem[],
    parentId: string | null = null
  ): BookNode[] => {
    const nodes: BookNode[] = [];
    for (const item of items) {
      if (item === 'Separator') {
        nodes.push({ kind: 'separator' });
        continue;
      }
      if ('PartTitle' in item) {
        group = { title: item.PartTitle, pages: [] };
        groups.push(group);
        nodes.push({ kind: 'part', title: item.PartTitle });
        continue;
      }
      const chapter = item.Chapter,
        native = htmlPath(chapter),
        slug = readerSlug(chapter);
      const id = chapter.source_path || chapter.path;
      if (!native || !slug || !id) {
        nodes.push(...visit(chapter.sub_items, parentId));
        continue;
      }
      const html = rendered.get(native);
      if (html === undefined)
        throw new Error('Missing mdBook HTML for ' + native);
      const presentation = presentChapter(html, native, routes, messages);
      const page: ReaderPage = {
        id,
        title: chapter.name,
        source: chapter.source_path || chapter.path || '',
        group: group?.title || welcome,
        slug,
        hash: createHash('sha256').update(chapter.content).digest('hex'),
        markdown: chapter.content,
        ...presentation,
        minutes: Math.max(
          1,
          Math.ceil(presentation.text.split(/\s+/).length / 220)
        ),
        parentId,
        children: []
      };
      pages.push(page);
      group?.pages.push(slug);
      const children = visit(chapter.sub_items, id);
      page.children = children
        .filter(
          (node): node is Extract<BookNode, { kind: 'chapter' }> =>
            node.kind === 'chapter'
        )
        .map((node) => node.id);
      nodes.push({ kind: 'chapter', id, title: chapter.name, children });
    }
    return nodes;
  };
  const toc = visit(book.sections);
  return { pages, groups, toc };
}
