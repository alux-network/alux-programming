declare module 'page-flip' {
  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    autoSize?: boolean;
    drawShadow?: boolean;
    flippingTime?: number;
    maxShadowOpacity?: number;
    usePortrait?: boolean;
    showCover?: boolean;
    startPage?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    disableFlipByClick?: boolean;
    mobileScrollSupport?: boolean;
    showPageCorners?: boolean;
  }

  export interface PageFlipEvent {
    data: string | number;
  }

  export interface PageFlipPage {
    setDensity(density: 'soft' | 'hard'): void;
    setDrawingDensity(density: 'soft' | 'hard'): void;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    destroy(): void;
    getCurrentPageIndex(): number;
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    flip(page: number, corner?: 'top' | 'bottom'): void;
    on(event: 'flip' | 'changeState', listener: (event: PageFlipEvent) => void): void;
    loadFromHTML(elements: HTMLElement[]): void;
    getPage(index: number): PageFlipPage;
  }
}
