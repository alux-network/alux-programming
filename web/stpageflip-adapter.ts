// Version-specific StPageFlip 2.0.7 bridge. This is the only module allowed to reach its internals.
// The public declaration deliberately excludes these hooks. Upgrade with the adapter contract test.
import { PageFlip } from 'page-flip';
import type { Settings } from 'page-flip';

interface Point { x: number; y: number }
interface Renderer {
  convertToGlobal(point: Point): Point;
  drawFrame(): void;
  finishAnimation(): void;
  setFlippingPage(page: { getElement(): HTMLElement } | null): void;
}
interface Internals {
  getRender(): Renderer;
  getFlipController(): { start(point: Point): boolean; fold(point: Point): void; stopMove(): void };
}
export { STPAGEFLIP_VERSION } from './stpageflip-version.ts';
export const FOLD_DURATION_MS = 700;

/** Creates the pinned renderer with idle drawing suspended and only its curling leaf marked. */
export function createPaperEngine(host: HTMLElement, settings: Settings, active: () => boolean) {
  const engine = new PageFlip(host, settings);
  const privateEngine = engine as unknown as Internals;
  const renderer = privateEngine.getRender;
  // loadFromHTML initializes the renderer, so install hooks only after the first load.
  let hooked = false;
  return {
    engine,
    load(pages: HTMLElement[]) {
      engine.loadFromHTML(pages);
      if (hooked) return;
      hooked = true;
      const render = renderer.call(privateEngine);
      const draw = render.drawFrame.bind(render), set = render.setFlippingPage.bind(render);
      render.drawFrame = () => { if (active()) draw(); };
      render.setFlippingPage = page => {
        host.querySelectorAll('[data-paper-curl]').forEach(element => element.removeAttribute('data-paper-curl'));
        set(page);
        page?.getElement().setAttribute('data-paper-curl', '');
      };
    },
    /** Stops the private drag and releases the native animation without committing navigation. */
    cancel() {
      if (!hooked) return;
      if (engine.getState() === 'user_fold') privateEngine.getFlipController().stopMove();
      privateEngine.getRender().finishAnimation();
    },
    /** Starts at the closed corner; native flip() would start at an already lifted pose. */
    start(backwards: boolean) {
      const rect = engine.getBoundsRect();
      return privateEngine.getFlipController().start({ x: backwards ? 10 : rect.left + rect.pageWidth * 2 - 10, y: rect.height - 2 });
    },
    /** Paints a closed-to-closed curl at normalized progress, with matching surface lighting. */
    fold(progress: number) {
      const rect = engine.getBoundsRect(), eased = (1 - Math.cos(Math.PI * progress)) / 2;
      const light = Math.sin(Math.PI * eased);
      host.style.setProperty('--curl-light', (light * 100).toFixed(3) + '%');
      privateEngine.getFlipController().fold(privateEngine.getRender().convertToGlobal({
        x: (rect.pageWidth - 1) * (1 - 2 * eased), y: rect.height - 1 - light * rect.height * .08,
      }));
    },
    release() { privateEngine.getFlipController().stopMove(); },
  };
}
