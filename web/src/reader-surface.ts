/** A pending reader must never borrow the next chapter's DOM after navigation. */
export function ownedBookSurface(volume: HTMLElement): HTMLElement | null {
  if (!volume.isConnected) return null;
  let book = volume.querySelector<HTMLElement>('#page-book');
  if (!book) {
    book = volume.ownerDocument.createElement('div');
    book.id = 'page-book';
    book.className = 'page-book';
    volume.prepend(book);
  }
  return book;
}

/** A short-lived visual copy covers PageFlip's first, still-unpainted frame. */
export function copyBookSurface(book: HTMLElement): HTMLElement {
  const copy = book.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  copy.querySelectorAll('iframe').forEach(frame => { frame.removeAttribute('src'); frame.removeAttribute('srcdoc'); });
  copy.inert = true;
  copy.setAttribute('aria-hidden', 'true');
  copy.classList.add('reader-backdrop');
  return copy;
}
