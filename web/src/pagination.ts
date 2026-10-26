import type { Icon, ReaderPage } from './book.ts';
import { englishMessages } from './ui-messages.ts';
import type { MessageKey } from './ui-messages.ts';
import { languagePath } from './locale-routing.ts';
import type { LanguageCode } from './locale-routing.ts';

interface PaginationOptions {
  page: ReaderPage;
  pages: ReaderPage[];
  icon: Icon;
  host: HTMLElement;
  w: number;
  h: number;
  portrait: boolean;
  label?: (key: MessageKey) => string;
  locale?: LanguageCode;
}

// One layout algorithm measures the viewed chapter; other chapters are never measured for totals.
const escape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character] ?? character
  );

function content(sheet: HTMLElement): HTMLElement {
  const element = sheet.querySelector<HTMLElement>('.folio-content');
  if (!element) throw new Error('Missing folio content element');
  return element;
}

export function prepareChapterSource(
  page: ReaderPage,
  label: (key: MessageKey) => string = (key) => englishMessages[key],
  locale: LanguageCode = 'en'
): HTMLDivElement {
  const source = document.createElement('div');
  source.innerHTML = page.html;
  if (page.slug === 'introduction.html')
    source.querySelector('.admonition.warning')?.remove();
  source.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', label('Scrollable table'));
    table.before(wrap);
    wrap.append(table);
  });
  source.querySelectorAll('h1 img').forEach((image) => image.remove());
  for (const anchor of source.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/"]'
  )) {
    const href = anchor.getAttribute('href') || '';
    if (href.startsWith('//')) continue;
    const url = new URL(href, 'https://book.invalid');
    anchor.setAttribute(
      'href',
      languagePath(url.pathname, locale) + url.search + url.hash
    );
  }
  // Measuring a clip must not start another embedded player.
  source.querySelectorAll<HTMLIFrameElement>('iframe[src]').forEach((frame) => {
    frame.dataset.embedSrc = frame.getAttribute('src') ?? '';
    frame.removeAttribute('src');
  });
  return source;
}

