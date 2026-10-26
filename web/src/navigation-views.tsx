import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { Brand, Icon, LanguagePicker } from './reader-ui.tsx';
import { ui, fmt, languageURL } from './i18n.ts';
import { partRoutes } from './contents.ts';
import type { ReaderBook } from './book.ts';
import type { LanguageCode } from './locale-routing.ts';
const roman = ['I', 'II', 'III', 'IV', 'V'];
interface NavigationProps {
  locale: LanguageCode;
  onLanguage(locale: LanguageCode): void;
  onSearch(): void;
}
export function SiteHeader(props: NavigationProps) {
  return (
    <header class="site-header">
      <Brand />
      <nav aria-label={ui('Chapters')}>
        <a class="worlds-nav" href={languageURL('/')}>
          {ui('Choose world')}
        </a>
        <a href={languageURL('/introduction.html')}>{ui('The book')}</a>
        <a href={languageURL('/contents.html')}>{ui('Chapters')}</a>
        <a
          href="https://github.com/alux-network/alux-programming"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub <Icon name="arrow-up-right" />
        </a>
      </nav>
      <button
        data-search
        class="search-button"
        aria-label={ui('Search the book')}
        onClick={props.onSearch}
      >
        <Icon name="search" />
        <span>{ui('Search')}</span>
        <kbd>⌘ / Ctrl K</kbd>
      </button>
      <LanguagePicker locale={props.locale} onChange={props.onLanguage} />
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer class="site-footer">
      <div>
        <Brand />
        <p>{ui('Clear ideas. Composable programs.')}</p>
      </div>
      <div>
        <a href={languageURL('/about.html')}>
          {ui('About the book')} <Icon name="arrow-up-right" />
        </a>
        <a
          href="https://www.alux.network/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {ui('ALUX Network')} <Icon name="arrow-up-right" />
        </a>
        <a
          href="https://github.com/alux-network/alux-programming"
          target="_blank"
          rel="noopener noreferrer"
        >
          {ui('Source on GitHub')} <Icon name="arrow-up-right" />
        </a>
      </div>
      <span>
        {ui('Made of ideas.')}
        <br />
        {ui('Built to be explored.')}
      </span>
    </footer>
  );
}
export function ContentsView(props: {
  book: ReaderBook;
  real: boolean;
  dark: boolean;
  locale: LanguageCode;
  onLanguage(locale: LanguageCode): void;
  onSearch(): void;
}) {
  const prefix = () => (props.real ? '/real/' : '/');
  createEffect(() => {
    document.body.className =
      'contents-view' +
      (props.dark ? ' contents-night' : '') +
      (props.real ? ' contents-real' : '');
  });
  return (
    <>
      <header class="contents-toolbar">
        <Brand />
        <div>
          <button
            class="icon-button"
            data-search
            aria-label={ui('Search the book')}
            onClick={props.onSearch}
          >
            <Icon name="search" />
          </button>
          <LanguagePicker locale={props.locale} onChange={props.onLanguage} />
        </div>
      </header>
      <main id="main" class="contents-main">
        <header class="contents-heading">
          <h1>{ui('Table of contents')}</h1>
          <a
            class="contents-introduction"
            href={languageURL(prefix() + 'introduction.html')}
          >
            {ui('Read the introduction')} <Icon name="arrow-right" />
          </a>
        </header>
        <div class="contents-spread">
          <For each={props.book.groups}>
            {(group, index) => (
              <section class="contents-part">
                <header>
                  <span class="contents-roman">{roman[index()]}</span>
                  <h2>{group.title}</h2>
                </header>
                <ol>
                  <For each={group.pages}>
                    {(slug, number) => (
                      <li>
                        <a href={languageURL(prefix() + slug)}>
                          <span>{String(number() + 1).padStart(2, '0')}</span>
                          <strong>
                            {
                              props.book.pages.find(
                                (page) => page.slug === slug
                              )?.title
                            }
                          </strong>
                          <Icon name="arrow-up-right" />
                        </a>
                      </li>
                    )}
                  </For>
                </ol>
              </section>
            )}
          </For>
        </div>
      </main>
    </>
  );
}
const atlasDescriptions = [
  'Start with what a program means. Explore denotations, compositionality, laws, and the relationship between meaning and representation.',
  'Give meaning a concrete vocabulary. Explore capability traits, derived operations, interpreters, evidence, and compiler pipelines in Rust.',
  'Look beneath the surface of a program. Explore the structures and transformations that connect ideas to execution.',
  'Return to familiar ideas with a new perspective. Follow the connections between the semantic view and real programming machinery.'
] as const;
export function AtlasView(props: { book: ReaderBook }) {
  const groups = () => props.book.groups.slice(0, 4),
    [selected, setSelected] = createSignal(0);
  let detail!: HTMLElement;
  const select = (index: number) =>
    setSelected((index + groups().length) % groups().length);
  onMount(() => {
    document.body.className = 'atlas-view';
  });
  createEffect(() => {
    selected();
    if (detail && !matchMedia('(prefers-reduced-motion:reduce)').matches)
      detail.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: 320, easing: 'ease-out' }
      );
  });
  return (
    <main id="main" class="atlas-main">
      <div class="atlas-heading">
        <div>
          <div class="section-label">
            <span />
            {ui('THE CHAPTER ATLAS')}
          </div>
          <h1>{ui('A world of ideas.')}</h1>
        </div>
        <p>
          {ui('Choose a world.')}
          <br />
          {ui('Follow an idea as far as it takes you.')}
        </p>
        <a href={languageURL('/contents.html')} class="atlas-list-link">
          {ui('Browse as a list')} <Icon name="arrow-right" />
        </a>
      </div>
      <div class="atlas-experience">
        <div
          class="atlas-map"
          aria-label={ui('Interactive chapter map')}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault();
              select(selected() + (event.key === 'ArrowRight' ? 1 : -1));
              event.currentTarget
                .querySelector<HTMLButtonElement>(
                  '[data-world="' + selected() + '"]'
                )
                ?.focus();
            }
          }}
        >
          <svg class="atlas-route" viewBox="0 0 800 600" aria-hidden="true">
            <path d="M235 120 C550 0 700 100 640 250 S470 480 330 460 S80 540 120 330 S200 250 235 120" />
            <ellipse cx="400" cy="300" rx="310" ry="220" />
          </svg>
          <span class="atlas-star star-a" aria-hidden="true">
            ✦
          </span>
          <span class="atlas-star star-b" aria-hidden="true">
            ✦
          </span>
          <span class="atlas-star star-c" aria-hidden="true">
            +
          </span>
          <span class="atlas-map-note">{ui('⟦ parts ⟧ → whole')}</span>
          <For each={groups()}>
            {(group, index) => (
              <button
                class={'atlas-node node-' + index()}
                classList={{ selected: index() === selected() }}
                data-world={index()}
                aria-label={fmt({ key: 'explore', value: group.title })}
                aria-pressed={index() === selected()}
                onClick={() => select(index())}
              >
                <span class="atlas-node-number">{roman[index()]}</span>
                <img
                  src={'/art/world-' + index() + '.webp'}
                  width="543"
                  height="724"
                  alt=""
                  draggable={false}
                />
                <span class="atlas-node-title">{group.title}</span>
                <span class="atlas-node-dot" />
              </button>
            )}
          </For>
          <div class="atlas-navigation">
            <button
              class="icon-button"
              id="atlas-prev"
              aria-label={ui('Previous world')}
              onClick={() => select(selected() - 1)}
            >
              <Icon name="arrow-left" />
            </button>
            <span id="atlas-position">0{selected() + 1} / 04</span>
            <button
              class="icon-button"
              id="atlas-next"
              aria-label={ui('Next world')}
              onClick={() => select(selected() + 1)}
            >
              <Icon name="arrow-right" />
            </button>
          </div>
        </div>
        <section
          class="atlas-detail"
          id="atlas-detail"
          ref={detail}
          aria-live="polite"
          aria-atomic="true"
        >
          <span class="atlas-part">
            {fmt({ key: 'part', value: roman[selected()]! })}
          </span>
          <h2>{groups()[selected()]?.title}</h2>
          <p>{ui(atlasDescriptions[selected()]!)}</p>
          <div class="atlas-chapter-list">
            <For each={groups()[selected()]?.pages}>
              {(slug, index) => (
                <a href={languageURL('/' + slug)}>
                  <span>{String(index() + 1).padStart(2, '0')}</span>
                  {props.book.pages.find((page) => page.slug === slug)?.title}
                  <Icon name="arrow-up-right" />
                </a>
              )}
            </For>
          </div>
          <a
            href={languageURL('/' + partRoutes[selected()])}
            class="button primary"
          >
            {ui('Enter this world')} <Icon name="arrow-right" />
          </a>
        </section>
      </div>
    </main>
  );
}
const partDescriptions = [
  'Begin with the meaning of a program. Explore denotations, compositionality, laws, interpretations, and the role of dependent types.',
  'Carry meaning-first design into Rust: capability algebras, semantic types, derived operations, interpreters, evidence, and language pipelines.',
  'Explore execution models and useful machinery: operational semantics, the expression problem, free monads, continuations, and branching.',
  'Connect the machinery back to meaning. Revisit semantics, the expression problem, referential transparency, and the EVM.'
] as const;
export function PartView(props: { book: ReaderBook; index: number }) {
  const group = () => props.book.groups[props.index]!;
  onMount(() => {
    document.body.className = 'part-view';
  });
  return (
    <main id="main" class="part-main">
      <div class="part-breadcrumb">
        <a href={languageURL('/contents.html')}>{ui('Table of contents')}</a>
        <Icon name="chevron-right" />
        <span>{fmt({ key: 'part', value: roman[props.index]! })}</span>
      </div>
      <section class="part-opening">
        <div class="part-frontispiece">
          <span class="part-front-number">{roman[props.index]}</span>
          <div class="section-label">
            {fmt({ key: 'part', value: roman[props.index]! })}
          </div>
          <h1>{group().title}</h1>
          <p>{ui(partDescriptions[props.index]!)}</p>
          <img
            src={'/art/world-' + props.index + '.webp'}
            alt=""
            width="543"
            height="724"
          />
          <a
            class="button primary"
            data-open-book
            href={languageURL('/' + group().pages[0])}
          >
            {fmt({ key: 'part', value: roman[props.index]!, begin: true })}{' '}
            <Icon name="arrow-right" />
          </a>
        </div>
        <div class="part-chapters">
          <div class="section-label">
            <span />
            {fmt({ key: 'chapterCount', value: group().pages.length })}
          </div>
          <For each={group().pages}>
            {(slug, index) => {
              const page = props.book.pages.find((page) => page.slug === slug)!;
              return (
                <a href={languageURL('/' + slug)} class="part-chapter">
                  <span>{String(index() + 1).padStart(2, '0')}</span>
                  <div>
                    <h2>{page.title}</h2>
                    <p>{fmt({ key: 'minutes', value: page.minutes })}</p>
                  </div>
                  <Icon name="arrow-right" />
                </a>
              );
            }}
          </For>
          <nav class="part-pagination">
            <Show when={props.index > 0} fallback={<span />}>
              <a href={languageURL('/' + partRoutes[props.index - 1])}>
                <Icon name="arrow-left" />{' '}
                {fmt({ key: 'part', value: roman[props.index - 1]! })}
              </a>
            </Show>
            <Show
              when={props.index < 3}
              fallback={
                <a href={languageURL('/about.html')}>
                  {ui('About the book')} <Icon name="arrow-right" />
                </a>
              }
            >
              <a href={languageURL('/' + partRoutes[props.index + 1])}>
                {fmt({ key: 'part', value: roman[props.index + 1]! })}{' '}
                <Icon name="arrow-right" />
              </a>
            </Show>
          </nav>
        </div>
      </section>
    </main>
  );
}
