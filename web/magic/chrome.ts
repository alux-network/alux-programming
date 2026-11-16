// The parts of mdBook's book.js the magic world's page relies on, for the markup Reader.tsx renders
// (the approved template's): theme classes and highlight stylesheets, the sidebar toggle, the
// keyboard help, and code blocks (highlight.js from the edition's own build, copy and run buttons).
// mdBook's own scripts are not loaded: they bind once per page load, and the app replaces chapters
// in place.
import { copyLabels } from '../i18n.ts';
import type { Language } from '../languages.ts';
import { t } from './t.ts';

// Set by mdBook's highlight.js, which the page loads from the book's build (vite.config.ts).
declare const hljs: { configure(options: object): void; highlightBlock(block: Element): void } | undefined;

/** Returns the reader's day (light) or night (coal) theme, migrating older preferences. */
export function storedTheme(): 'light' | 'coal' {
  let theme: string | null = null;
  try {
    theme = localStorage.getItem('mdbook-theme') ||
      (localStorage.getItem('alux-reading-theme') === 'dark' || localStorage.getItem('alux-night') === 'true' ? 'coal' : 'light');
  } catch {}
  return ['coal', 'navy', 'ayu'].includes(theme ?? '') ? 'coal' : 'light';
}

/** Applies a theme as mdBook does: the html class, the code stylesheet and the browser color. */
export function applyTheme(theme: 'light' | 'coal') {
  const html = document.documentElement;
  html.classList.remove('light', 'coal');
  html.classList.add(theme);
  try { localStorage.setItem('mdbook-theme', theme); } catch {}
  const sheet = (id: string) => document.getElementById(id) as HTMLLinkElement | null;
  if (sheet('highlight-css')) sheet('highlight-css')!.disabled = theme === 'coal';
  if (sheet('tomorrow-night-css')) sheet('tomorrow-night-css')!.disabled = theme !== 'coal';
  if (sheet('ayu-highlight-css')) sheet('ayu-highlight-css')!.disabled = true;
  setTimeout(() => {
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(html).backgroundColor);
  }, 1);
}

/** Returns whether the sidebar starts open: mdBook's rule (wide screens remember the choice). */
export function sidebarStartsVisible(): boolean {
  if (document.body.clientWidth < 1080) return false;
  try { return (localStorage.getItem('mdbook-sidebar') || 'visible') === 'visible'; } catch { return true; }
}

/** Shows or hides the sidebar as mdBook's toggle does, remembering the choice. */
export function setSidebar(visible: boolean) {
  const sidebar = document.getElementById('sidebar');
  document.documentElement.classList.toggle('sidebar-visible', visible);
  const anchor = document.getElementById('sidebar-toggle-anchor') as HTMLInputElement | null;
  if (anchor) anchor.checked = visible;
  document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', String(visible));
  sidebar?.setAttribute('aria-hidden', String(!visible));
  if (sidebar && visible) sidebar.style.display = '';
  for (const link of document.querySelectorAll('#sidebar a')) link.setAttribute('tabIndex', visible ? '0' : '-1');
  try { localStorage.setItem('mdbook-sidebar', visible ? 'visible' : 'hidden'); } catch {}
}

/** Binds the sidebar toggle, swipe gestures and the keyboard help; returns nothing (page lifetime). */
export function bindChrome(signal: AbortSignal) {
  const sidebar = document.getElementById('sidebar')!;
  const anchor = document.getElementById('sidebar-toggle-anchor') as HTMLInputElement;
  // mdBook hides the collapsed sidebar after its transition so in-page search skips it.
  if (!document.documentElement.classList.contains('sidebar-visible')) sidebar.style.display = 'none';
  sidebar.addEventListener('transitionend', () => { if (!anchor.checked) sidebar.style.display = 'none'; }, { signal });
  document.getElementById('sidebar-toggle')!.addEventListener('click', () => {
    if (!anchor.checked) { sidebar.style.display = ''; void sidebar.offsetHeight; }
  }, { signal });
  anchor.addEventListener('change', () => setSidebar(anchor.checked), { signal });

  let firstContact: { x: number; time: number } | null = null;
  document.addEventListener('touchstart', (e) => { firstContact = { x: e.touches[0]!.clientX, time: Date.now() }; }, { passive: true, signal });
  document.addEventListener('touchmove', (e) => {
    if (!firstContact) return;
    const x = e.touches[0]!.clientX, dx = x - firstContact.x, dt = Date.now() - firstContact.time;
    if (dt < 250 && Math.abs(dx) >= 150) {
      if (dx >= 0 && firstContact.x < Math.min(document.body.clientWidth * 0.25, 300)) setSidebar(true);
      else if (dx < 0 && x < 300) setSidebar(false);
      firstContact = null;
    }
  }, { passive: true, signal });

  // "?" shows the keyboard help; Escape or a click outside closes it.
  const container = document.getElementById('mdbook-help-container')!;
  const popup = document.getElementById('mdbook-help-popup')!;
  const hide = () => { container.style.display = 'none'; };
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.key !== '?') return;
    if ((e.target as Element).closest('input, textarea, select, [contenteditable]')) return;
    e.preventDefault();
    container.style.display = 'flex';
  }, { signal });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.style.display === 'flex') { e.preventDefault(); e.stopPropagation(); hide(); }
  }, { capture: true, signal });
  container.addEventListener('mousedown', (e) => {
    if (popup.contains(e.target as Node) || e.button !== 0) return;
    e.preventDefault();
    hide();
  }, { signal });
}

