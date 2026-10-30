// Neutral-entry helpers: choose an edition before the reader redirects, and play the
// gateway welcome without leaking audio after the gateway is gone. The reader owns
// routing and the audio element; this module only interprets their current state.
import { languages } from './languages.ts';
import type { Language } from './languages.ts';

const countryLanguage: Readonly<Record<string, Language>> = {
  AE: 'ar', BH: 'ar', DZ: 'ar', EG: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar', LB: 'ar',
  LY: 'ar', MA: 'ar', OM: 'ar', QA: 'ar', SA: 'ar', SD: 'ar', SY: 'ar', TN: 'ar', YE: 'ar',
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  ES: 'es', MX: 'es', AR: 'es', BO: 'es', CL: 'es', CO: 'es', CR: 'es', CU: 'es',
  DO: 'es', EC: 'es', GT: 'es', HN: 'es', NI: 'es', PA: 'es', PE: 'es', PR: 'es',
  PY: 'es', SV: 'es', UY: 'es', VE: 'es',
  JP: 'ja', KR: 'ko', RU: 'ru', BY: 'ru', KZ: 'ru', UA: 'uk', VN: 'vi', CN: 'zh',
  TW: 'zh-hant', HK: 'zh-hant', MO: 'zh-hant',
};

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
  return /^[A-Z]{2}$/.test(code) ? countryLanguage[code] ?? 'en' : undefined;
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

/** Binds gateway autoplay and trusted first-interaction recovery, returning its complete teardown. */
export function bindWelcome(audio: Pick<HTMLAudioElement, 'play' | 'pause'>, isGateway: () => boolean): () => void {
  let bound = true;
  const stopIfOutside = () => { if (bound && !isGateway()) audio.pause(); };
  const tryPlay = (event?: Event) => {
    if (!bound || !isGateway()) { audio.pause(); return; }
    if (event && !event.isTrusted) return;
    try { void Promise.resolve(audio.play()).catch(() => undefined); } catch { /* browser rejected synchronously */ }
  };
  const onInteraction = (event: Event) => tryPlay(event);
  const onVisibility = () => { if (document.visibilityState !== 'visible') audio.pause(); else stopIfOutside(); };
  tryPlay();
  document.addEventListener('pointerdown', onInteraction, true);
  document.addEventListener('keydown', onInteraction, true);
  document.addEventListener('visibilitychange', onVisibility);
  const observer = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(stopIfOutside);
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-gateway'] });
  return () => {
    if (!bound) return;
    bound = false;
    observer?.disconnect();
    document.removeEventListener('pointerdown', onInteraction, true);
    document.removeEventListener('keydown', onInteraction, true);
    document.removeEventListener('visibilitychange', onVisibility);
    audio.pause();
  };
}
