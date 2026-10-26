import type { BookNode, ReaderBook, ReaderPage } from './book.ts';
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
function node(value: unknown): value is BookNode {
  if (!record(value)) return false;
  if (value.kind === 'separator') return true;
  if (value.kind === 'part') return typeof value.title === 'string';
  return (
    value.kind === 'chapter' &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.children) &&
    value.children.every(node)
  );
}
function page(value: unknown): value is ReaderPage {
  if (!record(value)) return false;
  return (
    [
      'id',
      'title',
      'source',
      'group',
      'slug',
      'hash',
      'markdown',
      'html',
      'text'
    ].every((key) => typeof value[key] === 'string') &&
    typeof value.minutes === 'number' &&
    Number.isFinite(value.minutes) &&
    value.minutes > 0 &&
    (value.parentId === null || typeof value.parentId === 'string') &&
    strings(value.children) &&
    Array.isArray(value.headings) &&
    value.headings.every(
      (heading) =>
        record(heading) &&
        typeof heading.level === 'number' &&
        typeof heading.id === 'string' &&
        typeof heading.text === 'string'
    ) &&
    (value.anchorAliases === undefined ||
      (record(value.anchorAliases) &&
        Object.values(value.anchorAliases).every(
          (alias) => typeof alias === 'string'
        )))
  );
}
/** A successful HTTP response must still satisfy the shared reader boundary. */
export function parseReaderBook(value: unknown): ReaderBook {
  if (
    !record(value) ||
    !Array.isArray(value.pages) ||
    !value.pages.length ||
    !value.pages.every(page) ||
    !Array.isArray(value.groups) ||
    !Array.isArray(value.toc) ||
    !value.toc.every(node)
  )
    throw Error('Invalid localized reader model');
  const pages = value.pages,
    ids = new Set(pages.map((page) => page.id)),
    slugs = new Set(pages.map((page) => page.slug));
  if (ids.size !== pages.length || slugs.size !== pages.length)
    throw Error('Duplicate reader chapter identity');
  if (
    !value.groups.every(
      (group) =>
        record(group) &&
        typeof group.title === 'string' &&
        strings(group.pages) &&
        group.pages.every((slug) => slugs.has(slug))
    )
  )
    throw Error('Invalid reader part membership');
  if (
    !pages.every(
      (page) =>
        (page.parentId === null || ids.has(page.parentId)) &&
        page.children.every((id) => ids.has(id))
    )
  )
    throw Error('Invalid reader hierarchy');
  return value as unknown as ReaderBook;
}
