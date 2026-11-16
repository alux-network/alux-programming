// StPageFlip public HTML API used by the reader. Version-specific hooks live only in stpageflip-adapter.ts.
declare module 'page-flip' {
  export interface Settings {
    width: number; height: number; minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number;
    size?: 'fixed'; autoSize?: boolean; usePortrait?: boolean; showCover?: boolean; startPage?: number;
    flippingTime?: number; drawShadow?: boolean; maxShadowOpacity?: number; useMouseEvents?: boolean;
    mobileScrollSupport?: boolean; showPageCorners?: boolean;
  }
  export class PageFlip {
    constructor(element: HTMLElement, settings: Settings);
    loadFromHTML(items: HTMLElement[]): void;
    updateFromHtml(items: HTMLElement[]): void;
    getSettings(): Settings;
    update(): void;
    turnToPage(index: number): void;
    getBoundsRect(): {left:number;top:number;width:number;height:number;pageWidth:number};
    getState(): string;
    on(event: 'changeState', listener: (event: { data: string }) => void): void;
  }
}
