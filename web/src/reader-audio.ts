type Realm = 'magic' | 'real';
export interface ReaderAudioState {
  realm: Realm | null;
  playing: boolean;
  volume: number;
  failed: boolean;
  hintRevision: number;
}
const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
};
let audio: HTMLAudioElement | null = null,
  context: AudioContext | null = null,
  gain: GainNode | null = null,
  source: MediaElementAudioSourceNode | null = null;
let activeRealm: Realm | null = null,
  contextCreatedAt = 0,
  contextEverRunning = false,
  hintRevision = 0;
const enabled: Record<Realm, boolean> = { magic: true, real: false },
  listeners = new Set<(state: ReaderAudioState) => void>();
const desired = () => (activeRealm ? enabled[activeRealm] : false);
const volume = () => {
  const value = Number(storage.get('alux-reader-music-volume') ?? 1);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
};
const playing = () =>
  Boolean(
    audio &&
    !audio.paused &&
    !audio.ended &&
    (!context || context.state === 'running')
  );
export const readerAudioState = (): ReaderAudioState => ({
  realm: activeRealm,
  playing: playing(),
  volume: volume(),
  failed: !!audio?.dataset.failed,
  hintRevision
});
function publish() {
  const state = readerAudioState();
  for (const listener of listeners) listener(state);
}
export function subscribeReaderAudio(
  listener: (state: ReaderAudioState) => void
): () => void {
  listeners.add(listener);
  listener(readerAudioState());
  return () => {
    listeners.delete(listener);
  };
}
function bindAudio(): void {
  const media = document.createElement('audio');
  media.loop = true;
  media.preload = 'none';
  media.volume = 1;
  media.src = new URL(
    (import.meta.env.BASE_URL || '/') + 'audio/forest-breath.mp3',
    location.href
  ).href;
  media.setAttribute('aria-hidden', 'true');
  media.tabIndex = -1;
  for (const event of ['playing', 'pause', 'ended'])
    media.addEventListener(event, publish);
  media.addEventListener('error', () => {
    media.dataset.failed = 'true';
    publish();
  });
  audio = media;
  document.body.append(media);
}
function getGain(rebuild = false): void {
  const media = audio;
  if (!media) return;
  if (context && context.state !== 'closed' && !rebuild) return;
  if (rebuild && context) {
    const position = media.currentTime;
    try {
      source?.disconnect();
      void context.close();
    } catch {}
    media.remove();
    bindAudio();
    if (audio) audio.currentTime = position;
    context = null;
    source = null;
    gain = null;
  }
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;
  try {
    const session = (
      navigator as Navigator & { audioSession?: { type: string } }
    ).audioSession;
    if (session) session.type = 'playback';
  } catch {}
  const audioContext = new Ctx();
  context = audioContext;
  contextCreatedAt = Date.now();
  contextEverRunning = false;
  gain = audioContext.createGain();
  gain.gain.value = volume();
  gain.connect(audioContext.destination);
  source = audioContext.createMediaElementSource(audio ?? media);
  source.connect(gain);
  audioContext.addEventListener('statechange', () => {
    if (context?.state === 'running') {
      contextEverRunning = true;
      if (activeRealm && desired()) audio?.play().then(publish).catch(publish);
    }
  });
}
function pause() {
  audio?.pause();
  publish();
}
function play() {
  if (!audio || !activeRealm || !desired() || document.hidden) return;
  delete audio.dataset.failed;
  getGain();
  if (context?.state !== 'running') context?.resume().catch(() => {});
  const media = audio;
  media
    .play()
    .then(() => {
      if (!activeRealm || !desired() || document.hidden) media.pause();
      publish();
    })
    .catch(publish);
}
export function setReaderRealm(realm: string | null | undefined) {
  const next = realm === 'magic' || realm === 'real' ? realm : null;
  if (next === activeRealm) return;
  if (next && !audio) bindAudio();
  activeRealm = next;
  pause();
  if (next) {
    enabled[next] = next === 'magic';
    hintRevision++;
    if (desired()) play();
  }
  publish();
}
export function toggleReaderAudio() {
  if (!activeRealm) return;
  enabled[activeRealm] = !playing();
  if (desired()) play();
  else pause();
  hintRevision++;
  publish();
}
export function setReaderVolume(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  if (!Number.isFinite(clamped)) return;
  storage.set('alux-reader-music-volume', String(clamped));
  if (gain && context)
    gain.gain.setTargetAtTime(clamped, context.currentTime, 0.025);
  publish();
}
export function startReaderAudio(): () => void {
  const gesture = (event: Event) => {
    if (
      !activeRealm &&
      document.body.classList.contains('gateway-view') &&
      event.target instanceof Element &&
      event.target.closest('.world-choice')
    ) {
      if (!audio) bindAudio();
      getGain();
      context?.resume().catch(() => {});
      return;
    }
    if (
      !activeRealm ||
      !desired() ||
      document.hidden ||
      (event.target instanceof Element &&
        event.target.closest('[data-reader-music]'))
    )
      return;
    if (
      context &&
      context.state !== 'running' &&
      contextEverRunning &&
      Date.now() - contextCreatedAt > 1000
    )
      getGain(true);
    if (!playing()) play();
  };
  const visibility = () => {
    if (document.hidden) pause();
    else if (activeRealm && desired()) play();
  };
  for (const type of ['pointerdown', 'touchend', 'click', 'keydown'])
    document.addEventListener(type, gesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pause);
  return () => {
    for (const type of ['pointerdown', 'touchend', 'click', 'keydown'])
      document.removeEventListener(type, gesture, true);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pause);
    activeRealm = null;
    pause();
    audio?.remove();
    try {
      void context?.close();
    } catch {}
    audio = null;
    context = null;
    gain = null;
    source = null;
  };
}
