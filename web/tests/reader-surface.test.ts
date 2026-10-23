import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { copyBookSurface, ownedBookSurface } from '../src/reader-surface.ts';

const markup = (): Document => parseHTML('<html><body><main id="app"><div class="bound-volume"><div id="page-book">First chapter</div></div></main></body></html>').document as unknown as Document;

test('a delayed old reader cannot acquire or remove the new chapter surface', async () => {
  const document = markup();
  const app = document.querySelector<HTMLElement>('#app')!;
  const oldVolume = document.querySelector<HTMLElement>('.bound-volume')!;
  let resume: (() => void) | undefined;
  const imageReady = new Promise<void>(resolve => { resume = resolve; });
  const obsoleteResize = imageReady.then(() => {
    const surface = ownedBookSurface(oldVolume);
    // A stale PageFlip instance would remove whichever element it acquired.
    surface?.remove();
    return surface;
  });
  app.innerHTML = '<div class="bound-volume"><div id="page-book">Next chapter</div></div>';
  const newBook = document.querySelector<HTMLElement>('#page-book')!;
  resume!();
  assert.equal(await obsoleteResize, null);
  assert.ok(newBook.isConnected);
  assert.equal(newBook.textContent, 'Next chapter');
});

test('a connected reader reuses only the book inside its own volume', () => {
  const document = markup();
  const volume = document.querySelector<HTMLElement>('.bound-volume')!;
  const original = volume.querySelector<HTMLElement>('#page-book');
  assert.equal(ownedBookSurface(volume), original);
});

test('rebuilding a destroyed book creates its replacement in the same volume', () => {
  const document = markup();
  const volume = document.querySelector<HTMLElement>('.bound-volume')!;
  ownedBookSurface(volume)!.remove();
  const replacement = ownedBookSurface(volume);
  assert.ok(replacement?.isConnected);
  assert.equal(replacement.parentElement, volume);
  assert.equal(volume.querySelectorAll('#page-book').length, 1);
});

test('a detached volume cannot create a new book', () => {
  const document = markup();
  const volume = document.querySelector<HTMLElement>('.bound-volume')!;
  volume.remove();
  assert.equal(ownedBookSurface(volume), null);
  assert.equal(document.querySelector('#page-book'), null);
});

test('the first-frame backdrop has readable content without duplicate anchors or active players', () => {
  const document = markup();
  const book = document.querySelector<HTMLElement>('#page-book')!;
  book.innerHTML = '<article id="chapter"><h1 id="heading">Chapter text</h1><iframe src="https://example.com/player" srcdoc="player"></iframe></article>';
  const copy = copyBookSurface(book);
  assert.equal(copy.textContent, book.textContent);
  assert.equal(copy.hasAttribute('id'), false);
  assert.equal(copy.querySelectorAll('[id]').length, 0);
  assert.equal(copy.querySelector('iframe')?.hasAttribute('src'), false);
  assert.equal(copy.querySelector('iframe')?.hasAttribute('srcdoc'), false);
  assert.equal(copy.getAttribute('aria-hidden'), 'true');
  assert.ok(copy.inert);
  assert.equal(book.querySelector('h1')?.id, 'heading');
  assert.equal(book.querySelector('iframe')?.getAttribute('src'), 'https://example.com/player');
});
