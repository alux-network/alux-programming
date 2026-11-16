// UI labels: English text is the key, i18n.ts holds each edition's translation.
import { uiStrings } from '../i18n.ts';
import type { Language } from '../languages.ts';

/** Returns the UI label for the English `label` in `lang`, falling back to English. */
export function t(lang: Language, label: string): string {
  return uiStrings[lang]?.[label] ?? label;
}
