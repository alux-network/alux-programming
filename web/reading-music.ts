// Reading-music controller for the reader's one persistent audio element. The caller
// supplies the translated notice and preference store; this module owns world entry,
// close/toggle semantics, browser autoplay recovery, and page-to-page position handoff.

export type ReadingWorld = 'magic' | 'real';

export interface MusicNoticeState {
  world: ReadingWorld;
  playing: boolean;
}

export interface ReadingMusicOptions {
  audio: HTMLAudioElement;
  button: HTMLButtonElement;
  prefs: { music?: boolean };
  save: () => void;
  isGateway: () => boolean;
  labels?: { play: string; pause: string };
  notice?: { show: (state: MusicNoticeState) => void; update?: (state: MusicNoticeState) => void; hide: () => void };
  positionStorage?: Pick<Storage, 'getItem' | 'setItem'>;
  volumeStorage?: Pick<Storage, 'getItem' | 'setItem'>;
  events?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  isHidden?: () => boolean;
  keepPlayingOnPageHide?: boolean;
}

/** Creates the reading-music controller and returns entry, toggle and teardown operations. */
export function bindReadingMusic(options: ReadingMusicOptions) {
  const {
    audio, button, prefs, save, isGateway,
    labels = { play: 'Play music', pause: 'Pause music' },
    notice,
    keepPlayingOnPageHide = false,
    positionStorage = globalThis.sessionStorage,
    volumeStorage = globalThis.localStorage,
    events = globalThis.window,
    isHidden = () => globalThis.document?.hidden ?? false,
  } = options;
  let world: ReadingWorld | undefined;
  let disposed = false;
  let resumeConsumed = keepPlayingOnPageHide && audio.dataset.aluxMusicEntered === 'true';
  let noticeOpen = false;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;

  const readVolume = () => {
    try {
      const value = Number(volumeStorage.getItem('alux-reader-music-volume') ?? 1);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    } catch { return 1; }
  };
  audio.volume = readVolume();

  const position = () => {
    try { return Number(positionStorage.getItem('alux-music-time')) || 0; } catch { return 0; }
  };
  const remember = () => {
    try { positionStorage.setItem('alux-music-time', String(audio.currentTime)); } catch {}
  };
  const shouldAutoplay = () => world === 'magic' ? prefs.music !== false : prefs.music === true;
  const render = () => {
    const playing = !audio.paused && !audio.ended;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? labels.pause : labels.play);
    button.title = playing ? labels.pause : labels.play;
    if (noticeOpen && world) notice?.update?.({ world, playing });
  };
  const play = () => {
    if (disposed || !world || isGateway() || isHidden() || !shouldAutoplay()) return;
    try { void audio.play().then(render).catch(render); } catch { render(); }
  };
  const onTrustedGesture = (event: Event) => {
    if (!event.isTrusted || disposed || !world || isGateway() || !shouldAutoplay()) return;
    if (typeof Element !== 'undefined' && event.target instanceof Element && (button.contains(event.target) || event.target.closest('[data-reader-music]'))) return;
    if (!audio.paused) return;
    play();
  };
  const onPlay = () => render();
  const onPause = () => render();
  const onPageHide = () => { remember(); if (keepPlayingOnPageHide) dispose(true); else audio.pause(); };
  const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) play(); };
  const onVisibilityChange = () => {
    if (isHidden()) audio.pause();
    else if (world && shouldAutoplay()) play();
  };
  const showNotice = () => {
    if (disposed || !world) return;
    noticeOpen = true;
    clearTimeout(noticeTimer);
    notice?.show({ world, playing: !audio.paused && !audio.ended });
    noticeTimer = setTimeout(() => { if (noticeOpen) closeNotice(); }, 5000);
  };
  const showNoticeOnFocus = () => showNotice();
  const showNoticeOnHover = () => showNotice();
  const closeNotice = () => {
    noticeOpen = false;
    clearTimeout(noticeTimer);
    noticeTimer = undefined;
    notice?.hide();
  };
  const onButtonClick = () => {
    if (disposed || !world || isGateway()) return;
    if (audio.paused) {
      prefs.music = true;
      save();
      play();
    } else {
      prefs.music = false;
      save();
      audio.pause();
    }
    showNotice();
  };

  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);
  events.addEventListener('pointerdown', onTrustedGesture, true);
  events.addEventListener('keydown', onTrustedGesture, true);
  events.addEventListener('pagehide', onPageHide);
  events.addEventListener('pageshow', onPageShow);
  events.addEventListener('visibilitychange', onVisibilityChange);
  button.addEventListener('click', onButtonClick);
  button.addEventListener('mouseenter', showNoticeOnHover);
  button.addEventListener('focus', showNoticeOnFocus);

  /** Enters a reading world, showing its closeable music notice and restoring position. */
  const enter = (next: ReadingWorld) => {
    if (disposed || isGateway()) return;
    if (!keepPlayingOnPageHide) audio.pause();
    world = next;
    if (!shouldAutoplay()) audio.pause();
    if (!resumeConsumed) {
      resumeConsumed = true;
      if (keepPlayingOnPageHide) audio.dataset.aluxMusicEntered = 'true';
      const resume = position();
      if (resume > 0) {
        try { audio.currentTime = resume; } catch {}
      }
    }
    showNotice();
    play();
  };

  /** Stops playback, remembers the user's opt-out, and closes the notice. */
  const stop = () => {
    if (disposed) return;
    prefs.music = false;
    save();
    audio.pause();
    closeNotice();
  };

  /** Sets native audio volume, clamps it to 0..1, and persists the legacy preference key. */
  const setVolume = (value: number) => {
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(0, Math.min(1, value));
    audio.volume = clamped;
    try { volumeStorage.setItem('alux-reader-music-volume', String(clamped)); } catch {}
    if (noticeOpen && world) notice?.update?.({ world, playing: !audio.paused && !audio.ended });
  };

  /** Disposes listeners, preserves the current position, and stops music. */
  const dispose = (keepPlaying = false) => {
    if (disposed) return;
    disposed = true;
    if (!keepPlaying) audio.pause();
    closeNotice();
    clearTimeout(noticeTimer);
    audio.removeEventListener('play', onPlay);
    audio.removeEventListener('pause', onPause);
    button.removeEventListener('click', onButtonClick);
    button.removeEventListener('mouseenter', showNoticeOnHover);
    button.removeEventListener('focus', showNoticeOnFocus);
    events.removeEventListener('pointerdown', onTrustedGesture, true);
    events.removeEventListener('keydown', onTrustedGesture, true);
    events.removeEventListener('pagehide', onPageHide);
    events.removeEventListener('pageshow', onPageShow);
    events.removeEventListener('visibilitychange', onVisibilityChange);
  };

  return { enter, closeNotice, showNotice, stop, setVolume, toggle: () => button.click(), dispose };
}
