/** The two readers consume this model; mdBook paths are a build-time concern. */
export interface Heading {
  level: number;
  id: string;
  text: string;
}
export interface ReaderPage {
  id: string;
  title: string;
  source: string;
  group: string;
  slug: string;
  hash: string;
  markdown: string;
  headings: Heading[];
  html: string;
  text: string;
  minutes: number;
  parentId: string | null;
  children: string[];
  anchorAliases?: Record<string, string>;
}
export interface BookGroup {
  title: string;
  pages: string[];
}
export type BookNode =
  | { kind: 'chapter'; id: string; title: string; children: BookNode[] }
  | { kind: 'part'; title: string }
  | { kind: 'separator' };
export interface ReaderBook {
  groups: BookGroup[];
  pages: ReaderPage[];
  toc: BookNode[];
}
export interface ReaderStorage {
  get(key: string): string | null;
  set(key: string, value: string | number | boolean): void;
}
export type Icon = (name: string) => string;
export type Navigate = (href: string) => void | Promise<void>;
export type Announce = (
  message: string,
  returnFocus?: HTMLElement | null
) => void;
export interface ReaderController {
  getCurrentAnchor(): string | undefined;
  goToAnchor(id: string, animate?: boolean): void;
  restorePosition?(): void;
  openContents?(): void;
  dispose(): void;
}
