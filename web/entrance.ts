// Neutral-entry helpers: choose the edition the entrance opens in, from a saved manual choice, the
// visitor country or the browser language.
import { languages, countryLanguage } from './languages.ts';
import type { Language } from './languages.ts';



const languageCodes = new Set<Language>(languages.map(({ code }) => code));

/** Returns a valid saved language, or undefined when the stored value is stale. */
function validLanguage(value: unknown): Language | undefined {
  return typeof value === 'string' && languageCodes.has(value as Language)
    ? value as Language
    : undefined;
}

/** Returns the edition suggested by a browser language tag, with English as the final fallback. */
export function languageFromNavigator(language: string | undefined): Language {
  const normalized = (language ?? '').toLowerCase().replace('_', '-');
  if (normalized.startsWith('zh-hant') || normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk') || normalized.startsWith('zh-mo')) return 'zh-hant';
  const base = normalized.split('-')[0];
  return validLanguage(base) ?? 'en';
}

/** Returns the country edition, English for other countries, or undefined for malformed data. */
export function languageFromCountry(response: unknown): Language | undefined {
  const country = typeof response === 'string'
    ? response
    : response && typeof response === 'object' && 'country' in response
      ? (response as { country?: unknown }).country
      : undefined;
  if (typeof country !== 'string') return undefined;
  const code = country.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? countryLanguage.get(code) ?? 'en' : undefined;
}

/** Looks up the visitor country without a key and fails quickly so the entrance stays responsive. */
export async function detectEntranceCountry(signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('https://api.country.is/', { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`country lookup failed: ${response.status}`);
  return response.json();
}

/** Chooses a neutral entrance edition: saved manual preference, country, then browser language. */
export async function chooseEntranceLanguage(
  saved: Language | undefined,
  detect: (signal?: AbortSignal) => Promise<unknown> = detectEntranceCountry,
  navigatorLanguage = globalThis.navigator?.language,
): Promise<Language> {
  const manual = validLanguage(saved);
  if (manual) return manual;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => {
    controller.abort();
    reject(new Error('country lookup timed out'));
  }, 900); });
  try {
    return languageFromCountry(await Promise.race([detect(controller.signal), timeout])) ?? languageFromNavigator(navigatorLanguage);
  } catch {
    return languageFromNavigator(navigatorLanguage);
  } finally {
    clearTimeout(timer!);
  }
}
