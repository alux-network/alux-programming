import fs from 'node:fs/promises';
import path from 'node:path';
import { buildMdBook, projectRoot } from './mdbook.ts';
import { parseMdBookExport } from './mdbook-model.ts';
import { chaptersOf, htmlPath, transformBook } from './book-model.ts';
import { addHeadingAliases } from './heading-aliases.ts';
import { languages } from '../src/locale-routing.ts';
import type { LanguageCode } from '../src/locale-routing.ts';
import type { MessageKey } from '../src/ui-messages.ts';
import type { ReaderBook } from '../src/book.ts';
import { validateReaderEdition, validateMessages } from './book-validation.ts';
import {sourceMetadata,translatedSourcePath} from './source-localization.ts';

export async function compileReaderBook(
  locale: LanguageCode
): Promise<{ reader: ReaderBook; assets: string }> {
  const output = await buildMdBook(locale);
  const { book } = parseMdBookExport(
    JSON.parse(await fs.readFile(output.json, 'utf8')) as unknown
  );
  const rendered = new Map<string, string>();
  for (const chapter of chaptersOf(book)) {
    const file = htmlPath(chapter);
    if (file)
      rendered.set(
        file,
        await fs.readFile(path.join(output.html, file), 'utf8')
      );
  }
  const messages: unknown = JSON.parse(
    await fs.readFile(
      path.join(projectRoot, 'web/locales/ui', locale + '.json'),
      'utf8'
    )
  );
  validateMessages(messages, locale);
  const reader = transformBook(book, rendered, messages);
  // A failed mdBook support probe can otherwise silently yield English chapters
  // alongside localized UI. Check the selected source's identity before publishing.
  if(locale!=='en')for(const page of reader.pages){
    const filename=path.join(projectRoot,'src',translatedSourcePath(page.source,locale));
    let source:string;
    try{source=await fs.readFile(filename,'utf8');}catch(error){if(error instanceof Error&&'code'in error&&error.code==='ENOENT')continue;throw error;}
    const metadata=sourceMetadata(source);
    if(metadata.title&&page.title!==metadata.title)throw Error(`${locale} ${page.source}: mdBook did not select the translated source`);
  }
  addHeadingAliases(reader);
  if (locale === 'en') {
    const displayTitle = (title: string): string =>
      Object.hasOwn(messages, title) ? messages[title as MessageKey] : title;
    for (const page of reader.pages) page.title = displayTitle(page.title);
    const visit = (nodes: ReaderBook['toc']): void => {
      for (const node of nodes)
        if (node.kind === 'chapter') {
          node.title = displayTitle(node.title);
          visit(node.children);
        }
    };
    visit(reader.toc);
  }
  return { reader, assets: path.join(output.html, 'assets') };
}

/** Finish compiling every requested locale before publishing reader data. */
export async function buildReaderBook(
  locales: readonly LanguageCode[] = languages.map((language) => language.code)
): Promise<void> {
  const results = new Map<
    LanguageCode,
    Awaited<ReturnType<typeof compileReaderBook>>
  >();
  for (const locale of locales)
    results.set(locale, await compileReaderBook(locale));
  const destination = path.join(projectRoot, 'web/public');
  // Keep the existing edition-independent estimates; whitespace counts are not comparable across scripts.
  const canonical =
    results.get('en')?.reader ||
    (JSON.parse(
      await fs.readFile(path.join(destination, 'content/en.json'), 'utf8')
    ) as ReaderBook);
  for (const [locale, { reader }] of results) {
    if (
      reader.pages.length !== canonical.pages.length ||
      reader.pages.some(
        (page, index) =>
          page.id !== canonical.pages[index]?.id ||
          page.slug !== canonical.pages[index]?.slug
      )
    )
      throw Error(
        'Localized chapter identity/order differs from canonical book'
      );
    for (const [index, page] of reader.pages.entries())
      page.minutes = canonical.pages[index]?.minutes || page.minutes;
    validateReaderEdition(reader, canonical, locale);
  }
  await fs.mkdir(path.join(destination, 'content'), { recursive: true });
  const pending: Array<{ temporary: string; filename: string }> = [];
  try {
    for (const [locale, { reader, assets }] of results) {
      const filename = path.join(destination, 'content', locale + '.json'),
        temporary = filename + '.tmp';
      pending.push({ temporary, filename });
      await fs.writeFile(temporary, JSON.stringify(reader));
      if (locale === 'en') {
        const legacy = path.join(destination, 'content.json');
        pending.push({ temporary: legacy + '.tmp', filename: legacy });
        await fs.writeFile(legacy + '.tmp', JSON.stringify(reader));
        await fs.cp(assets, path.join(destination, 'book-assets/assets'), {
          recursive: true
        });
      }
    }
    for (const { temporary, filename } of pending)
      await fs.rename(temporary, filename);
  } finally {
    await Promise.all(
      pending.map(({ temporary }) => fs.rm(temporary, { force: true }))
    );
  }
  console.log(
    `mdBook supplied ${results.size} localized reader models (${results.values().next().value?.reader.pages.length || 0} chapters each).`
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  await buildReaderBook();
