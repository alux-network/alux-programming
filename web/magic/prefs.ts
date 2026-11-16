// The reader's preferences in localStorage 'alux-reader', shared by every edition (one origin), in
// the approved reader's format so existing visitors keep their choices:
// world, reading mode, text scale, music on/off, manual language, normalized progress per
// `<lang>:<page>` and bookmarks (a page path inside the edition and its title).
import { languages } from '../languages.ts';
import type { Language } from '../languages.ts';

export interface Bookmark {
  page: string;
  title: string;
}
export interface Prefs {
  world?: 'magic' | 'real';
  mode?: 'pages' | 'scroll';
  language?: Language;
  positions?: Record<string, number>;
  scale?: number;
  music?: boolean;
  bookmarks: Bookmark[];
}

/** Reads the preferences, dropping anything malformed. */
export function loadPrefs(): Prefs {
  try {
    const value = JSON.parse(localStorage.getItem('alux-reader') ?? '{}') as Partial<Prefs> | null;
    if (!value || typeof value !== 'object') return { bookmarks: [] };
    return {
      world: value.world === 'magic' ? 'magic' : 'real',
      mode: value.mode === 'scroll' ? 'scroll' : 'pages',
      language: languages.find((l) => l.code === value.language)?.code,
      scale: typeof value.scale === 'number' && Number.isFinite(value.scale) ? Math.min(1.5, Math.max(.7, value.scale)) : 1,
      music: typeof value.music === 'boolean' ? value.music : undefined,
      positions: Object.fromEntries(Object.entries(value.positions ?? {}).filter(
        ([, ratio]) => typeof ratio === 'number' && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1)),
      bookmarks: Array.isArray(value.bookmarks) ? value.bookmarks.filter(
        (b): b is Bookmark => !!b && typeof b.page === 'string' && typeof b.title === 'string') : [],
    };
  } catch {
    return { bookmarks: [] };
  }
}

/** Writes the preferences; storage may be unavailable (private windows), which only loses them. */
export function savePrefs(prefs: Prefs) {
  try { localStorage.setItem('alux-reader', JSON.stringify(prefs)); } catch {}
}

/** Returns whether `code` names an edition. */
export function isLanguage(code: string | undefined): code is Language {
  return languages.some((l) => l.code === code);
}

/** Returns the real world's URL of a page in an edition: mdBook serves English at the root. */
export function realUrl(lang: Language, page = 'index.html'): string {
  return (lang === 'en' ? '/' : `/${lang}/`) + page;
}

/** Returns the magic world's URL of a page in an edition. */
export function magicUrl(lang: Language, page = ''): string {
  return `/magic/${lang}/${page}`;
}
