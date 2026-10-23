import fs from 'node:fs/promises';
import path from 'node:path';
import { buildMdBook, projectRoot } from './mdbook.ts';
import { parseMdBookExport } from './mdbook-model.ts';
import { chaptersOf, htmlPath, transformBook } from './book-model.ts';
import { deriveTranslationManifest, headingAliases } from './translation-alignment.ts';
import type { TranslationDictionary, TranslationManifest } from '../src/book.ts';

export async function buildReaderBook(): Promise<void> {
  const output = await buildMdBook();
  const { book } = parseMdBookExport(JSON.parse(await fs.readFile(output.json, 'utf8')) as unknown);
  const rendered = new Map<string, string>();
  for (const chapter of chaptersOf(book)) { const file = htmlPath(chapter); if (file) rendered.set(file, await fs.readFile(path.join(output.html, file), 'utf8')); }
  const reader = transformBook(book, rendered);
  const localeRoot = path.join(projectRoot, 'web/locales');
  const originalManifest = JSON.parse(await fs.readFile(path.join(localeRoot, 'manifest.json'), 'utf8')) as TranslationManifest;
  const englishSource = JSON.parse(await fs.readFile(path.join(localeRoot, 'source.json'), 'utf8')) as TranslationDictionary;
  reader.translationManifest = deriveTranslationManifest(reader, originalManifest, englishSource);
  for (const alias of headingAliases(reader, originalManifest)) {
    const page = reader.pages.find(candidate => candidate.slug === alias.chapterSlug);
    if (!page || !page.headings.some(heading => heading.id === alias.nativeId)) throw new Error('Invalid heading compatibility target: ' + alias.nativeId);
    page.anchorAliases = { ...page.anchorAliases, [alias.legacyId]: alias.nativeId };
  }
  const destination = path.join(projectRoot, 'web/public');
  await fs.cp(path.join(output.html, 'assets'), path.join(destination, 'book-assets/assets'), { recursive: true });
  const contentFile = path.join(destination, 'content.json');
  const temporaryFile = contentFile + '.tmp';
  try {
    await fs.writeFile(temporaryFile, JSON.stringify(reader));
    await fs.rename(temporaryFile, contentFile);
  } finally { await fs.rm(temporaryFile, { force: true }); }
  console.log(`mdBook supplied ${reader.pages.length} chapters, ${reader.groups.length} parts and the full hierarchy to both readers.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await buildReaderBook();
