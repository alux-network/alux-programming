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
