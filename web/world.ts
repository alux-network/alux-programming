// Chooses the reader's world before first paint. Loaded by theme/head.hbs as a classic blocking
// script on every mdBook page, so it imports nothing and is bundled as plain code.
//
// The real world is mdBook's own page; the only additions are links: the sidebar's first entry
// leads to the entrance's choice (index.html#worlds) and the header title to the edition's root.
// The magic world and the entrance load the reader: this script marks <html data-reader>, veils
// the body until /reader.css applies (added after mdBook's stylesheets by reader-style.ts), and
// writes the reader's module scripts.
//
// Reads localStorage 'alux-reader' (world, scale, mode) and sessionStorage 'alux-entered'.
// Writes <html data-world | data-reading | data-gateway | data-reader | data-shell-loading>.
// Declared by mdBook's head script as a global lexical binding, not a window property.
declare const path_to_root: string;
// A classic script shares the page's global scope with mdBook's; keep every binding local.
(() => {
  const html = document.documentElement;
  const { pathname } = location;
  // Aggregate and generated pages are always mdBook's own.
  const native = /\/(?:print|toc|404)\.html$/.test(pathname);
  const entrance = /^\/(?:[^/]+\/)?(?:index\.html)?$/.test(pathname);
  let world = 'real', mode = 'pages', scale = 1;
  try {
    const reader = JSON.parse(localStorage.getItem('alux-reader') ?? '{}') ?? {};
    if (reader.world === 'magic') world = 'magic';
    if (reader.mode === 'scroll') mode = 'scroll';
    if (typeof reader.scale === 'number') scale = reader.scale;
  } catch {}
  let gateway = false;
  try { gateway = entrance && (location.hash === '#worlds' || !sessionStorage.getItem('alux-entered')); } catch {}

  if (native) {
    html.dataset.world = 'real';
  } else {
    html.dataset.world = world;
    html.dataset.reading = mode;
    if (gateway) html.dataset.gateway = '';
    if (world === 'magic' || gateway) {
      html.dataset.reader = '';
      html.style.setProperty('--reader-scale', String(scale));
      if (world === 'magic') {
        // The magic world reads by day or by night only; mdBook's body script applies the result.
        let theme: string | null = null;
        try {
          theme = localStorage.getItem('mdbook-theme') ||
            (localStorage.getItem('alux-reading-theme') === 'dark' || localStorage.getItem('alux-night') === 'true' ? 'coal' : 'light');
          localStorage.setItem('mdbook-theme', ['coal', 'navy', 'ayu'].includes(theme) ? 'coal' : 'light');
        } catch {}
        // Only the magic world reads chapters through the shell.
        if (window.parent === window && new URL(location.href).searchParams.get('reader') !== 'native') {
          html.dataset.shellLoading = '';
          setTimeout(() => html.removeAttribute('data-shell-loading'), 2000);
        }
      }
      // Parser-inserted, so the veil applies before the body renders and the modules run in order.
      document.write('<style id="reader-veil">body{visibility:hidden}</style>' +
        '<script type="module" src="/native-ready.js"></script><script type="module" src="/reader.js"></script>');
    } else {
      // mdBook's own page: the sidebar's first entry (SUMMARY.md's prefix chapter, rendered by
      // toc.js before DOMContentLoaded) leads to the choice between worlds, the header title home.
      document.addEventListener('DOMContentLoaded', () => {
        const first = document.querySelector<HTMLAnchorElement>('.sidebar .chapter > li:first-child > a');
        if (first) first.href = path_to_root + 'index.html#worlds';
        const title = document.querySelector('.menu-title');
        if (!title) return;
        const link = document.createElement('a');
        link.href = path_to_root || './';
        link.textContent = title.textContent;
        title.replaceChildren(link);
      });
      // On the entrance itself the link only changes the hash; load the page again to choose.
      if (entrance) addEventListener('hashchange', () => { if (location.hash === '#worlds') location.reload(); });
    }
  }
})();
