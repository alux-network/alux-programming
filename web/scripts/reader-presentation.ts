import { parseHTML } from 'linkedom';
import hljs from 'highlight.js';
import type { Heading } from '../src/book.ts';

export const readingArt: Readonly<Record<string, string>> = {
  'assets/semantic-view.png': '/art/semantic-view.webp',
  'assets/design-by-meaning-rust.png': '/art/capability-crab.webp',
  'assets/concepts.png': '/art/concepts.webp',
  'assets/insights.png': '/art/insights.webp'
};
export interface PresentedChapter { html: string; headings: Heading[]; text: string }

/** Presentation only: mdBook has already rendered Markdown, math and admonitions. */
export function presentChapter(nativeHTML: string, nativePath: string, routes: ReadonlyMap<string, string>): PresentedChapter {
  const { document: nativeDocument } = parseHTML(nativeHTML);
  const document = nativeDocument as unknown as Document;
  const main = document.querySelector('main');
  if (!main) throw new Error(`${nativePath}: mdBook HTML has no main content`);
  const root = document.createElement('article');
  root.innerHTML = main.innerHTML;
  const base = new URL(nativePath, 'https://mdbook.invalid/');
  function address(value: string, image = false): string {
    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
    const url = new URL(value, base);
    const resource = decodeURIComponent(url.pathname.slice(1));
    const route = routes.get(resource);
    if (!image && route) return '/' + route + url.search + url.hash;
    return (readingArt[resource] || '/book-assets/' + resource) + url.search + url.hash;
  }
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = anchor.getAttribute('href') || '';
    anchor.setAttribute('href', address(href));
    if (/^https?:/.test(href)) { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
  }
  for (const image of root.querySelectorAll<HTMLImageElement>('img[src]')) {
    image.setAttribute('src', address(image.getAttribute('src') || '', true));
    // Reserve the exact square aspect ratio even in offscreen, lazy pagination probes.
    if (Object.values(readingArt).includes(image.getAttribute('src') || '')) {
      image.setAttribute('width', '512');
      image.setAttribute('height', '512');
    }
    // Markdown images are lazy; inline raw-HTML marks preserve their original attributes.
    if (!image.hasAttribute('style')) image.setAttribute('loading', 'lazy');
  }
  for (const heading of root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')) {
    const wrapper = heading.querySelector<HTMLAnchorElement>('a.header');
    if (wrapper) wrapper.replaceWith(...wrapper.childNodes);
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor'; anchor.href = '#' + heading.id;
    anchor.setAttribute('aria-label', 'Link to this section'); anchor.textContent = '#';
    heading.append(anchor);
  }
  for (const original of root.querySelectorAll<HTMLElement>('.admonition')) {
    const kind = [...original.classList].find(name => name.startsWith('admonish-'))?.slice(9) || 'note';
    const aside = document.createElement('aside');
    aside.className = 'admonition ' + kind;
    for (const attribute of ['id', 'role', 'aria-labelledby']) if (original.hasAttribute(attribute)) aside.setAttribute(attribute, original.getAttribute(attribute) || '');
    const title = document.createElement('div'); title.className = 'admonition-title';
    const nativeTitle = original.querySelector('.admonition-title');
    const titleParagraph = nativeTitle?.querySelector('p');
    title.innerHTML = titleParagraph?.innerHTML || kind;
    if (title.textContent?.trim().toLowerCase() === kind) title.textContent = kind;
    const titleId = original.getAttribute('aria-labelledby'); if (titleId) title.id = titleId;
    aside.append(title);
    for (const child of [...original.children]) if (child !== nativeTitle) aside.append(...child.childNodes);
    original.replaceWith(aside);
  }
  for (const display of root.querySelectorAll<HTMLElement>('.katex-display')) {
    const wrapper = document.createElement('div'); wrapper.className = 'math-display';
    const parent = display.parentElement;
    if (parent?.tagName === 'P' && parent.textContent?.trim() === display.textContent?.trim()) parent.replaceWith(wrapper);
    else display.before(wrapper);
    wrapper.append(display);
  }
  for (const pre of root.querySelectorAll<HTMLPreElement>('pre')) {
    const code = pre.querySelector('code'); if (!code) continue;
    const info = code.getAttribute('class') || '';
    const language = [...code.classList].find(name => name.startsWith('language-'))?.slice(9) || 'text';
    const text = (code.textContent || '').replace(/\n$/, '');
    code.textContent = text;
    code.className = 'language-' + language;
    if (hljs.getLanguage(language)) code.innerHTML = hljs.highlight(text, { language }).value;
    const block = document.createElement('div'); block.className = 'code-block';
    const toolbar = document.createElement('div'); toolbar.className = 'code-toolbar';
    const label = document.createElement('span'); label.textContent = language; toolbar.append(label);
    const actions = document.createElement('div');
    if (language === 'rust' && !/noplayground|ignore|compile_fail|no_run/.test(info)) {
      const playground = document.createElement('a'); playground.className = 'rust-playground';
      playground.href = 'https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&code=' + encodeURIComponent(text);
      playground.target = '_blank'; playground.rel = 'noopener noreferrer'; playground.textContent = 'Rust Playground ↗'; actions.append(playground);
    }
    const copy = document.createElement('button'); copy.className = 'copy-code'; copy.textContent = 'Copy code'; copy.setAttribute('aria-label', 'Copy code');
    actions.append(copy); toolbar.append(actions); pre.before(block); block.append(toolbar, pre);
  }
  presentClips(root, document, nativePath);
  const headings = [...root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')].map(heading => ({ level: Number(heading.tagName.slice(1)), id: heading.id, text: (heading.textContent || '').replace(/#$/, '').trim() }));
  const textRoot = root.cloneNode(true) as HTMLElement;
  textRoot.querySelectorAll('.heading-anchor,.code-toolbar,.katex-html,.video-clip-range').forEach(node => node.remove());
  return { html: root.innerHTML, headings, text: (textRoot.textContent || '').replace(/\s+/g, ' ').trim() };
}

function presentClips(root: HTMLElement, document: Document, chapter: string): void {
  for (const frame of root.querySelectorAll<HTMLIFrameElement>('iframe[src]')) {
    const src = frame.getAttribute('src') || ''; let url: URL;
    try { url = new URL(src); } catch { continue; }
    const clip = url.searchParams.get('clipt');
    if (url.hostname !== 'www.youtube.com' || !url.pathname.startsWith('/embed/') || !clip) continue;
    const values: number[] = []; let value = 0, shift = 0;
    for (const byte of Buffer.from(clip, 'base64url')) {
      value += (byte & 127) * 2 ** shift;
      if (byte & 128) shift += 7;
      else { values.push(value); value = 0; shift = 0; }
    }
    if (values.length !== 4 || values[0] !== 16 || values[2] !== 24 || values[3] <= values[1]) throw new Error(chapter + ': invalid video clip range');
    const start = Math.floor(values[1] / 1000), end = Math.ceil(values[3] / 1000);
    url.searchParams.set('start', String(start)); url.searchParams.set('end', String(end)); frame.src = url.href;
    const time = (seconds: number): string => [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
    const range = document.createElement('div'); range.className = 'video-clip-range'; range.dir = 'ltr'; range.textContent = time(start) + '–' + time(end);
    frame.closest('figure')?.append(range);
  }
}
