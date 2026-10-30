// StPageFlip 2.0.7's public HTML API plus the pinned renderer hook used to suspend idle drawing.
// Upstream ships no type declarations: https://github.com/Nodlik/StPageFlip/tree/v2.0.7
// Keep this surface limited to what paper-turn.ts actually calls.
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
    getFlipController(): {start(point:{x:number;y:number}):boolean;fold(point:{x:number;y:number}):void;stopMove():void};
    getState(): string;
    on(event: 'changeState', listener: (event: { data: string }) => void): void;
    getRender(): { convertToGlobal(point:{x:number;y:number}):{x:number;y:number}; drawFrame(): void; finishAnimation(): void; setFlippingPage(page: { getElement(): HTMLElement } | null): void };
  }
}
