import fs from 'node:fs/promises';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import type { ReaderBook } from '../src/book.ts';
import type { UIMessages, MessageKey } from '../src/ui-messages.ts';
import {
  languages,
  languagePath,
  htmlLanguage
} from '../src/locale-routing.ts';
import type { LanguageCode } from '../src/locale-routing.ts';
import {
  siteTitles,
  siteDescriptions,
  socialLocales,
  siteBrandName,
  brandedPageTitle
} from '../src/site-meta.ts';
import { gatewayMarkup } from '../src/worlds.ts';
import { contentsMarkup } from '../src/contents.ts';

const siteOrigin = (
  process.env.ALUX_SITE_URL || 'http://127.0.0.1:4174'
).replace(/\/$/, '');
const dir = path.resolve(import.meta.dirname, '../dist');
const content = JSON.parse(
  await fs.readFile(path.join(dir, 'content.json'), 'utf8')
) as ReaderBook;
const { pages, groups } = content;
const template = await fs.readFile(path.join(dir, 'index.html'), 'utf8');
const escape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] ?? char
  );
const known = new Set(pages.map((page) => page.slug));
const extras: ReadonlyArray<readonly [string, string]> = [
  ['atlas.html', 'The chapter atlas'],
  ['contents.html', 'Table of contents'],
  ['parts/the-semantic-view.html', 'The Semantic View'],
  ['parts/design-by-meaning-in-rust.html', 'Design by Meaning in Rust'],
  ['parts/concepts.html', 'Concepts'],
  ['parts/insights.html', 'Insights']
];

for (const { code } of languages) {
  const messages = JSON.parse(
    await fs.readFile(
      path.resolve(import.meta.dirname, '../locales/ui', code + '.json'),
      'utf8'
    )
  ) as UIMessages;
  const translate = (text: string): string =>
    messages[text as MessageKey] || text;
  const localized = JSON.parse(
    await fs.readFile(path.join(dir, 'content', code + '.json'), 'utf8')
  ) as ReaderBook;
  const localPages = localized.pages;
  async function write(
    route: string,
    title: string,
    description: string,
    body = '',
    realm = 'magic'
  ): Promise<void> {
    const { document } = parseHTML(template);
    document.documentElement.lang = htmlLanguage(code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document
      .querySelector('meta[name=description]')
      ?.setAttribute('content', description);
    const canonicalURL =
      siteOrigin + languagePath('/' + route.replace(/index\.html$/, ''), code);
    const chapterTitle =
      route === 'introduction.html' || route === 'real/introduction.html'
        ? translate('Introduction')
        : title;
    const shareTitle =
      route === 'index.html'
        ? siteTitles[code]
        : brandedPageTitle(chapterTitle, code);
    document.title = route === 'index.html' ? siteBrandName(code) : shareTitle;
    const values: Record<string, string> = {
      'application-name': siteBrandName(code),
      'apple-mobile-web-app-title': siteBrandName(code),
      'og:title': shareTitle,
      'og:description': siteDescriptions[code],
      'og:type': 'website',
      'og:site_name': siteBrandName(code),
      'og:locale': socialLocales[code],
      'og:url': canonicalURL,
      'og:image': siteOrigin + '/social/alux-programming-' + code + '.jpg',
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:alt': siteTitles[code],
      'twitter:card': 'summary_large_image',
      'twitter:title': shareTitle,
      'twitter:description': siteDescriptions[code],
      'twitter:image': siteOrigin + '/social/alux-programming-' + code + '.jpg',
      'twitter:image:alt': siteTitles[code]
    };
    for (const [name, value] of Object.entries(values)) {
      const meta = document.createElement('meta');
      meta.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
      meta.content = value;
      document.head.append(meta);
    }
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = canonicalURL;
    document.head.append(canonical);
    if (realm === 'real')
      document.body.className = 'reality-view real-theme-light';
    if (body) {
      const no = document.createElement('noscript');
      no.innerHTML =
        realm === 'gateway'
          ? body
          : `<main class="no-script-page ${realm === 'real' ? 'real-prose' : 'prose'}"><nav><a href="/">${translate('Choose world')}</a> · <a href="/${realm === 'real' ? 'real/' : ''}introduction.html">${translate('Introduction')}</a></nav>${body}</main>`;
      for (const [legacyId, nativeId] of Object.entries(
        localPages.find((page) => page.slug === route.replace(/^real\//, ''))
          ?.anchorAliases ?? {}
      )) {
        const heading = [...no.querySelectorAll('[id]')].find(
          (node) => node.id === nativeId
        );
        if (heading) {
          const alias = document.createElement('span');
          alias.id = legacyId;
          alias.setAttribute('aria-hidden', 'true');
          heading.before(alias);
        }
      }
      no.querySelectorAll('h1 img').forEach((element) => element.remove());
      if (no.querySelector('#alux-programming-guidelines'))
        no.querySelector('.admonition.warning')?.remove();
      no.querySelectorAll('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href') ?? '';
        if (!href.startsWith('/') || href.startsWith('//')) return;
        let [slug, hash] = href.slice(1).split('#');
        if (realm === 'real' && known.has(slug ?? '')) slug = 'real/' + slug;
        anchor.setAttribute(
          'href',
          languagePath('/' + (slug ?? ''), code) + (hash ? '#' + hash : '')
        );
      });
      no.querySelectorAll('.copy-code').forEach((element) => element.remove());
      document.body.append(no);
    }
    for (const { code: other } of languages) {
      const alternate = document.createElement('link');
      alternate.rel = 'alternate';
      alternate.hreflang = htmlLanguage(other);
      alternate.href =
        siteOrigin +
        languagePath('/' + route.replace(/index\.html$/, ''), other);
      document.head.append(alternate);
    }
    const destination = path.join(dir, languagePath('/' + route, code));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, document.toString());
  }
  for (const page of localPages) {
    await write(page.slug, page.title, page.text.slice(0, 175), page.html);
    await write(
      'real/' + page.slug,
      page.title,
      page.text.slice(0, 175),
      page.html,
      'real'
    );
  }
  const contentsGroups = localized.groups;
  const contentsBody = (real: boolean): string =>
    contentsMarkup({
      groups: contentsGroups,
      pages: localPages,
      icon: () => '',
      real,
      label: translate
    })
      .replace(/^<main[^>]*>/, '')
      .replace(/<\/main>$/, '');
  for (const [route, title] of extras)
    await write(
      route,
      translate(title),
      translate(title),
      route === 'contents.html' ? contentsBody(false) : ''
    );
  await write(
    'real/contents.html',
    translate('Table of contents'),
    translate('Table of contents'),
    contentsBody(true),
    'real'
  );
  await write(
    'magic.html',
    localPages[0]?.title ?? '',
    localPages[0]?.text.slice(0, 175) ?? '',
    localPages[0]?.html ?? ''
  );
  await write(
    'real/index.html',
    localPages[0]?.title ?? '',
    localPages[0]?.text.slice(0, 175) ?? '',
    localPages[0]?.html ?? '',
    'real'
  );
  await write(
    'index.html',
    translate('Choose your world'),
    translate('ALUX Programming'),
    gatewayMarkup({ t: translate }),
    'gateway'
  );
  await write(
    '404.html',
    translate('This page is uncharted.'),
    translate('Find your way back to the book.')
  );
}
console.log(
  `Generated ${languages.length} language routes for ${pages.length} chapters in both worlds, chooser and legacy aliases.`
);
