import test from 'node:test';
import assert from 'node:assert/strict';
import { bindReadingMusic } from '../reading-music.ts';

function fixture() {
  const listeners = new Map<string, EventListener>();
  let paused = true;
  const audio = {
    get paused() { return paused; }, ended: false, currentTime: 12,
    addEventListener(type: string, listener: EventListener) { listeners.set(`audio:${type}`, listener); },
    removeEventListener(type: string) { listeners.delete(`audio:${type}`); },
    play() { paused = false; listeners.get('audio:play')?.({} as Event); return Promise.resolve(); },
    pause() { paused = true; listeners.get('audio:pause')?.({} as Event); },
  } as unknown as HTMLAudioElement;
  const button = { click() { listeners.get('button:click')?.({} as Event); }, addEventListener(type: string, listener: EventListener) { listeners.set(`button:${type}`, listener); }, removeEventListener(type: string) { listeners.delete(`button:${type}`); }, setAttribute() {}, set title(_: string) {} } as unknown as HTMLButtonElement;
  const storage = new Map<string, string>();
  let hidden = false;
  const notice = { shown: [] as Array<{ world: string; playing: boolean }>, closed: 0, show(state: { world: 'magic' | 'real'; playing: boolean }) { this.shown.push(state); }, hide() { this.closed++; } };
  const prefs: { music?: boolean } = {};
  const events = { addEventListener(type: string, listener: EventListener) { listeners.set(type, listener); }, removeEventListener(type: string) { listeners.delete(type); } } as unknown as Window;
  const storageApi = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); } };
  const controller = bindReadingMusic({ audio, button, prefs, save() {}, isGateway: () => false, notice, events, isHidden: () => hidden, positionStorage: storageApi, volumeStorage: storageApi });
  return { audio, button, listeners, notice, prefs, storage, controller, setHidden: (value: boolean) => { hidden = value; } };
}

test('magic entry autoplays by default and both worlds show a closeable notice', async () => {
  const f = fixture();
  f.controller.enter('magic');
  await Promise.resolve();
  assert.equal(f.audio.paused, false);
  assert.deepEqual(f.notice.shown[0], { world: 'magic', playing: false });
  f.controller.closeNotice();
  f.controller.enter('real');
  assert.equal(f.notice.shown.at(-1)?.world, 'real');
  assert.equal(f.audio.paused, true);
  f.controller.dispose();
});

test('turning music off is remembered and prevents later magic autoplay', () => {
  const f = fixture();
  f.controller.enter('magic');
  f.controller.toggle();
  assert.equal(f.prefs.music, false);
  f.controller.enter('magic');
  assert.equal(f.audio.paused, true);
  f.controller.dispose();
});

test('trusted gesture retries blocked autoplay, while untrusted event does not', () => {
  const f = fixture();
  let attempts = 0;
  f.audio.play = () => { attempts++; return Promise.reject(new Error('blocked')); };
  f.controller.enter('magic');
  assert.equal(attempts, 1);
  f.listeners.get('pointerdown')?.({ isTrusted: false } as Event);
  assert.equal(attempts, 1);
  f.listeners.get('pointerdown')?.({ isTrusted: true } as Event);
  assert.equal(attempts, 2);
  f.controller.dispose();
});

test('dispose preserves position and stops playback', () => {
  const f = fixture();
  f.controller.enter('magic');
  (f.audio as HTMLAudioElement).currentTime = 23;
  f.controller.dispose();
  assert.equal(f.audio.paused, true);
  assert.equal(f.notice.closed, 1);
});

test('pagehide remembers position before pausing, while dispose does not overwrite it', () => {
  const f = fixture();
  f.controller.enter('magic');
  (f.audio as HTMLAudioElement).currentTime = 23;
  f.listeners.get('pagehide')?.({} as Event);
  assert.equal(f.storage.get('alux-music-time'), '23');
  assert.equal(f.audio.paused, true);
  (f.audio as HTMLAudioElement).currentTime = 41;
  f.controller.dispose();
  assert.equal(f.storage.get('alux-music-time'), '23');
});

test('setVolume clamps and persists the legacy volume preference', () => {
  const f = fixture();
  f.controller.setVolume(2);
  assert.equal(f.audio.volume, 1);
  assert.equal(f.storage.get('alux-reader-music-volume'), '1');
  f.controller.setVolume(-1);
  assert.equal(f.audio.volume, 0);
  assert.equal(f.storage.get('alux-reader-music-volume'), '0');
  f.controller.dispose();
});

test('closing the notice keeps later play and pause updates from reopening it', () => {
  const f = fixture();
  f.controller.enter('magic');
  const before = f.notice.shown.length;
  f.controller.closeNotice();
  f.audio.pause();
  assert.equal(f.notice.shown.length, before);
  f.controller.dispose();
});

test('visibility hidden pauses immediately and visible resumes when music is enabled', async () => {
  const f = fixture();
  f.controller.enter('magic');
  await Promise.resolve();
  assert.equal(f.audio.paused, false);
  f.setHidden(true);
  f.listeners.get('visibilitychange')?.({} as Event);
  assert.equal(f.audio.paused, true);
  f.setHidden(false);
  f.listeners.get('visibilitychange')?.({} as Event);
  await Promise.resolve();
  assert.equal(f.audio.paused, false);
  f.controller.dispose();
});

test('resume checkpoint is consumed once, so world toggles keep current audio position', () => {
  const f = fixture();
  f.storage.set('alux-music-time', '50');
  f.controller.enter('magic');
  assert.equal(f.audio.currentTime, 50);
  f.audio.currentTime = 77;
  f.controller.enter('real');
  assert.equal(f.audio.currentTime, 77);
  f.controller.enter('magic');
  assert.equal(f.audio.currentTime, 77);
  f.controller.dispose();
});

test('hidden entry does not play until the document becomes visible', async () => {
  const f = fixture();
  let attempts = 0;
  f.audio.play = () => { attempts++; return Promise.resolve(); };
  f.setHidden(true);
  f.controller.enter('magic');
  assert.equal(attempts, 0);
  f.setHidden(false);
  f.listeners.get('visibilitychange')?.({} as Event);
  await Promise.resolve();
  assert.equal(attempts, 1);
  f.controller.dispose();
});