export function paginateChapter({
  page,
  pages,
  icon,
  host,
  w,
  h,
  portrait,
  label = (key) => englishMessages[key],
  locale = 'en'
}: PaginationOptions): HTMLElement[] {
  // A bounded User Timing entry makes eager measurement observable without retaining chapter DOM.
  performance.clearMarks('alux:pagination');
  performance.mark('alux:pagination',{detail:{chapter:page.id}});
  const idx = pages.indexOf(page);
  function pageElement(number: number): HTMLElement {
    const sheet = document.createElement('section');
    sheet.className = 'folio-page';
    sheet.dataset.density = 'soft';
    sheet.dataset.folio = String(number);
    sheet.innerHTML = `<header class="folio-running-head"><span>${escape(page.group)}</span><span>${escape(label('ALUX PROGRAMMING'))}</span></header><article class="folio-content prose"></article><footer class="folio-footer"><span>✦</span><span>${String(number + 1).padStart(2, '0')}</span></footer>`;
    return sheet;
  }

  const measure = document.createElement('div');
  measure.className = 'folio-measure';
  measure.style.width = `${w}px`;
  measure.style.height = `${h}px`;
  host.append(measure);
  let sheet = pageElement(0);
  measure.append(sheet);
  let body = content(sheet);
  const sheets: HTMLElement[] = [sheet];
  function next(): void {
    sheet = pageElement(sheets.length);
    sheets.push(sheet);
    measure.replaceChildren(sheet);
    body = content(sheet);
  }
  function fits(): boolean {
    return body.scrollHeight <= body.clientHeight + 1;
  }

  const parsed = document.createElement('div');
  parsed.innerHTML = prepareChapterSource(page, label, locale).innerHTML;
  const blocks = Array.from(parsed.children) as HTMLElement[];
  const units: HTMLElement[] = [];
  for (let n = 0; n < blocks.length; n++) {
    const node = blocks[n];
    const nextNode = blocks[n + 1];
    if (!node) continue;
    const keepWithNext = Boolean(
      nextNode &&
      ((/^H[1-4]$/.test(node.tagName) &&
        !nextNode.matches('.admonition,.table-scroll')) ||
        (node.tagName === 'P' &&
          /:\s*$/.test(node.textContent ?? '') &&
          /^(UL|OL|DIV)$/.test(nextNode.tagName)))
    );
    if (keepWithNext && nextNode) {
      const group = document.createElement('div');
      group.className = /^H[1-4]$/.test(node.tagName)
        ? 'folio-group folio-heading-group'
        : 'folio-group';
      group.append(node, nextNode);
      n++;
      const following = blocks[n + 1];
      if (
        nextNode.tagName === 'P' &&
        /:\s*$/.test(nextNode.textContent ?? '') &&
        following &&
        /^(UL|OL)$/.test(following.tagName)
      ) {
        group.append(following);
        n++;
      }
      units.push(group);
    } else {
      units.push(node);
    }
  }

  for (const node of units) {
    // Prose notes may continue on a new sheet at paragraph boundaries.
    if (node.matches('.admonition') && node.children.length > 2) {
      const children = Array.from(node.children);
      let fragment = node.cloneNode(false) as HTMLElement;
      body.append(fragment);
      for (const child of children) {
        fragment.append(child);
        if (!fits()) {
          child.remove();
          if (!fragment.childElementCount) fragment.remove();
          next();
          fragment = node.cloneNode(false) as HTMLElement;
          fragment.classList.add('admonition-continuation');
          body.append(fragment);
          fragment.append(child);
          if (!fits()) {
            const region = document.createElement('div');
            region.className = 'folio-overflow';
            region.tabIndex = 0;
            region.setAttribute('role', 'region');
            region.setAttribute('aria-label', 'Scrollable technical content');
            region.style.maxHeight = `${body.clientHeight}px`;
            fragment.before(region);
            region.append(fragment);
          }
        }
      }
      continue;
    }

    // Tables continue between complete rows instead of leaving half a spread
    // empty or making the reader scroll an entire table inside one page.
    const table = node.matches('.table-scroll')
      ? node.querySelector<HTMLTableElement>('table')
      : null;
    const firstBody = table?.tBodies[0];
    if (table && firstBody && firstBody.rows.length > 1) {
      const rows = Array.from(firstBody.rows);
      let fragment = node.cloneNode(false) as HTMLElement;
      let tbody = document.createElement('tbody');
      let continuation = false;
      const fragmentTable = (): void => {
        fragment = node.cloneNode(false) as HTMLElement;
        const clonedTable = table.cloneNode(false) as HTMLTableElement;
        for (const child of Array.from(table.children)) {
          if (child.tagName !== 'TBODY') {
            const copy = child.cloneNode(true) as HTMLElement;
            if (continuation) copy.dataset.repeatedTableHeader = 'true';
            clonedTable.append(copy);
          }
        }
        tbody = document.createElement('tbody');
        clonedTable.append(tbody);
        fragment.append(clonedTable);
        body.append(fragment);
      };
      fragmentTable();
      for (const row of rows) {
        tbody.append(row);
        if (!fits()) {
          row.remove();
          if (!tbody.rows.length) fragment.remove();
          else continuation = true;
          next();
          fragmentTable();
          tbody.append(row);
          if (!fits()) {
            fragment.classList.add('folio-overflow');
            fragment.style.maxHeight = `${body.clientHeight}px`;
          }
        }
      }
      continue;
    }

    body.append(node);
    if (!fits()) {
      node.remove();
      if (body.childElementCount) next();
      body.append(node);
      if (!fits()) {
        // A long code example, table or note remains intact and fully reachable in its own scroll region.
        const region = document.createElement('div');
        region.className = 'folio-overflow';
        region.tabIndex = 0;
        region.setAttribute('role', 'region');
        region.setAttribute('aria-label', 'Scrollable technical content');
        region.style.maxHeight = `${body.clientHeight}px`;
        node.before(region);
        region.append(node);
      }
    }
  }

  const end = document.createElement('nav');
  end.className = 'folio-chapter-end';
  end.innerHTML = `<span>✦</span><p>${escape(label('Continue the journey'))}</p>${idx + 1 < pages.length ? `<a href="${languagePath('/' + (pages[idx + 1]?.slug || ''), locale)}">${escape(pages[idx + 1]?.title ?? '')} ${icon('arrow-right')}</a>` : `<a href="${languagePath('/contents.html', locale)}" data-open-contents>${escape(label('Return to the table of contents'))}</a>`}`;
  body.append(end);
  if (!fits()) {
    end.remove();
    next();
    body.append(end);
  }
  if (!portrait && sheets.length % 2) {
    next();
    body.innerHTML = `<div class="folio-closing"><span>✦</span><p>${escape(label('First the meaning.'))}<br><em>${escape(label('Then the machinery.'))}</em></p><a href="${languagePath('/contents.html', locale)}" data-open-contents>${escape(label('Explore another chapter'))} ${icon('arrow-right')}</a></div>`;
  }
  measure.remove();
  return sheets;
}
