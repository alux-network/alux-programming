/** mdBook's wire representation. Chapter content remains preprocessed Markdown. */
export interface MdBookChapter {
  name: string;
  content: string;
  number: number[] | null;
  sub_items: MdBookItem[];
  path: string | null;
  source_path: string | null;
  parent_names: string[];
}
export type MdBookItem = 'Separator' | { PartTitle: string } | { Chapter: MdBookChapter };
export interface MdBook { sections: MdBookItem[]; __non_exhaustive?: null }
export interface MdBookExport { version: string; book: MdBook }
export function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: expected an object`);
  return value as Record<string, unknown>;
}
export function parseMdBookExport(value: unknown): MdBookExport {
  const root = record(value, 'mdBook export');
  if (typeof root.version !== 'string' || !root.version.startsWith('0.4.')) throw new Error('Expected mdBook 0.4.x output');
  const book = record(root.book, 'mdBook Book');
  const checkItems = (items: unknown): void => {
    if (!Array.isArray(items)) throw new Error('mdBook sections/sub_items must be an array');
    for (const item of items as unknown[]) {
      if (item === 'Separator') continue;
      const node = record(item, 'BookItem');
      if (typeof node.PartTitle === 'string') continue;
      const chapter = record(node.Chapter, 'Chapter');
      for (const key of ['name', 'content']) if (typeof chapter[key] !== 'string') throw new Error(`Chapter.${key} must be a string`);
      for (const key of ['path', 'source_path']) if (chapter[key] !== null && typeof chapter[key] !== 'string') throw new Error(`Chapter.${key} must be a string or null`);
      if (!Array.isArray(chapter.parent_names) || !chapter.parent_names.every(v => typeof v === 'string')) throw new Error('Chapter.parent_names must be strings');
      if (chapter.number !== null && (!Array.isArray(chapter.number) || !chapter.number.every(v => typeof v === 'number'))) throw new Error('Chapter.number must be numeric or null');
      checkItems(chapter.sub_items);
    }
  };
  checkItems(book.sections);
  return value as MdBookExport;
}
