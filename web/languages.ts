// The editions of the book: the single list every other part reads. The build (mdbook.ts) makes one
// edition per entry, the reader fills its language picker from it, i18n.ts is typed by it and the
// tests derive the expected site from it. English is the canonical source and is served at the site
// root; every other edition lives at /<code>/ and is built from `chapter.<code>.md` translations,
// falling back to English.
//
// Adding a language: add an entry here (`rtl: true` for right-to-left scripts), its UI labels in
// i18n.ts, public/audio/welcome/<code>.mp3 and public/social/alux-programming-<code>.jpg. Nothing
// else lists languages.
export interface EditionDefinition {
  code: string;
  name: string;
  readerName: string;
  countries: readonly string[];
  rtl?: boolean;
}

export const languages = [
  { code: 'en', readerName: 'ALUX Programming', countries: [], name: 'English' },
  { code: 'ar', readerName: 'ALUX Programming', countries: ['AE', 'BH', 'DZ', 'EG', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'OM', 'QA', 'SA', 'SD', 'SY', 'TN', 'YE'], name: 'العربية', rtl: true },
  { code: 'de', readerName: 'ALUX Programming', countries: ['DE', 'AT', 'CH', 'LI'], name: 'Deutsch' },
  { code: 'es', readerName: 'ALUX Programming', countries: ['ES', 'MX', 'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GT', 'HN', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE'], name: 'Español' },
  { code: 'ja', readerName: 'ALUX Programming', countries: ['JP'], name: '日本語' },
  { code: 'ko', readerName: 'ALUX Programming', countries: ['KR'], name: '한국어' },
  { code: 'ru', readerName: 'ALUX Programming', countries: ['RU', 'BY', 'KZ'], name: 'Русский' },
  { code: 'uk', readerName: 'ALUX Programming', countries: ['UA'], name: 'Українська' },
  { code: 'vi', readerName: 'ALUX Programming', countries: ['VN'], name: 'Tiếng Việt' },
  { code: 'zh', readerName: 'ALUX 编程', countries: ['CN'], name: '简体中文' },
  { code: 'zh-hant', readerName: 'ALUX 程式設計', countries: ['TW', 'HK', 'MO'], name: '繁體中文' },
] as const satisfies readonly EditionDefinition[];

// The language codes, as a union type, so a typo in a code is a type error.
export type Language = (typeof languages)[number]['code'];

/** Returns the approved browser and bookmark name, independent of content translation. */
export function readerName(code: Language): string {
  return languages.find((edition) => edition.code === code)!.readerName;
}

/** Derives country routing from editions and rejects ambiguous or malformed configuration. */
export function countryEditions(editions: readonly EditionDefinition[]): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  const codes = new Set(editions.map(edition => edition.code));
  if (codes.size !== editions.length) throw new Error('Duplicate edition code');
  for (const edition of editions) for (const country of edition.countries) {
    if (!/^[A-Z]{2}$/.test(country) || result.has(country)) throw new Error(`Invalid or duplicate country: ${country}`);
    result.set(country, edition.code);
  }
  return result;
}
export const countryLanguage = countryEditions(languages) as ReadonlyMap<string, Language>;
