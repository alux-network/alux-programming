import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalTarget, NAVIGATION_HANDOFF_KEY, readNavigationHandoff, saveNavigationHandoff, type HandoffStorage } from '../navigation-handoff.ts';

class MemoryStorage implements HandoffStorage {
  value: string | null = null;
  getItem(key: string) { return key === NAVIGATION_HANDOFF_KEY ? this.value : null; }
  setItem(key: string, value: string) { if (key === NAVIGATION_HANDOFF_KEY) this.value = value; }
  removeItem(key: string) { if (key === NAVIGATION_HANDOFF_KEY) this.value = null; }
}

function sheet(text = 'old') {
  return { outerHTML: `<div class="turn-sheet"><main class="leaves">${text}</main></div>` } as Element;
}

test('canonical target resolves same-origin relative chapter links', () => {
  assert.equal(canonicalTarget('../next.html#last-page', 'https://reader.test/en/current.html'), 'https://reader.test/next.html#last-page');
  assert.equal(canonicalTarget('https://other.test/next.html', 'https://reader.test/current.html'), undefined);
});

test('handoff is bounded, target-bound and consumed once', () => {
  const storage = new MemoryStorage();
  assert.equal(saveNavigationHandoff({
    source: 'https://reader.test/en/current.html', target: 'https://reader.test/en/next.html', direction: 'forward',
    viewport: { width: 1440, height: 900, dpr: 1 }, volume: { x: 300, y: 100, width: 900, height: 600 }, sheets: [sheet('a'), sheet('b')], now: 1000,
  }, storage), true);
  const read = readNavigationHandoff('https://reader.test/en/next.html', { storage, now: 1200, viewport: { width: 1440, height: 900, dpr: 1 } });
  assert.equal(read?.source, 'https://reader.test/en/current.html');
  assert.equal(read?.target, 'https://reader.test/en/next.html');
  assert.equal(read?.direction, 'forward');
  assert.deepEqual(read?.volume, { x: 300, y: 100, width: 900, height: 600 });
  assert.equal(read?.sheets[0], '<div class="turn-sheet"><main class="leaves">a</main></div>');
  assert.equal(read?.sheets.length, 2);
  assert.equal(readNavigationHandoff('https://reader.test/en/next.html', { storage, now: 1201 }), undefined);
});

test('chapter-boundary handoff preserves last-page target and direction', () => {
  const storage = new MemoryStorage();
  assert.equal(saveNavigationHandoff({
    source: 'https://reader.test/chapter-2.html', target: 'https://reader.test/chapter-1.html#last-page', direction: 'back',
    viewport: { width: 1200, height: 800, dpr: 1 }, volume: { x: 120, y: 80, width: 960, height: 620 }, sheets: [sheet('left'), sheet('right')], now: 2000,
  }, storage), true);
  assert.equal(readNavigationHandoff('https://reader.test/chapter-1.html', { storage, now: 2100 }), undefined, 'hash mismatch must not show an old chapter snapshot');
  assert.equal(saveNavigationHandoff({
    source: 'https://reader.test/chapter-2.html', target: 'https://reader.test/chapter-1.html#last-page', direction: 'back',
    viewport: { width: 1200, height: 800, dpr: 1 }, volume: { x: 120, y: 80, width: 960, height: 620 }, sheets: [sheet('left'), sheet('right')], now: 2000,
  }, storage), true);
  const read = readNavigationHandoff('https://reader.test/chapter-1.html#last-page', { storage, now: 2100, viewport: { width: 1200, height: 800, dpr: 1 } });
  assert.equal(read?.direction, 'back');
  assert.equal(read?.target, 'https://reader.test/chapter-1.html#last-page');
});

test('handoff rejects a wrong target, stale record and viewport mismatch', () => {
  const storage = new MemoryStorage();
  const input = { source: 'https://reader.test/current.html', target: 'https://reader.test/next.html', direction: 'forward' as const, viewport: { width: 800, height: 600, dpr: 1 }, volume: { x: 0, y: 0, width: 700, height: 500 }, sheets: [sheet()] };
  assert.equal(saveNavigationHandoff({ ...input, now: 1000 }, storage), true);
  assert.equal(readNavigationHandoff('https://reader.test/other.html', { storage, now: 1100 }), undefined);
  assert.equal(saveNavigationHandoff({ ...input, now: 1000 }, storage), true);
  assert.equal(readNavigationHandoff(input.target, { storage, now: 10_001 }), undefined);
  assert.equal(saveNavigationHandoff({ ...input, now: 1000 }, storage), true);
  assert.equal(readNavigationHandoff(input.target, { storage, now: 1100, viewport: { width: 900, height: 600, dpr: 1 } }), undefined);
});
