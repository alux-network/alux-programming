/**
 * A one-navigation bridge for the approved paper turn.
 *
 * This is deliberately not a router: the browser still performs the native
 * document navigation and mdBook remains the only content model. The bridge
 * only carries the already-painted paper snapshot across that document load.
 */

export const NAVIGATION_HANDOFF_KEY = 'alux-navigation-handoff-v1';
export const NAVIGATION_HANDOFF_TTL_MS = 5_000;
const MAX_SHEETS = 4;
const MAX_SHEET_BYTES = 280_000;
const MAX_TOTAL_BYTES = 800_000;

export interface HandoffStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface HandoffRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NavigationHandoff {
  version: 1;
  source: string;
  target: string;
  direction: 'forward' | 'back';
  createdAt: number;
  viewport: { width: number; height: number; dpr: number };
  volume: HandoffRect;
  sheets: string[];
}

function storageOrDefault(storage?: HandoffStorage): HandoffStorage | undefined {
  if (storage) return storage;
  try { return sessionStorage; } catch { return undefined; }
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Makes target comparison independent of relative links and trailing fragments. */
export function canonicalTarget(value: string | URL, base = globalThis.location?.href): string | undefined {
  try {
    const url = new URL(String(value), base);
    if (url.origin !== new URL(base ?? url.href).origin) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function validRecord(value: unknown, now: number): value is NavigationHandoff {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<NavigationHandoff>;
  if (record.version !== 1 || typeof record.source !== 'string' || typeof record.target !== 'string') return false;
  if (record.direction !== 'forward' && record.direction !== 'back') return false;
  if (!finitePositive(record.createdAt) || now - record.createdAt < -1_000 || now - record.createdAt > NAVIGATION_HANDOFF_TTL_MS) return false;
  const viewport = record.viewport;
  if (!viewport || !finitePositive(viewport.width) || !finitePositive(viewport.height) || !finitePositive(viewport.dpr)) return false;
  const volume = record.volume;
  if (!volume || ![volume.x, volume.y].every((n) => typeof n === 'number' && Number.isFinite(n)) ||
      !finitePositive(volume.width) || !finitePositive(volume.height)) return false;
  if (!Array.isArray(record.sheets) || record.sheets.length < 1 || record.sheets.length > MAX_SHEETS) return false;
  const total = record.sheets.reduce((size, sheet) => size + (typeof sheet === 'string' ? sheet.length : Infinity), 0);
  return Number.isFinite(total) && total <= MAX_TOTAL_BYTES && record.sheets.every((sheet) =>
    typeof sheet === 'string' && sheet.length > 0 && sheet.length <= MAX_SHEET_BYTES &&
    /^<div\b/i.test(sheet));
}

export interface SaveHandoffInput {
  source: string | URL;
  target: string | URL;
  direction: NavigationHandoff['direction'];
  viewport: { width: number; height: number; dpr?: number };
  volume: HandoffRect;
  /** Detached `.turn-sheet` nodes returned by paperTurn.sheets(). */
  sheets: readonly Element[];
  now?: number;
}

/** Stores one bounded, target-bound snapshot and returns whether it was accepted. */
export function saveNavigationHandoff(input: SaveHandoffInput, storage?: HandoffStorage): boolean {
  const store = storageOrDefault(storage);
  if (!store || !finitePositive(input.viewport.width) || !finitePositive(input.viewport.height) ||
      !finitePositive(input.viewport.dpr ?? 1) || input.sheets.length < 1 || input.sheets.length > MAX_SHEETS) return false;
  const source = canonicalTarget(input.source);
  const target = canonicalTarget(input.target, source);
  if (!source || !target || source === target) return false;
  const sheets = input.sheets.map((sheet) => sheet.outerHTML);
  const now = input.now ?? Date.now();
  const record: NavigationHandoff = {
    version: 1, source, target, direction: input.direction, createdAt: now,
    viewport: { width: input.viewport.width, height: input.viewport.height, dpr: input.viewport.dpr ?? 1 },
    volume: { x: input.volume.x, y: input.volume.y, width: input.volume.width, height: input.volume.height }, sheets,
  };
  if (!validRecord(record, now)) return false;
  try {
    const encoded = JSON.stringify(record);
    if (encoded.length > MAX_TOTAL_BYTES + 20_000) return false;
    store.setItem(NAVIGATION_HANDOFF_KEY, encoded);
    return true;
  } catch { return false; }
}

/** Reads and consumes a handoff only when it belongs to this exact destination and viewport. */
export function readNavigationHandoff(
  target: string | URL = globalThis.location?.href ?? '',
  options: { storage?: HandoffStorage; now?: number; viewport?: { width: number; height: number; dpr?: number } } = {},
): NavigationHandoff | undefined {
  const store = storageOrDefault(options.storage);
  if (!store) return undefined;
  const current = canonicalTarget(target);
  if (!current) return undefined;
  try {
    const raw = store.getItem(NAVIGATION_HANDOFF_KEY);
    store.removeItem(NAVIGATION_HANDOFF_KEY);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    const now = options.now ?? Date.now();
    if (!validRecord(value, now) || value.target !== current) return undefined;
    const viewport = options.viewport;
    if (viewport && (Math.abs(viewport.width - value.viewport.width) > 2 ||
        Math.abs(viewport.height - value.viewport.height) > 2 ||
        Math.abs((viewport.dpr ?? 1) - value.viewport.dpr) > .1)) return undefined;
    return value;
  } catch { return undefined; }
}

export function clearNavigationHandoff(storage?: HandoffStorage): void {
  try { storageOrDefault(storage)?.removeItem(NAVIGATION_HANDOFF_KEY); } catch { /* storage may be unavailable */ }
}

/** Removes the first-frame veil installed by the template bootstrap. */
export function teardownNavigationHandoff(root: ParentNode = document): void {
  root.querySelector('[data-navigation-handoff-veil]')?.remove();
  root.querySelector('[data-navigation-handoff-style]')?.remove();
  root.querySelector<HTMLElement>('#content')?.removeAttribute('data-navigation-handoff');
}
