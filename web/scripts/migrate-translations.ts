/** One-time reverse conversion of a frozen reader snapshot; never used to compile a book. */
import fs from 'node:fs/promises';
import path from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { parseHTML } from 'linkedom';
import { projectRoot } from './mdbook.ts';
import { readingArt } from './reader-presentation.ts';
import { languages } from '../src/locale-routing.ts';
import type { ReaderBook, ReaderPage } from '../src/book.ts';
import type { SourceMetadata } from './source-localization.ts';

interface CodeFence {
  info: string;
  code: string;
}
function codeFences(markdown: string): CodeFence[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n'),
    blocks: CodeFence[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i]?.match(/^([ \t]*)(`{3,}|~{3,})([^\n]*)$/);
    if (!open) continue;
    const indent = open[1] || '',
      marker = open[2] || '```',
      info = (open[3] || '').trim(),
      body: string[] = [];
    let end = i + 1;
    for (; end < lines.length; end++) {
      const line = lines[end] || '';
      if (
        new RegExp('^\\s*' + marker[0] + '{' + marker.length + ',}\\s*$').test(
          line
        )
      )
        break;
      body.push(line.startsWith(indent) ? line.slice(indent.length) : line);
    }
    if (end === lines.length)
      throw Error('Unterminated canonical source fence');
    if (info.startsWith('admonish'))
      blocks.push(...codeFences(body.join('\n')));
    else blocks.push({ info, code: body.join('\n') });
    i = end;
  }
  return blocks;
}

function cleanMigrationAttributes(node: HTMLElement): void {
  for (const element of node.querySelectorAll(
    '[data-source-code],[data-source-tex]'
  )) {
    element.removeAttribute('data-source-code');
    element.removeAttribute('data-source-tex');
  }
}

export function markdownFromSnapshot(
  page: ReaderPage,
  canonicalMarkdown: string,
  english: ReaderBook,
  localized: ReaderBook
): string {
  const blocks = codeFences(canonicalMarkdown),
    seenCodes = new Set<number>();
  const document = parseHTML(
    '<html><body><article>' + page.html + '</article></body></html>'
  ).document as unknown as Document;
  const article = document.querySelector('article');
  if (!article) throw Error('Missing snapshot article');
  article
    .querySelectorAll('.heading-anchor,.code-toolbar,.video-clip-range')
    .forEach((node) => node.remove());
  const codes = [...article.querySelectorAll('pre code')];
  if (codes.length !== blocks.length)
    throw Error(
      page.slug + ': snapshot code count differs from canonical source'
    );
  for (const [i, code] of codes.entries()) {
    if (blocks[i]?.code !== code.textContent?.replace(/\n$/, ''))
      throw Error(page.slug + ': canonical code differs at block ' + i);
    code.parentElement?.setAttribute('data-source-code', String(i));
  }
  const texSources: string[] = [];
  for (const math of article.querySelectorAll(
    '.math-display,.katex-display,.katex'
  ))
    if (!math.parentElement?.closest('.math-display,.katex-display,.katex')) {
      const tex = math.querySelector(
        'annotation[encoding="application/x-tex"]'
      )?.textContent;
      if (tex === null || tex === undefined)
        throw Error(page.slug + ': missing protected TeX');
      math.setAttribute('data-source-tex', String(texSources.push(tex) - 1));
    }
  const relative = (target: string): string =>
    path.posix.relative(path.posix.dirname(page.source), target) ||
    path.posix.basename(target);
  const originalArt = new Map(
    Object.entries(readingArt).map(([source, runtime]) => [runtime, source])
  );
  for (const image of article.querySelectorAll('img[src]')) {
    const src = image.getAttribute('src') || '',
      original = originalArt.get(src);
    if (original) image.setAttribute('src', relative(original));
    else if (src.startsWith('/book-assets/'))
      image.setAttribute('src', relative(src.slice(13)));
  }
  for (const anchor of article.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') || '';
    if (!href.startsWith('/')) continue;
    const url = new URL(href, 'https://book.invalid'),
      target = english.pages.find(
        (candidate) => '/' + candidate.slug === url.pathname
      );
    if (target)
      anchor.setAttribute(
        'href',
        relative(target.source) + url.search + url.hash
      );
  }
  const converter = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '*',
    emDelimiter: '*',
    strongDelimiter: '**'
  });
  converter.use(gfm);
  converter.addRule('canonical-heading', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (content, node) =>
      '\n\n' +
      '#'.repeat(Number(node.nodeName.slice(1))) +
      ' ' +
      content.trim() +
      (node.id ? ' {#' + node.id + '}' : '') +
      '\n\n'
  });
  converter.addRule('canonical-code', {
    filter: (node) =>
      node.nodeName === 'PRE' && node.hasAttribute('data-source-code'),
    replacement: (_content, node) => {
      const i = Number(node.getAttribute('data-source-code')),
        source = blocks[i];
      if (!source) throw Error(page.slug + ': invalid code identity');
      seenCodes.add(i);
      const fence = '`'.repeat(
        Math.max(
          3,
          ...[...source.code.matchAll(/`+/g)].map(
            (match) => match[0].length + 1
          )
        )
      );
      return (
        '\n\n' +
        fence +
        source.info +
        '\n' +
        source.code +
        '\n' +
        fence +
        '\n\n'
      );
    }
  });
  const texFor = (node: HTMLElement): string => {
    const index = node.getAttribute('data-source-tex'),
      tex = index === null ? undefined : texSources[Number(index)];
    if (tex === undefined) throw Error(page.slug + ': missing math identity');
    return tex;
  };
  converter.addRule('display-math', {
    filter: (node) =>
      node.classList.contains('math-display') ||
      node.classList.contains('katex-display'),
    replacement: (_content, node) =>
      node.hasAttribute('data-source-tex')
        ? '\n\n$$' + texFor(node) + '$$\n\n'
        : ''
  });
  converter.addRule('inline-math', {
    filter: (node) =>
      node.classList.contains('katex') &&
      !node.closest('.katex-display,.math-display'),
    replacement: (_content, node) => '$' + texFor(node) + '$'
  });
  converter.addRule('punctuation-emphasis', {
    filter: ['strong', 'b', 'em', 'i'],
    replacement: (content, node) => {
      const first = content[0] || '',
        last = content.at(-1) || '',
        prev = node.previousSibling?.textContent?.at(-1) || ' ',
        next = node.nextSibling?.textContent?.[0] || ' ';
      const punct = (character: string): boolean =>
          /[\p{P}\p{S}]/u.test(character),
        space = (character: string): boolean => /\s/u.test(character);
      const tag = ['STRONG', 'B'].includes(node.nodeName) ? 'strong' : 'em',
        marker = tag === 'strong' ? '**' : '*';
      // CommonMark cannot close punctuation-adjacent emphasis against a word. Keep inline HTML rather than inserting prose spaces.
      return (punct(first) && !space(prev) && !punct(prev)) ||
        (punct(last) && !space(next) && !punct(next))
        ? '<' + tag + '>' + content + '</' + tag + '>'
        : marker + content + marker;
    }
  });
  converter.addRule('admonition', {
    filter: (node) => node.classList.contains('admonition'),
    replacement: (_content, node) => {
      const clone = node.cloneNode(true) as HTMLElement,
        title = clone.querySelector('.admonition-title'),
        label = title?.textContent || 'note';
      title?.remove();
      const kind =
          node.className.split(/\s+/).find((name) => name !== 'admonition') ||
          'note',
        body = converter.turndown(clone.innerHTML);
      const fence = '`'.repeat(
        Math.max(
          3,
          ...[...body.matchAll(/^`+/gm)].map((match) => match[0].length + 1)
        )
      );
      return (
        '\n\n' +
        fence +
        'admonish ' +
        kind +
        ' title=' +
        JSON.stringify(label) +
        '\n' +
        body +
        '\n' +
        fence +
        '\n\n'
      );
    }
  });
  converter.addRule('raw-media', {
    filter: (node) =>
      ['IFRAME', 'FIGURE', 'SUMMARY'].includes(node.nodeName) ||
      (node.nodeName === 'IMG' && node.hasAttribute('style')),
    replacement: (_content, node) => {
      const clone = node.cloneNode(true) as HTMLElement;
      cleanMigrationAttributes(clone);
      return node.nodeName === 'IMG'
        ? clone.outerHTML
        : '\n\n' + clone.outerHTML + '\n\n';
    }
  });
  converter.addRule('details', {
    filter: ['details'],
    replacement: (_content, node) => {
      const clone = node.cloneNode(true) as HTMLElement,
        summary = clone.querySelector('summary');
      summary?.remove();
      if (summary) cleanMigrationAttributes(summary as HTMLElement);
      return (
        '\n\n<details>\n' +
        (summary?.outerHTML || '') +
        '\n\n' +
        converter.turndown(clone.innerHTML) +
        '\n\n</details>\n\n'
      );
    }
  });
  const body = converter.turndown(article.innerHTML);
  if (seenCodes.size !== blocks.length)
    throw Error(page.slug + ': omitted code block');
  const metadata: SourceMetadata = { title: page.title };
  if (page.source === 'index.md')
    metadata.parts = Object.fromEntries([
      ['Welcome', page.group],
      ...english.groups.map((group, i) => [
        group.title,
        localized.groups[i]?.title || group.title
      ])
    ]);
  return '<!-- reader: ' + JSON.stringify(metadata) + ' -->\n\n' + body + '\n';
}

export async function migrateTranslations(
  baselineDirectory: string,
  destination: string,
  replace = false
): Promise<number> {
  const english = JSON.parse(
    await fs.readFile(path.join(baselineDirectory, 'baseline-en.json'), 'utf8')
  ) as ReaderBook;
  const pending: Array<{ filename: string; markdown: string }> = [],
    root = path.resolve(destination);
  for (const { code } of languages) {
    if (code === 'en') continue;
    const localized = JSON.parse(
      await fs.readFile(
        path.join(baselineDirectory, `baseline-${code}.json`),
        'utf8'
      )
    ) as ReaderBook;
    if (
      localized.pages.length !== english.pages.length ||
      localized.pages.some(
        (page, i) =>
          page.id !== english.pages[i]?.id ||
          page.source !== english.pages[i]?.source
      )
    )
      throw Error(code + ': baseline chapter identity/order differs');
    for (const page of localized.pages) {
      const filename = path.resolve(
        root,
        page.source.replace(/\.md$/, '.' + code + '.md')
      );
      if (!page.source.endsWith('.md') || !filename.startsWith(root + path.sep))
        throw Error('Invalid canonical source path');
      if (!replace) {
        try {
          await fs.access(filename);
          throw Error('Translation already exists: ' + filename);
        } catch (error) {
          if (!(
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ))
            throw error;
        }
      }
      const source = await fs.readFile(
        path.join(projectRoot, 'src', page.source),
        'utf8'
      );
      pending.push({
        filename,
        markdown: markdownFromSnapshot(page, source, english, localized)
      });
    }
  }
  // Complete conversion and overwrite checks before touching any destination file.
  for (const { filename, markdown } of pending) {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, markdown);
  }
  return pending.length;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  const args = process.argv.slice(2),
    baseline = args[args.indexOf('--baseline') + 1],
    destination = args[args.indexOf('--output') + 1];
  if (
    !args.includes('--baseline') ||
    !args.includes('--output') ||
    !baseline ||
    !destination
  )
    throw Error(
      'Usage: node scripts/migrate-translations.ts --baseline <frozen-reader-directory> --output <source-directory> [--replace]'
    );
  console.log(
    'Migrated ' +
      (await migrateTranslations(
        path.resolve(baseline),
        path.resolve(destination),
        args.includes('--replace')
      )) +
      ' translated Markdown chapters.'
  );
}
