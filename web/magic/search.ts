// Search in the magic world is mdBook's own: its searcher.js, elasticlunr and the edition's search
// index (listed in #mdbook-assets by vite.config.ts), bound to the search markup Reader.tsx
// renders, as in the approved reader. The searcher binds once per page load, so changing the
// edition loads the page again. Its result links carry ?highlight=; it marks those words when a
// chapter opens (markSearchTerms) as it does on a page load.
//
// Additions, also the approved reader's: CJK queries match by substring (elasticlunr's tokenizer
// does not segment them), Ctrl+K and the sidebar button open search, input that does not raise
// keyup (paste, voice, IME) still searches, the header counts results, and a click on the modal's
// backdrop closes it.
import type { Language } from '../languages.ts';
import { t as translate } from './t.ts';

interface SearchDocument { title?: string; body?: string; breadcrumbs?: string }
interface SearchIndex {
  documentStore: { docs: Record<string, SearchDocument> };
  search(query: string, options?: unknown): { ref: string; score: number; doc: SearchDocument }[];
}
declare global {
  interface Window {
    elasticlunr?: { Index: { prototype: SearchIndex } };
    path_to_root?: string;
    path_to_searchindex_js?: string;
  }
}

let loaded: Language | undefined;

/** Loads mdBook's searcher for the edition once the search markup is in the page. */
function loadSearcher(lang: Language) {
  if (loaded) return;
  loaded = lang;
  const assets = JSON.parse(document.getElementById('mdbook-assets')?.textContent ?? '{}') as
    { searcher?: string; searchIndex?: Record<string, string> };
  if (!assets.searcher || !window.elasticlunr) return;
  // mdBook's search delegates matching to elasticlunr; extend that one operation for CJK substrings
  // so its result rendering, cache, keyboard handling and history stay native.
  const cjkQuery = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
  const nativeSearch = window.elasticlunr.Index.prototype.search;
  window.elasticlunr.Index.prototype.search = function (query, options) {
    if (!cjkQuery.test(query)) return nativeSearch.call(this, query, options);
    const tokens = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/u);
    return Object.entries(this.documentStore.docs).flatMap(([ref, doc]) => {
      const title = (doc.title ?? '').normalize('NFKC').toLocaleLowerCase();
      const text = (title + ' ' + (doc.body ?? '') + ' ' + (doc.breadcrumbs ?? '')).normalize('NFKC').toLocaleLowerCase();
      return tokens.every((token) => text.includes(token))
        ? [{ ref, doc, score: tokens.every((token) => title.includes(token)) ? 2 : 1 }] : [];
    }).sort((a, b) => b.score - a.score);
  };
  // The searcher prefixes result links with path_to_root: results open in the magic world.
  window.path_to_root = `/magic/${lang}/`;
  window.path_to_searchindex_js = assets.searchIndex?.[lang];
  const script = document.createElement('script');
  script.src = assets.searcher;
  document.head.append(script);
}

/** Marks a search result's words in the chapter, as mdBook's searcher does on a page load. */
export function markSearchTerms() {
  if (new URL(location.href).searchParams.has('highlight')) (window.onpopstate as (() => void) | null)?.();
}

/** Binds the approved additions to mdBook's search and loads it; returns the teardown. */
export function bindSearch(lang: Language): () => void {
  const controller = new AbortController();
  const signal = controller.signal;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const sidebarSearch = $('sidebar-search');
  sidebarSearch.addEventListener('click', () => {
    if ($('search-toggle').getAttribute('aria-expanded') !== 'true') $('search-toggle').click();
    $<HTMLInputElement>('searchbar').focus();
  }, { signal });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      sidebarSearch.click();
    }
  }, { capture: true, signal });
  /** Localizes the search count after mdBook has rendered its results. */
  const searchCount = () => {
    const input = $<HTMLInputElement>('searchbar');
    if (input.value.trim()) $('searchresults-header').textContent = translate(lang, 'Search the book') + ' · ' + $('searchresults').children.length;
  };
  const searchChanged = () => setTimeout(searchCount, 0);
  const searchbar = $('searchbar');
  // mdBook searches on keyup; paste, voice input and IME completion use that same path.
  searchbar.addEventListener('input', (event) => {
    if (!(event as InputEvent).isComposing) searchbar.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }, { signal });
  searchbar.addEventListener('compositionend', () => searchbar.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true })), { signal });
  // Escape's keydown already closes search; a later keyup must not start the old query again.
  searchbar.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') { event.stopImmediatePropagation(); searchChanged(); }
  }, { capture: true, signal });
  searchbar.addEventListener('keyup', searchChanged, { signal });
  document.addEventListener('load', (event) => {
    if ((event.target as HTMLElement)?.id === 'search-index') searchChanged();
  }, { capture: true, signal });
  $('search-wrapper').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('search-toggle').click(); }, { signal });
  loadSearcher(lang);
  return () => controller.abort();
}
