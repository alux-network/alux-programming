import type { ReaderBook } from './book.ts';
import type { LanguageCode } from './locale-routing.ts';
import { parseReaderBook } from './book-data.ts';

/** Cache only requested editions; failures remain retryable. */
export function createBookLoader(
  fetchBook: typeof fetch = fetch
): (locale: LanguageCode) => Promise<ReaderBook> {
  const loaded = new Map<LanguageCode, Promise<ReaderBook>>();
  return (locale) => {
    const cached = loaded.get(locale);
    if (cached) return cached;
    const pending = fetchBook('/content/' + locale + '.json')
      .then(async (response) => {
        if (!response.ok) throw Error('Book language unavailable: ' + locale);
        const value: unknown = await response.json();
        return parseReaderBook(value);
      })
      .catch((error: unknown) => {
        loaded.delete(locale);
        throw error;
      });
    loaded.set(locale, pending);
    return pending;
  };
}
export const loadBook = createBookLoader();
