export const partRoutes = [
  'parts/the-semantic-view.html',
  'parts/design-by-meaning-in-rust.html',
  'parts/concepts.html',
  'parts/insights.html'
];
import { englishMessages } from './ui-messages.ts';
import type { MessageKey } from './ui-messages.ts';
const roman = ['I', 'II', 'III', 'IV', 'V'];
export function contentsMarkup({
  groups,
  pages,
  icon,
  real = false,
  label = (key: MessageKey) => englishMessages[key]
}: {
  groups: BookGroup[];
  pages: ReaderPage[];
  icon: Icon;
  real?: boolean;
  label?: (key: MessageKey) => string;
}): string {
  const prefix = real ? '/real/' : '/';
  return `<main id="main" class="contents-main"><header class="contents-heading"><h1>${label('Table of contents')}</h1><a class="contents-introduction" href="${prefix}introduction.html">${label('Read the introduction')} ${icon('arrow-right')}</a></header><div class="contents-spread">${groups
    .map(
      (g, i) =>
        `<section class="contents-part"><header><span class="contents-roman">${roman[i]}</span><h2>${g.title}</h2></header><ol>${g.pages
          .map((slug, j) => {
            const p = pages.find((p) => p.slug === slug);
            if (!p) throw new Error('Missing contents chapter: ' + slug);
            return `<li><a href="${prefix}${slug}"><span>${String(j + 1).padStart(2, '0')}</span><strong>${p.title}</strong>${icon('arrow-up-right')}</a></li>`;
          })
          .join('')}</ol></section>`
    )
    .join('')}</div></main>`;
}
import type { BookGroup, Icon, ReaderPage } from './book.ts';
