import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import type { ReaderBook } from '../src/book.ts';
import { englishMessages } from '../src/ui-messages.ts';
import type { UIMessages } from '../src/ui-messages.ts';
export function validateMessages(
  value: unknown,
  locale: string
): asserts value is UIMessages {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error(locale + ': invalid UI dictionary');
  assert.deepEqual(
    Object.keys(value).sort(),
    Object.keys(englishMessages).sort(),
    locale + ': UI keys'
  );
  if (
    Object.values(value).some(
      (message) => typeof message !== 'string' || !message.trim()
    )
  )
    throw Error(locale + ': empty interface message');
}
function technicalFacts(html: string) {
  const { document } = parseHTML('<html><body>' + html + '</body></html>');
  const texts = (selector: string) =>
    [...document.querySelectorAll(selector)]
      .map((node) => node.textContent || '')
      .sort();
  const attributes = (selector: string, name: string) =>
    [...document.querySelectorAll(selector)]
      .map((node) => node.getAttribute(name) || '')
      .sort();
  return {
    code: texts('pre code'),
    inline: texts('code:not(pre code)'),
    math: texts('annotation[encoding="application/x-tex"]'),
    links: attributes('a[href]', 'href'),
    images: attributes('img[src]', 'src'),
    media: attributes('iframe[src]', 'src')
  };
}
/** Validate the complete edition before replacing any published reader JSON. */
export function validateReaderEdition(
  book: ReaderBook,
  canonical: ReaderBook,
  locale: string
): void {
  assert.ok(canonical.pages.length > 0, 'Canonical book is empty');
  assert.deepEqual(
    book.pages.map((page) => [
      page.id,
      page.slug,
      page.source,
      page.parentId,
      page.children
    ]),
    canonical.pages.map((page) => [
      page.id,
      page.slug,
      page.source,
      page.parentId,
      page.children
    ]),
    locale + ': canonical identity/hierarchy'
  );
  assert.deepEqual(
    book.groups.map((group) => group.pages),
    canonical.groups.map((group) => group.pages),
    locale + ': part membership'
  );
  for (const [index, page] of book.pages.entries()) {
    const original = canonical.pages[index]!;
    assert.deepEqual(
      technicalFacts(page.html),
      technicalFacts(original.html),
      locale + ' ' + page.slug + ': protected technical content'
    );
    assert.deepEqual(
      page.headings.map((heading) => heading.id),
      original.headings.map((heading) => heading.id),
      locale + ' ' + page.slug + ': canonical heading IDs'
    );
    assert.deepEqual(
      page.anchorAliases,
      original.anchorAliases,
      locale + ' ' + page.slug + ': legacy anchors'
    );
  }
}
