// The expected site, derived from mdBook's own book for every edition, and a verifier comparing it
// with a built site. Expectations never come from the output being checked.
//
// Sources of expectation: mdBook's book (bookOf), languages.ts and the fixed lists below. To check
// something new about the site, add it to verifySite as a problem string, and add a broken-copy
// test in site.test.ts proving it is reported.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Language } from '../languages.ts';
import { languages } from '../languages.ts';
import { mdbook } from '../mdbook.ts';

interface Chapter {
  name: string;
  path: string | null;
  sub_items: BookItem[];
}
type BookItem = { Chapter: Chapter } | { PartTitle: string } | 'Separator';

/** One HTML page an edition must contain: its path in the edition and the chapter name. */
export interface Page {
  file: string;
  title: string;
}
/** Everything expected of one language edition. */
export interface Edition {
  lang: Language;
  rtl: boolean;
  parts: string[];
  pages: Page[];
}

// Pages mdBook writes besides the chapters.
const bookPages = ['404.html', 'print.html', 'toc.html'];
// Fragments the reader handles itself instead of scrolling to an element.
const appFragments = new Set(['worlds', 'last-page']);

const renderer = fileURLToPath(new URL('./book-json.ts', import.meta.url));

/** mdBook's book for one edition, after the translation preprocessor. */
export async function bookOf(lang: Language): Promise<BookItem[]> {
  const dir = await mkdtemp(path.join(tmpdir(), 'alux-book-json-'));
  try {
    await mdbook({
      MDBOOK_BOOK__LANGUAGE: lang,
      MDBOOK_BUILD__BUILD_DIR: dir,
      MDBOOK_OUTPUT: JSON.stringify({ 'book-json': { command: `node "${renderer.replaceAll('\\', '/')}"` } }),
    });
    return JSON.parse(await readFile(path.join(dir, 'book.json'), 'utf8')).sections;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The pages and parts mdBook renders from `items`: a chapter `a/b.md` becomes `a/b.html`. */
export function editionOf(lang: Language, items: BookItem[]): Edition {
  const pages: Page[] = [];
  const parts: string[] = [];
  const visit = (list: BookItem[]) => {
    for (const item of list) {
      if (typeof item !== 'object') continue;
      if ('PartTitle' in item) parts.push(item.PartTitle);
      else {
        const { name, path: source, sub_items } = item.Chapter;
        if (source) pages.push({ file: source.replace(/\.md$/, '.html'), title: name });
        visit(sub_items);
      }
    }
  };
  visit(items);
  // mdBook also writes the first chapter as the edition's index.html.
  if (pages[0]) pages.unshift({ file: 'index.html', title: pages[0].title });
  const rtl = languages.some((l) => l.code === lang && 'rtl' in l && l.rtl);
  return { lang, rtl, parts, pages };
}

/** The expected site: one edition per language in languages.ts. */
export async function expectedSite(): Promise<Edition[]> {
  return Promise.all(languages.map(async ({ code }) => editionOf(code, await bookOf(code))));
}

/** HTML files under `dir`, relative to it, without the paths in `skip`. */
function htmlFiles(dir: string, skip: Set<string>, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const rel = prefix + name;
    if (skip.has(rel)) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full, skip, rel + '/');
    return name.endsWith('.html') ? [rel] : [];
  });
}

// The first capture group of every match of `tag`, e.g. each id or href value.
const attr = (html: string, tag: RegExp) => [...html.matchAll(tag)].map((m) => m[1]!);

/** Every problem found in the built site at `root`, compared with the expected editions. */
export function verifySite(root: string, editions: Edition[]): string[] {
  const problems: string[] = [];
  // Other editions are subdirectories of the English one, so English skips them when listing pages.
  const otherEditions = new Set(languages.map((l) => l.code).filter((c) => c !== 'en'));
  const ids = new Map<string, Set<string>>();
  const idsOf = (file: string) => {
    let found = ids.get(file);
    if (!found) {
      found = new Set(attr(readFileSync(file, 'utf8'), /\sid="([^"]+)"/g));
      ids.set(file, found);
    }
    return found;
  };

  for (const edition of editions) {
    const base = edition.lang === 'en' ? root : path.join(root, edition.lang);
    if (!existsSync(base)) {
      problems.push(`${edition.lang}: edition is missing`);
      continue;
    }
    const expected = new Map(edition.pages.map((page) => [page.file, page]));
    for (const file of bookPages) expected.set(file, { file, title: '' });
    const actual = new Set(htmlFiles(base, edition.lang === 'en' ? otherEditions : new Set()));
    for (const file of expected.keys()) if (!actual.has(file)) problems.push(`${edition.lang}: missing page ${file}`);
    for (const file of actual) if (!expected.has(file)) problems.push(`${edition.lang}: unexpected page ${file}`);

    for (const page of expected.values()) {
      const file = path.join(base, page.file);
      if (!existsSync(file)) continue;
      const html = readFileSync(file, 'utf8');
      const where = `${edition.lang}/${page.file}`;
      const open = html.match(/<html lang="([^"]*)"[^>]*dir="([^"]*)"/);
      if (open?.[1] !== edition.lang) problems.push(`${where}: lang is ${open?.[1]}, expected ${edition.lang}`);
      if (open?.[2] !== (edition.rtl ? 'rtl' : 'ltr')) problems.push(`${where}: dir is ${open?.[2]}`);
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
      if (!decode(title).startsWith(page.title)) problems.push(`${where}: title "${title}" does not name "${page.title}"`);

      // Links and assets: external URLs and bare "#" are skipped, root-absolute ones resolve against
      // the site root (public/ and /reader.js), the rest against the page.
      for (const link of attr(html, /\s(?:href|src)="([^"]+)"/g)) {
        if (/^(?:[a-z]+:|\/\/|#$)/i.test(link)) continue;
        const [target, fragment] = link.split('#') as [string, string | undefined];
        const resolved = target === ''
          ? file
          : target.startsWith('/')
            ? path.join(root, decodeURIComponent(target))
            : path.join(path.dirname(file), decodeURIComponent(target));
        if (!existsSync(resolved)) {
          problems.push(`${where}: broken link ${link}`);
          continue;
        }
        if (fragment && !appFragments.has(fragment) && resolved.endsWith('.html') && !idsOf(resolved).has(decodeURIComponent(fragment)))
          problems.push(`${where}: broken anchor ${link}`);
      }
    }
  }
  return problems;
}

/** Decodes the HTML entities mdBook writes in <title>. */
function decode(text: string) {
  return text.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
