// The magic world's book: one edition's chapters as mdBook's pipeline produced them
// (magic-book.ts), loaded from /magic/data/<lang>.json, and its reading order.
import type { MagicItem } from '../magic-book.ts';
import type { Language } from '../languages.ts';

export interface MagicBook {
  title: string;
  lang: Language;
  items: MagicItem[];
}
export type Chapter = Extract<MagicItem, { path: string }>;

const books = new Map<Language, Promise<MagicBook>>();

/** Fetches an edition's book once per visit. */
export function loadBook(lang: Language): Promise<MagicBook> {
  let book = books.get(lang);
  if (!book) {
    book = fetch(`/magic/data/${lang}.json`).then((response) => {
      if (!response.ok) throw new Error(`book ${lang}: ${response.status}`);
      return response.json() as Promise<MagicBook>;
    });
    book.catch(() => books.delete(lang));
    books.set(lang, book);
  }
  return book;
}

/** Returns the book's chapters in reading order. */
export function chaptersOf(book: MagicBook): Chapter[] {
  return book.items.filter((item): item is Chapter => 'path' in item);
}

/** Returns the part title a chapter belongs to, as the table of contents lists it. */
export function partOf(book: MagicBook, path: string): string | undefined {
  let part: string | undefined;
  for (const item of book.items) {
    if ('part' in item) part = item.part;
    else if ('path' in item && item.path === path) return part;
  }
  return undefined;
}
