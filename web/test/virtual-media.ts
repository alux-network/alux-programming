// Virtual media playback for browser tests, installed by browser.test.ts as a context init script.
// The reader's audio meaning is what it asks of an element (play, pause, seek, volume), not whether
// an engine can decode a file to a sound device, so tests need no audio server. Playback advances on
// the page's clock, honors `loop`, and ends with native `pause` then `ended`. Extend it only with the
// HTMLMediaElement members the reader reads; it runs serialized in the page, so it imports nothing.

/** Replaces HTMLMediaElement playback with a deterministic clock of a fixed duration. */
export function virtualMedia() {
  const duration = 600;
  interface Clock { paused: boolean; ended: boolean; base: number; since: number; timer?: number }
  const clocks = new WeakMap<HTMLMediaElement, Clock>();
  const clock = (media: HTMLMediaElement) => {
    let state = clocks.get(media);
    if (!state) clocks.set(media, state = { paused: true, ended: false, base: 0, since: 0 });
    return state;
  };
  const position = (media: HTMLMediaElement) => {
    const state = clock(media);
    if (state.paused) return state.base;
    const time = state.base + (performance.now() - state.since) / 1000;
    return media.loop ? time % duration : Math.min(time, duration);
  };
  // A playing, non-looping element ends once its remaining time has elapsed.
  const schedule = (media: HTMLMediaElement) => {
    const state = clock(media);
    clearTimeout(state.timer);
    if (state.paused || media.loop) return;
    state.timer = window.setTimeout(() => {
      Object.assign(state, { base: duration, paused: true, ended: true });
      media.dispatchEvent(new Event('pause'));
      media.dispatchEvent(new Event('ended'));
    }, Math.max(0, duration - state.base) * 1000);
  };
  const prototype = HTMLMediaElement.prototype;
  Object.defineProperties(prototype, {
    paused: { configurable: true, get(this: HTMLMediaElement) { return clock(this).paused; } },
    ended: { configurable: true, get(this: HTMLMediaElement) { return clock(this).ended; } },
    duration: { configurable: true, get() { return duration; } },
    error: { configurable: true, get() { return null; } },
    currentTime: {
      configurable: true,
      get(this: HTMLMediaElement) { return position(this); },
      set(this: HTMLMediaElement, value: number) {
        Object.assign(clock(this), { base: Math.min(Math.max(0, Number(value) || 0), duration), since: performance.now(), ended: false });
        schedule(this);
      },
    },
  });
  prototype.play = function (this: HTMLMediaElement) {
    const state = clock(this);
    if (state.paused) {
      if (state.ended) Object.assign(state, { base: 0, ended: false });
      Object.assign(state, { paused: false, since: performance.now() });
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
      schedule(this);
    }
    return Promise.resolve();
  };
  prototype.pause = function (this: HTMLMediaElement) {
    const state = clock(this);
    if (state.paused) return;
    Object.assign(state, { base: position(this), paused: true });
    clearTimeout(state.timer);
    this.dispatchEvent(new Event('pause'));
  };
}
