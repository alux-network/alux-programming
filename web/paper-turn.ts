// Paints a temporary soft-paper turn from the current mdBook column layout. These are visual
// snapshots, never another book model: reader.ts still owns content, progress and navigation.
// StPageFlip is the same standalone renderer used by the approved reader, without its old framework.
import { PageFlip } from 'page-flip';

/** Copies a book surface without identifiers, running media or executable chapter scripts. */
function snapshot(source: HTMLElement): HTMLElement {
  const copy = source.cloneNode(true) as HTMLElement;
  const media = source.querySelectorAll<HTMLElement>('iframe,video,audio,script');
  copy.querySelectorAll<HTMLElement>('iframe,video,audio,script').forEach((element, index) => {
    const style = getComputedStyle(media[index]!);
    const placeholder = document.createElement('div');
    placeholder.style.cssText = `width:${style.width};height:${style.height};margin:${style.margin}`;
    element.replaceWith(placeholder);
  });
  // A snapshot can cross into another chapter directory; retain the already-selected asset URL.
  const originals = source.querySelectorAll<HTMLImageElement>('img');
  copy.querySelectorAll<HTMLImageElement>('img').forEach((img,index) => {
    const original = originals[index]!;
    img.src = original.currentSrc || original.src;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
  });
  copy.querySelectorAll('picture source').forEach((source) => source.remove());
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
  return copy;
}

/** Owns one soft-page renderer for this document; exposes only show, cancel and active state. */
export function paperTurn(main: HTMLElement) {
  const volume = main.parentElement!;
  const host = document.createElement('div');
  host.className = 'paper-fold-renderer';
  host.hidden = true;
  host.inert = true;
  host.setAttribute('aria-hidden', 'true');
  volume.append(host);
  let engine: PageFlip | undefined;
  let active = false;
  let completion: (() => void) | undefined;
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  /** Discards a turn when the user changes world or geometry; never fires obsolete navigation. */
  function cancel() {
    active = false;
    completion = undefined;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    engine?.getRender()?.finishAnimation();
    host.hidden = true;
    host.classList.remove('turn-leaf');
    host.querySelectorAll('.turn-sheet').forEach((sheet) => sheet.remove());
  }

  /** Completes the requested reading change before revealing the actual chapter below the snapshot. */
  function finish() {
    if (!active) return;
    const done = completion;
    cancel();
    done?.();
  }

  /** Captures the laid-out spread at the current scroll position, including its running heads. */
  function sheets(): HTMLElement[] {
    const outer = volume.getBoundingClientRect(), body = main.getBoundingClientRect();
    const portrait = getComputedStyle(main).columnCount === '1';
    const count = portrait ? 1 : 2;
    const width = (outer.width - 34) / count, height = outer.height - 34;
    return Array.from({ length: count }, (_, side) => {
      const sheet = document.createElement('div');
      sheet.className = 'turn-sheet';
      sheet.dataset.density = 'soft';
      sheet.style.width = width + 'px';
      sheet.style.height = height + 'px';
      const clip = document.createElement('div');
      clip.className = 'turn-sheet-content';
      const window = document.createElement('div');
      window.className = 'turn-text-window';
      window.style.cssText = `position:absolute;overflow:hidden;width:${body.width}px;height:${body.height}px;left:${body.left - outer.left - 17 - side * width}px;top:${body.top - outer.top - 17}px`;
      const copy = snapshot(main);
      // StPageFlip clones the reverse leaf. CSS offsets survive cloning; scrollLeft does not.
      copy.style.cssText = `position:absolute;overflow:visible;width:${body.width}px;height:${body.height}px;left:${-main.scrollLeft}px;top:0;margin:0`;
      window.append(copy);
      clip.append(window);
      sheet.append(clip);
      for (const original of volume.querySelectorAll<HTMLElement>(':scope > .page-head, :scope > .page-foot')) {
        const rect = original.getBoundingClientRect();
        if (!rect.width || (count === 2 && (rect.left > outer.left + outer.width / 2 ? 1 : 0) !== side)) continue;
        const detail = snapshot(original);
        detail.style.cssText = `position:absolute;left:${rect.left - outer.left - 17 - side * width}px;top:${rect.top - outer.top - 17}px;width:${rect.width}px;height:${rect.height}px;right:auto;bottom:auto;margin:0`;
        clip.append(detail);
      }
      return sheet;
    });
  }

  /** Folds between two captured spreads, keeping the actual reader unchanged until the fold settles. */
  function show(before: HTMLElement[], after: HTMLElement[], delta: number, done: () => void, onStart?: () => void) {
    cancel();
    const backwards = (delta < 0) !== (document.documentElement.dir === 'rtl');
    const portrait = before.length === 1;
    const width = parseFloat(before[0]!.style.width), height = parseFloat(before[0]!.style.height);
    const pages = backwards ? [...after, ...before] : [...before, ...after];
    Object.assign(host.style, { position: 'absolute', left: '14px', top: '14px', width: width * before.length + 'px', height: height + 'px', minWidth: '0', minHeight: '0' });
    host.hidden = false;
    host.classList.add('turn-leaf');
    completion = done;
    active = true;
    if (!engine) {
      engine = new PageFlip(host, {
        width, height, size: 'fixed', autoSize: false, usePortrait: portrait, showCover: false,
        flippingTime: 700, drawShadow: true, maxShadowOpacity: document.documentElement.classList.contains('coal') ? .55 : .25,
        useMouseEvents: false, mobileScrollSupport: false, showPageCorners: false,
      });
      engine.loadFromHTML(pages);
      // Upstream 2.0.7 starts an uncancellable frame loop. Reuse one engine, and suppress its
      // drawing while idle rather than leaking another loop and detached book on every click.
      const renderer = engine.getRender(), render = renderer.render.bind(renderer);
      renderer.render = (time) => { if (active) render(time); };
      let started = false;
      engine.on('changeState', ({ data }) => {
        if (data === 'flipping') started = true;
        // Finish after upstream clears its animation; cancelling from inside its callback is reentrant.
        if (started && data === 'read') { started = false; queueMicrotask(finish); }
      });
    } else {
      Object.assign(engine.getSettings(), { width, height, minWidth: width, maxWidth: width, minHeight: height, maxHeight: height, usePortrait: portrait });
      engine.updateFromHtml(pages);
      engine.update();
    }
    engine.turnToPage(backwards ? after.length : 0);
    // Cover both initial paint frames; no new-spread flash before the paper starts bending.
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      if (!active) return;
      onStart?.();
      if (backwards) engine!.flipPrev('bottom'); else engine!.flipNext('bottom');
    }); });
    timer = setTimeout(finish, 1100);
  }
  return { sheets, show, cancel, get active() { return active; } };
}
