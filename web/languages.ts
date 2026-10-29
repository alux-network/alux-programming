// The editions of the book: the single list every other part reads. The build (mdbook.ts) makes one
// edition per entry, the reader fills its language picker from it, i18n.ts is typed by it and the
// tests derive the expected site from it. English is the canonical source and is served at the site
// root; every other edition lives at /<code>/ and is built from `chapter.<code>.md` translations,
// falling back to English.
//
// Adding a language: add an entry here (`rtl: true` for right-to-left scripts), its UI labels in
// i18n.ts, public/audio/welcome/<code>.mp3 and public/social/alux-programming-<code>.jpg. Nothing
// else lists languages.
export const languages = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'zh', name: '简体中文' },
  { code: 'zh-hant', name: '繁體中文' },
] as const;

// The language codes, as a union type, so a typo in a code is a type error.
export type Language = (typeof languages)[number]['code'];
