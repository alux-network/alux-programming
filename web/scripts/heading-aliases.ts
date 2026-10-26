import type { ReaderBook } from '../src/book.ts';
// Public links generated before the native mdBook anchor migration remain valid.
const aliases: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'concepts/expression-problem.html': {
    'haskell-functional-adt': 'haskell-functional--adt',
    'wadlers-proposed-solution-gj-virtual-types':
      'wadlers-proposed-solution-gj--virtual-types'
  },
  'concepts/referential_transparency.html': {
    'scala-cats-cats-effect': 'scala-cats--cats-effect'
  },
  'concepts/free_monad.html': {
    'why-free-monad-these-patterns': 'why-free-monad--these-patterns'
  }
};
export function addHeadingAliases(book: ReaderBook): void {
  for (const [slug, entries] of Object.entries(aliases)) {
    const page = book.pages.find((candidate) => candidate.slug === slug);
    if (!page) throw Error('Missing compatibility chapter: ' + slug);
    for (const target of Object.values(entries))
      if (!page.headings.some((heading) => heading.id === target))
        throw Error('Invalid compatibility heading: ' + target);
    page.anchorAliases = { ...entries };
  }
}