/** Highlights a chapter's code and binds mdBook-style copy and Rust playground controls. */
export function prepareCode(main: HTMLElement, lang: Language, signal: AbortSignal) {
  const notice = document.createElement('div');
  notice.className = 'code-copy-notice';
  notice.setAttribute('role', 'status');
  let reset: ReturnType<typeof setTimeout>;
  /** Shows copy feedback outside the clipped columns and above the book's frame. */
  function showCopyNotice(button: HTMLElement, message: string) {
    if (signal.aborted) return;
    clearTimeout(reset);
    notice.textContent = message;
    document.body.append(notice);
    const anchor = button.getBoundingClientRect();
    const width = notice.getBoundingClientRect().width;
    notice.style.left = Math.max(8, Math.min(innerWidth - width - 8, anchor.right - width)) + 'px';
    notice.style.top = Math.max(8, anchor.top - notice.getBoundingClientRect().height - 8) + 'px';
    reset = setTimeout(() => notice.remove(), 1800);
  }
  const hideNotice = () => notice.remove();
  // Scroll and relayout invalidate the button's viewport coordinates.
  addEventListener('scroll', hideNotice, { capture: true, passive: true, signal });
  addEventListener('resize', hideNotice, { signal });
  signal.addEventListener('abort', () => { clearTimeout(reset); notice.remove(); }, { once: true });
  const codes = [...main.querySelectorAll('code')].filter((code) => !code.parentElement!.classList.contains('header'));
  if (typeof hljs !== 'undefined') {
    hljs.configure({ tabReplace: '    ', languages: [] });
    for (const code of codes) hljs.highlightBlock(code);
  }
  for (const code of codes) code.classList.add('hljs');
  const [action, success, failure] = copyLabels[lang];
  for (const code of main.querySelectorAll('pre > code:not(.result)')) {
    const pre = code.parentElement!;
    let buttons = pre.querySelector(':scope > .buttons');
    if (!buttons) {
      buttons = document.createElement('div');
      buttons.className = 'buttons';
      pre.insertBefore(buttons, pre.firstChild);
    }
    // React can bind the same chapter again after tearing down its previous listeners.
    buttons.querySelectorAll('.clip-button,.play-button').forEach(button => button.remove());
    const button = document.createElement('button');
    button.className = 'clip-button';
    button.type = 'button';
    button.title = action;
    button.setAttribute('aria-label', action);
    buttons.insertBefore(button, buttons.firstChild);
    button.addEventListener('click', () => {
      // mdBook copies the code's text without hidden lines.
      const text = [...code.childNodes].filter((n) => !(n instanceof Element && n.classList.contains('boring'))).map((n) => n.textContent).join('');
      navigator.clipboard.writeText(text).then(() => showCopyNotice(button, success), () => showCopyNotice(button, failure));
    }, { signal });
    if (pre.classList.contains('playground') && !code.classList.contains('no_run')) {
      const run = document.createElement('button');
      run.type = 'button';
      run.className = 'fa fa-play play-button';
      run.title = t(lang, 'Run this code');
      run.setAttribute('aria-label', run.title);
      buttons.append(run);
      run.addEventListener('click', () => { void runRust(pre, code, run, lang, signal); }, { signal });
    }
  }
}

/** Runs a Rust listing with mdBook's playground protocol and displays its output in the listing. */
async function runRust(pre: HTMLElement, code: Element, button: HTMLButtonElement, lang: Language, signal: AbortSignal) {
  let result = pre.querySelector<HTMLElement>(':scope > .result');
  if (!result) {
    // Keep the listing's footprint while output arrives, so surrounding columns do not repaginate.
    const height = pre.getBoundingClientRect().height;
    const leaf = pre.closest<HTMLElement>('main.leaves')!;
    pre.style.setProperty('--code-run-height', height >= leaf.clientHeight - 2
      ? 'var(--leaf-height)' : `min(${height}px,var(--leaf-height))`);
    result = document.createElement('code');
    result.className = 'result hljs language-bash';
    result.setAttribute('role', 'status');
    pre.append(result);
  }
  const source = code.textContent ?? '';
  const edition = [...code.classList].find(name => /^edition\d+$/.test(name))?.slice(7) ?? '2015';
  result.textContent = t(lang, 'Running...');
  result.classList.remove('result-no-output');
  button.disabled = true;
  try {
    const response = await fetch('https://play.rust-lang.org/evaluate.json', {
      method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: source.includes('#![feature') ? 'nightly' : 'stable', optimize: '0', code: source, edition }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const output = await response.json() as { result: string };
    result.textContent = output.result.trim() ? output.result : t(lang, 'No output');
    result.classList.toggle('result-no-output', !output.result.trim());
  } catch (error) {
    if (!signal.aborted) result.textContent = t(lang, 'Playground Communication') + ': ' + (error as Error).message;
  } finally {
    button.disabled = false;
    // Output changes the local scroll ports and can change the chapter's pagination.
    if (!signal.aborted) dispatchEvent(new Event('resize'));
  }
}
