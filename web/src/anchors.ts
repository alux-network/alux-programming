import type { ReaderPage } from './book.ts';

/** Old reader links keep working while new links use mdBook's canonical IDs. */
export function resolveAnchor(page: ReaderPage, fragment: string): string {
  const id = decodeURIComponent(fragment);
  return page.anchorAliases?.[id] ?? id;
}
