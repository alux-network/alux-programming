import { For } from 'solid-js';
import {
  createElement,
  Search,
  ArrowRight,
  ArrowLeft,
  Menu,
  X,
  Moon,
  Sun,
  BookOpen,
  Github,
  ArrowUpRight,
  Copy,
  Check,
  Bookmark,
  ChevronRight,
  Map,
  WandSparkles,
  SquareCode,
  ScrollText
} from 'lucide';
import { ui, languageURL } from './i18n.ts';
import { languages } from './locale-routing.ts';
import type { LanguageCode } from './locale-routing.ts';
import type { BookGroup, ReaderPage } from './book.ts';

const icons = {
  Search,
  ArrowRight,
  ArrowLeft,
  Menu,
  X,
  Moon,
  Sun,
  BookOpen,
  Github,
  ArrowUpRight,
  Copy,
  Check,
  Bookmark,
  ChevronRight,
  Map,
  WandSparkles,
  SquareCode,
  ScrollText
};
export function icon(name: string): string {
  const key = Object.keys(icons).find(
    (key) => key.toLowerCase() === name.replaceAll('-', '').toLowerCase()
  ) as keyof typeof icons | undefined;
  const node = key ? icons[key] : undefined;
  return node
    ? createElement([
        node[0],
        { ...node[1], 'stroke-width': 1.5, 'aria-hidden': 'true' },
        node[2]
      ]).outerHTML
    : '';
}
export function Icon(props: { name: string }) {
  return <span class="ui-icon" innerHTML={icon(props.name)} />;
}
export function LanguagePicker(props: {
  locale: LanguageCode;
  disabled?: boolean;
  onChange(locale: LanguageCode): void;
}) {
  return (
    <label class="language-picker">
      <span class="visually-hidden">{ui('Language')}</span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="1.3"
      >
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </svg>
      <select
        data-language
        aria-label={ui('Language')}
        value={props.locale}
        disabled={props.disabled}
        onChange={(event) =>
          props.onChange(event.currentTarget.value as LanguageCode)
        }
      >
        <For each={languages}>
          {(language) => <option value={language.code}>{language.name}</option>}
        </For>
      </select>
    </label>
  );
}
export function Brand() {
  return (
    <a
      class="brand crafted-brand"
      href={languageURL('/')}
      aria-label={ui('ALUX Programming home')}
    >
      <img
        class="brand-seal brand-seal-day"
        src="/art/alux-bronze.webp"
        alt=""
        width="72"
        height="72"
      />
      <img
        class="brand-seal brand-seal-night"
        src="/art/alux-bronze-night.webp"
        alt=""
        width="72"
        height="72"
      />
      <span class="brand-letters">
        <span class="brand-name">ALUX</span>
        <span class="brand-subtitle">{ui('PROGRAMMING')}</span>
      </span>
    </a>
  );
}
const romans = ['I', 'II', 'III', 'IV', 'V'];
export function BookSidebar(props: {
  page: ReaderPage;
  pages: ReaderPage[];
  groups: BookGroup[];
  count: number;
  onBookmarks(): void;
  onSearch(): void;
}) {
  return (
    <aside
      class="book-sidebar"
      id="book-sidebar"
      aria-label={ui('Table of contents')}
    >
      <Brand />
      <button class="my-bookmarks" data-bookmarks onClick={props.onBookmarks}>
        <Icon name="bookmark" />
        <span>{ui('My bookmarks')}</span>
        <small data-bookmark-count>{props.count}</small>
      </button>
      <button class="sidebar-search" data-search onClick={props.onSearch}>
        <Icon name="search" />
        <span>{ui('Search the book')}</span>
        <kbd>Ctrl K</kbd>
      </button>
      <nav>
        <a
          class="intro-nav"
          classList={{ active: props.page.source === 'index.md' }}
          href={languageURL('/introduction.html')}
        >
          <Icon name="book-open" />
          {ui('Introduction')}
        </a>
        <For each={props.groups}>
          {(group, index) => (
            <section class="sidebar-group">
              <h2>
                <span>{romans[index()]}</span>
                {group.title}
              </h2>
              <For each={group.pages}>
                {(slug, number) => (
                  <a
                    href={languageURL('/' + slug)}
                    classList={{ active: slug === props.page.slug }}
                    aria-current={slug === props.page.slug ? 'page' : undefined}
                  >
                    <span>{String(number() + 1).padStart(2, '0')}</span>
                    {props.pages.find((page) => page.slug === slug)?.title}
                  </a>
                )}
              </For>
            </section>
          )}
        </For>
      </nav>
      <div class="sidebar-bottom">
        <a
          class="sidebar-source"
          href="https://github.com/alux-network/alux-programming"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ui('Source on GitHub')}
          title={ui('Source on GitHub')}
        >
          <Icon name="github" />
        </a>
      </div>
    </aside>
  );
}
