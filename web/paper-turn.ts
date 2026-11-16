// Paints a temporary soft-paper turn from the current mdBook column layout. These are visual
// snapshots, never another book model: reader.ts still owns content, progress and navigation.
// StPageFlip is the same standalone renderer used by the approved reader, without its old framework.
import { createPaperEngine, FOLD_DURATION_MS } from './stpageflip-adapter.ts';
import { acceptsReady, transition, transitionState } from './reader-transition.ts';
import type { ReaderView } from './reader-transition.ts';

// Inert media artwork is derived from the current native chapter, never another player.
const mediaArtwork = new WeakMap<HTMLElement, HTMLImageElement>();

/** Warms the current chapter's video artwork without creating a second playback context. */
function prepareMedia(main: HTMLElement) {
  for (const media of main.querySelectorAll<HTMLElement>('iframe,video')) {
    let url = media instanceof HTMLVideoElement ? media.poster : '';
    if (media instanceof HTMLIFrameElement) {
      const source = new URL(media.src,document.baseURI);
      const match = source.pathname.match(/^\/embed\/([\w-]{11})$/);
      if (/^(www\.)?youtube(-nocookie)?\.com$/.test(source.hostname) && match) url = `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
    if (!url) continue;
    const image = new Image();
    image.alt = '';
    image.referrerPolicy = 'no-referrer';
    image.decoding = 'async';
    image.src = url;
    mediaArtwork.set(media,image);
  }
}

/** Copies a book surface without identifiers, running media or executable chapter scripts. */
function snapshot(source: HTMLElement): HTMLElement {
  const copy = source.cloneNode(true) as HTMLElement;
  // Pair each original node with its clone before changing either subtree. A removed
  // media/picture child cannot change the correspondence of later descendants.
  /** Separates the original outer box from its scrollbar-free, clipped content viewport. */
  function freezeScroll(original: HTMLElement, clone: HTMLElement, moving: HTMLElement) {
    const style = getComputedStyle(original), box = original.getBoundingClientRect();
    // client sizes include padding but exclude borders and classic scrollbar gutters.
    const width = box.width - original.offsetWidth + original.clientWidth;
    const height = box.height - original.offsetHeight + original.clientHeight;
    const outer = document.createElement('span');
    outer.className = 'turn-scroll-box';
    outer.style.cssText = `display:${style.display === 'inline' ? 'inline-block' : style.display};box-sizing:border-box;width:${box.width}px;height:${box.height}px;min-width:0;max-width:none;min-height:0;max-height:none;margin:${style.margin};padding:0;border:${style.border};border-radius:${style.borderRadius};background:${style.background};overflow:hidden;vertical-align:${style.verticalAlign};break-inside:${style.breakInside};`;
    // Keep the original element and its direct descendants together: KaTeX uses
    // parent-sensitive rules. Its padding is part of the clipped native viewport.
    clone.style.cssText += `display:block;box-sizing:border-box;width:${width}px;height:${height}px;min-width:0;max-width:none;min-height:0;max-height:none;margin:0;border:0;border-radius:0;padding:${style.padding};overflow:hidden;scrollbar-gutter:auto;font-family:${style.fontFamily};font-size:${style.fontSize};line-height:${style.lineHeight};white-space:${style.whiteSpace};direction:${style.direction};`;
    // Code no longer sits directly under pre, so retain that selector's resolved paint and text rules.
    Object.assign(clone.style, { color: style.color, background: style.background, fontWeight: style.fontWeight,
      fontStyle: style.fontStyle, letterSpacing: style.letterSpacing, wordBreak: style.wordBreak,
      overflowWrap: style.overflowWrap, tabSize: style.tabSize });
    moving.style.transform = `translate(${-original.scrollLeft}px,${-original.scrollTop}px)`;
    clone.replaceWith(outer);
    outer.append(clone);
  }
  function visit(original: Node, clone: Node): void {
    const sources = [...original.childNodes], copies = [...clone.childNodes];
    sources.forEach((node, index) => visit(node, copies[index]!));
    if (clone instanceof Element) clone.removeAttribute('id');
    if (!(original instanceof HTMLElement) || !(clone instanceof HTMLElement)) return;
    if (original instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
      clone.src = original.currentSrc || original.src;
      clone.removeAttribute('srcset'); clone.removeAttribute('sizes');
    }
    if (original.matches('picture source')) { clone.remove(); return; }
    if (original.matches('iframe,video,audio,script')) {
      const style = getComputedStyle(original), placeholder = document.createElement('div');
      placeholder.style.cssText = `width:${style.width};height:${style.height};margin:${style.margin};padding:${style.padding};border:${style.border};box-sizing:${style.boxSizing};display:${style.display === 'inline' ? 'inline-block' : style.display};vertical-align:${style.verticalAlign}`;
      if (original.matches('iframe,video')) {
        placeholder.className = 'turn-media';
        const artwork = mediaArtwork.get(original);
        if (artwork) placeholder.append(artwork.cloneNode(true));
        else {
          const label = document.createElement('span');
          label.className = 'turn-media-label';
          label.textContent = original.getAttribute('title') || original.getAttribute('aria-label') || 'Video';
          placeholder.append(label);
        }
      }
      clone.replaceWith(placeholder);
      return;
    }
    if (original.matches('.table-wrapper,.katex-display') && (original.scrollLeft || original.scrollTop)) {
      const selector = original.matches('.table-wrapper') ? 'table' : ':scope > .katex';
      const moving = clone.querySelector<HTMLElement>(selector);
      if (moving) freezeScroll(original, clone, moving);
    }
    if (original.matches('pre > code') && (original.scrollLeft || original.scrollTop)) {
      const text = document.createElement('span');
      text.style.display = 'block';
      text.append(...clone.childNodes); clone.append(text);
      freezeScroll(original, clone, text);
    }
    if (original.matches('link[rel=stylesheet]')) clone.removeAttribute('href');
  }
  visit(source, copy);
  return copy;
}

/** Reads the resolved CSS paper inset so measurement and paint share one definition. */
function paperInset(): number {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--paper-inset);height:0;pointer-events:none';
  const volume = document.querySelector('.volume')!;
  volume.append(probe);
  const inset = parseFloat(getComputedStyle(probe).width);
  probe.remove();
  if (!Number.isFinite(inset)) throw new Error('Missing CSS paper inset');
  return inset;
}

/** Interprets reading transitions as soft folds and defers font measurement until they settle. */
export function paperTurn(main: HTMLElement, view: () => ReaderView) {
  prepareMedia(main);
  const volume = main.parentElement!;
  const host = document.createElement('div');
  host.className = 'paper-fold-renderer';
  host.hidden = true;
  host.inert = true;
  host.setAttribute('aria-hidden', 'true');
  volume.append(host);
  let adapter: ReturnType<typeof createPaperEngine> | undefined;
  let state = transitionState(view());
  let measured = state.measurement;
  let active = false;
  let completion: ((view: ReaderView) => void) | undefined;
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  /** Removes presentation resources without changing the reading transition. */
  function clearPresentation() {
    active = false;
    delete volume.dataset.paperTurning;
    completion = undefined;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    adapter?.cancel();
    host.hidden = true;
    host.classList.remove('turn-leaf');
    host.querySelectorAll('.turn-sheet').forEach((sheet) => sheet.remove());
  }

  /** Replaces a pending view when geometry or reading presentation changes. */
  function cancel() {
    state = transition(state, { type: 'replace', view: view() });
    measured = state.measurement;
    clearPresentation();
  }

  /** Completes the requested reading change before revealing the actual chapter below the snapshot. */
  function finish(token: number) {
    if (!active || !acceptsReady(state, token)) return;
    state = transition(state, { type: 'ready', token });
    const done = completion, committed = state.view;
    clearPresentation();
    done?.(committed);
  }

  /** Captures the laid-out spread at the current scroll position, including its running heads. */
  function sheets(): HTMLElement[] {
    const outer = volume.getBoundingClientRect(), body = main.getBoundingClientRect();
    const portrait = getComputedStyle(main).columnCount === '1';
    const count = portrait ? 1 : 2;
    const inset = paperInset();
    const width = (outer.width - inset * 2) / count, height = outer.height - inset * 2;
    const grain = getComputedStyle(volume).backgroundSize.split(',')[1]?.trim().split(/\s+/).map(Number.parseFloat);
    return Array.from({ length: count }, (_, side) => {
      const sheet = document.createElement('div');
      sheet.className = 'turn-sheet';
      sheet.lang = document.documentElement.lang;
      sheet.dir = document.documentElement.dir || 'ltr';
      sheet.dataset.density = 'soft';
      sheet.style.width = width + 'px';
      sheet.style.height = height + 'px';
      const clip = document.createElement('div');
      clip.className = 'turn-sheet-content';
      // The whole book owns the paper grain. Keep its tile phase when each half is
      // painted separately; a re-centered texture makes entry/settling look like a jump.
      if (grain?.length === 2 && grain.every(Number.isFinite)) {
        clip.style.backgroundPosition = `center, ${(outer.width-grain[0]!)/2-inset-side*width}px ${(outer.height-grain[1]!)/2-inset}px, center`;
      }
      const window = document.createElement('div');
      window.className = 'turn-text-window';
      window.style.cssText = `position:absolute;overflow:hidden;width:${body.width}px;height:${body.height}px;left:${body.left - outer.left - inset - side * width}px;top:${body.top - outer.top - inset}px`;
      const copy = snapshot(main);
      // StPageFlip clones the reverse leaf. CSS offsets survive cloning; scrollLeft does not.
      const layout = getComputedStyle(main);
      // Freeze the source leading as a ratio so smaller descendants keep their own line boxes.
      const leading = parseFloat(layout.lineHeight) / parseFloat(layout.fontSize);
      copy.style.cssText = `direction:${layout.direction};column-count:${layout.columnCount};column-gap:${layout.columnGap};column-fill:${layout.columnFill};font-family:${layout.fontFamily};font-size:${layout.fontSize};line-height:${Number.isFinite(leading) ? leading : layout.lineHeight};position:absolute;overflow:visible;width:${body.width}px;height:${body.height}px;left:${-main.scrollLeft}px;top:0;margin:0`;
      window.append(copy);
      clip.append(window);
      sheet.append(clip);
      for (const original of volume.querySelectorAll<HTMLElement>(':scope > .page-head, :scope > .page-foot')) {
        const rect = original.getBoundingClientRect();
        if (!rect.width || (count === 2 && (rect.left > outer.left + outer.width / 2 ? 1 : 0) !== side)) continue;
        const detail = snapshot(original);
        detail.style.cssText = `position:absolute;box-sizing:border-box;left:${rect.left - outer.left - inset - side * width}px;top:${rect.top - outer.top - inset}px;width:${rect.width}px;height:${rect.height}px;right:auto;bottom:auto;margin:0`;
        clip.append(detail);
      }
      return sheet;
    });
  }

  /** Folds between two captured spreads, keeping the actual reader unchanged until the fold settles. */
  function show(before: HTMLElement[], after: HTMLElement[], delta: number, done: (view: ReaderView) => void, onStart?: () => void, destination = view()) {
    cancel();
    const backwards = (delta < 0) !== (document.documentElement.dir === 'rtl');
    const portrait = before.length === 1;
    const width = parseFloat(before[0]!.style.width), height = parseFloat(before[0]!.style.height);
    const pages = backwards ? [...after, ...before] : [...before, ...after];
    const inset = paperInset();
    // Fixed positioning must include that border, unlike an absolute padding-box origin.
    // Paper can curl beyond the cover without enlarging document overflow or moving scrollbars.
    const cover = volume.getBoundingClientRect();
    Object.assign(host.style, { position: 'fixed', left: '0px', top: '0px', width: width * before.length + 'px', height: height + 'px', minWidth: '0', minHeight: '0' });
    host.hidden = false;
    const origin = host.getBoundingClientRect();
    host.style.left = cover.left + inset - origin.left + 'px';
    host.style.top = cover.top + inset - origin.top + 'px';
    host.hidden = false;
    host.classList.add('turn-leaf');
    completion = done;
    state = transition(state, { type: 'begin', view: destination });
    const token = state.pending!.token;
    active = true;
    volume.dataset.paperTurning = '';
    if (!adapter) {
      adapter = createPaperEngine(host, {
        width, height, size: 'fixed', autoSize: false, usePortrait: portrait, showCover: false,
        flippingTime: FOLD_DURATION_MS, drawShadow: true, maxShadowOpacity: document.documentElement.classList.contains('coal') ? .22 : .3,
        useMouseEvents: false, mobileScrollSupport: false, showPageCorners: false,
      }, () => active);
      adapter.load(pages);
      let started: number | undefined;
      adapter.engine.on('changeState', ({ data }) => {
        if (data === 'flipping' || data === 'user_fold') started = state.pending?.token;
        // Finish after upstream clears its animation; cancelling from inside its callback is reentrant.
        if (started !== undefined && data === 'read') { const completed = started; started = undefined; queueMicrotask(() => finish(completed)); }
      });
    } else {
      Object.assign(adapter.engine.getSettings(), { width, height, minWidth: width, maxWidth: width, minHeight: height, maxHeight: height, usePortrait: portrait, maxShadowOpacity: document.documentElement.classList.contains('coal') ? .22 : .3 });
      adapter.engine.updateFromHtml(pages);
      adapter.engine.update();
    }
    adapter.engine.turnToPage(backwards ? after.length : 0);
    // Cover both initial paint frames; no new-spread flash before the paper starts bending.
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      if (!active) return;
      onStart?.();
      if (!adapter!.start(backwards)) { finish(token); return; }
      // The pinned adapter starts the native drag from the closed edge.
      let began: number | undefined;
      const curl = (time: number) => {
        if (!active || !acceptsReady(state, token)) return;
        began ??= time;
        const progress = Math.min(1, (time - began) / FOLD_DURATION_MS);
        adapter!.fold(progress);
        if (progress < 1) frame=requestAnimationFrame(curl);
        else adapter!.release();
      };
      host.style.setProperty('--curl-light','0%');
      // Portrait start() creates a temporary leaf. Paint its closed pose in this same
      // callback, before upstream's next frame can discard that not-yet-active copy.
      curl(performance.now());
    }); });
    timer = setTimeout(() => finish(token), FOLD_DURATION_MS + 400);
  }
  return { sheets, show, cancel, fontChanged() { state = transition(state, { type: 'font' }); },
    measured() { measured = state.measurement; },
    get measurementPending() { return state.measurement !== measured; }, get active() { return active; } };
}
