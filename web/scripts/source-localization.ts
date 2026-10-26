import fs from 'node:fs/promises';
import path from 'node:path';
import type { MdBook, MdBookItem } from './mdbook-model.ts';
import { languages } from '../src/locale-routing.ts';
import type { LanguageCode } from '../src/locale-routing.ts';

export interface SourceMetadata {
  title?: string;
  parts?: Record<string, string>;
}
/** Optional source-level navigation labels; chapter prose stays ordinary Markdown. */
export function sourceMetadata(markdown: string): SourceMetadata {
  const match = markdown.match(/^\s*<!--\s*reader:\s*([\s\S]*?)-->/);
  if (!match) return {};
  const value: unknown = JSON.parse(match[1] ?? '');
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Reader source metadata must be an object');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => key !== 'title' && key !== 'parts'))
    throw Error('Unknown reader source metadata field');
  if (
    data.title !== undefined &&
    (typeof data.title !== 'string' || !data.title.trim())
  )
    throw Error('Reader source title must be nonempty');
  if (
    data.parts !== undefined &&
    (!data.parts ||
      typeof data.parts !== 'object' ||
      Array.isArray(data.parts) ||
      Object.values(data.parts).some(
        (title) => typeof title !== 'string' || !title.trim()
      ))
  )
    throw Error('Reader part titles must be nonempty strings');
  return data as SourceMetadata;
}

export function translatedSourcePath(
  canonical: string,
  locale: LanguageCode
): string {
  if (!canonical.endsWith('.md'))
    throw Error('Expected a canonical Markdown source: ' + canonical);
  return locale === 'en'
    ? canonical
    : canonical.slice(0, -3) + '.' + locale + '.md';
}

/** Receives mdBook's ordered tree; it does not discover chapters or compile Markdown. */
export async function localizeSources(
  book: MdBook,
  sourceRoot: string,
  locale: LanguageCode
): Promise<MdBook> {
  if (!languages.some((language) => language.code === locale))
    throw Error('Unsupported book language: ' + locale);
  if (locale === 'en') return book;
  const root = path.resolve(sourceRoot),
    parts: Record<string, string> = {};
  async function visit(items: MdBookItem[]): Promise<MdBookItem[]> {
    const result: MdBookItem[] = [];
    for (const item of items) {
      if (typeof item !== 'object' || !('Chapter' in item)) {
        result.push(item);
        continue;
      }
      const original = item.Chapter,
        canonical = original.source_path || original.path;
      let chapter = { ...original };
      if (canonical) {
        const filename = path.resolve(
          root,
          translatedSourcePath(canonical, locale)
        );
        if (!filename.startsWith(root + path.sep))
          throw Error(
            'Chapter source escapes the book directory: ' + canonical
          );
        try {
          const content = await fs.readFile(filename, 'utf8'),
            metadata = sourceMetadata(content);
          const firstHeading = content.match(
            /^#\s+(.+?)(?:\s+\{#[^}]+\})?\s*$/m
          )?.[1];
          chapter = {
            ...chapter,
            content,
            name: metadata.title || firstHeading || original.name
          };
          if (canonical === 'index.md' && metadata.parts)
            Object.assign(parts, metadata.parts);
        } catch (error) {
          if (!(
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ))
            throw error;
        }
      }
      chapter.sub_items = await visit(original.sub_items);
      result.push({ Chapter: chapter });
    }
    return result;
  }
  const sections = await visit(book.sections);
  function localizeParts(items: MdBookItem[]): MdBookItem[] {
    return items.map((item) =>
      typeof item === 'object' && 'PartTitle' in item
        ? { PartTitle: parts[item.PartTitle] || item.PartTitle }
        : typeof item === 'object' && 'Chapter' in item
          ? {
              Chapter: {
                ...item.Chapter,
                sub_items: localizeParts(item.Chapter.sub_items)
              }
            }
          : item
    );
  }
  return { ...book, sections: localizeParts(sections) };
}
