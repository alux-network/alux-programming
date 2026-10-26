import type { ReaderBook } from './book.ts';
import { createSignal } from 'solid-js';
import { loadBook } from './content-loader.ts';
import { englishMessages } from './ui-messages.ts';
import type { UIMessages, MessageKey } from './ui-messages.ts';
import { formatMessage } from './ui-format.ts';
import type { VariableMessage } from './ui-format.ts';
import {
  languages,
  normalizeLanguage,
  pathLanguage,
  stripLanguage,
  languagePath,
  htmlLanguage
} from './locale-routing.ts';
import type { LanguageCode } from './locale-routing.ts';
export { languages, stripLanguage };

const codes: LanguageCode[] = languages.map((x) => x.code);
const dictionaries = import.meta.glob<UIMessages>('../locales/ui/*.json', {
  import: 'default'
});
interface LocalizedEdition {
  locale: LanguageCode;
  book: ReaderBook;
  messages: UIMessages;
}
const [edition, setEdition] = createSignal<LocalizedEdition>();
export { edition };
const get = (key: string, session = false): string | null => {
  try {
    return (session ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null;
  }
};
const put = (key: string, value: string, session = false): void => {
  try {
    (session ? sessionStorage : localStorage).setItem(key, value);
  } catch {}
};
export const language = (): LanguageCode => edition()?.locale || 'en';
export function fmt(message: VariableMessage): string {
  return formatMessage(language(), message);
}
export function languageURL(href: string): string {
  const url = new URL(href, location.origin);
  if (url.origin !== location.origin) return href;
  url.pathname = languagePath(url.pathname, language());
  url.searchParams.delete('lang');
  return url.pathname + url.search + url.hash;
}
export function countryLanguage(country: string): LanguageCode {
  if (country === 'CN') return 'zh';
  if (['TW', 'HK', 'MO'].includes(country)) return 'zh-hant';
  if (['DE', 'AT', 'LI'].includes(country)) return 'de';
  if (
    [
      'ES',
      'MX',
      'AR',
      'CL',
      'CO',
      'PE',
      'VE',
      'EC',
      'BO',
      'PY',
      'UY',
      'CR',
      'PA',
      'GT',
      'HN',
      'SV',
      'NI',
      'DO',
      'CU',
      'GQ'
    ].includes(country)
  )
    return 'es';
  if (country === 'VN') return 'vi';
  if (country === 'RU') return 'ru';
  if (country === 'UA') return 'uk';
  if (country === 'JP') return 'ja';
  if (['KR', 'KP'].includes(country)) return 'ko';
  if (
    [
      'AE',
      'SA',
      'EG',
      'IQ',
      'JO',
      'KW',
      'QA',
      'BH',
      'OM',
      'YE',
      'LB',
      'SY',
      'PS',
      'DZ',
      'MA',
      'TN',
      'LY',
      'SD',
      'SO',
      'MR',
      'DJ',
      'KM'
    ].includes(country)
  )
    return 'ar';
  return 'en';
}
export async function resolveLanguage() {
  const explicit =
    pathLanguage(location.pathname) ||
    normalizeLanguage(new URL(location.href).searchParams.get('lang'));
  if (explicit) return explicit;
  const saved = normalizeLanguage(get('alux-programming-language'));
  if (saved) return saved;
  const cached = normalizeLanguage(get('alux-programming-ip-language', true));
  if (cached) return cached;
  try {
    const r = await fetch('https://get.geojs.io/v1/ip/country.json', {
      signal: AbortSignal.timeout(1800),
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    });
    if (!r.ok) throw Error('Country unavailable');
    const { country } = await r.json();
    const result = countryLanguage(String(country).toUpperCase());
    put('alux-programming-ip-language', result, true);
    return result;
  } catch {
    return 'en';
  }
}
export async function setLanguage(
  next: LanguageCode,
  manual = false
): Promise<void> {
  if (!codes.includes(next)) throw Error('Unsupported language');
  const load = dictionaries[`../locales/ui/${next}.json`];
  if (!load) throw Error('Interface language unavailable');
  const [book, ui] = await Promise.all([loadBook(next), load()]);
  document.documentElement.lang = htmlLanguage(next);
  document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.locale = next;
  if (manual) put('alux-programming-language', next);
  setEdition({ locale: next, book, messages: ui });
}
export function ui(key: MessageKey): string {
  return (edition()?.messages || englishMessages)[key];
}
