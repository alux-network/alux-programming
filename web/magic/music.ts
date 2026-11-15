// The reading music of the magic world, bound once per visit to the markup Reader.tsx renders: the
// note button, its notice with volume, and one <audio> that keeps playing across chapters because
// the app never reloads between them. reading-music.ts owns autoplay, toggling and the preference.
import { musicCopy, musicHints } from '../i18n.ts';
import type { Language } from '../languages.ts';
import { bindReadingMusic } from '../reading-music.ts';
import type { MusicNoticeState } from '../reading-music.ts';
import type { Prefs } from './prefs.ts';

/** Binds the music controls and enters the magic world's music; returns the teardown. */
export function bindMusic(lang: Language, prefs: Prefs, save: () => void): () => void {
  const controller = new AbortController();
  const signal = controller.signal;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const music = $<HTMLAudioElement>('music');
  const musicButton = $<HTMLButtonElement>('music-toggle');
  const notice = $('music-notice'), copy = musicCopy[lang];
  /** Anchors the music controls to their note button, inside the viewport. */
  function placeMusicNotice() {
    if (notice.hidden) return;
    const button = musicButton.getBoundingClientRect(), bounds = notice.getBoundingClientRect();
    notice.style.left = Math.max(12, Math.min(innerWidth - bounds.width - 12, button.right - bounds.width)) + 'px';
    notice.style.top = Math.max(12, Math.min(innerHeight - bounds.height - 12, button.bottom + 8)) + 'px';
  }
  /** Updates the existing hint without reopening a notice the reader dismissed. */
  function updateMusicNotice(state: MusicNoticeState) {
    $('music-notice-hint').textContent = musicHints[lang][state.playing ? 0 : 1]!;
    $<HTMLInputElement>('music-volume').value = String(music.volume);
    $('music-volume-value').textContent = Math.round(music.volume * 100) + '%';
  }
  $('music-volume-label').textContent = copy.volume;
  $('music-notice-close').setAttribute('aria-label', copy.close);
  notice.setAttribute('aria-label', copy.music);
  const readingMusic = bindReadingMusic({
    audio: music, button: musicButton, prefs, save,
    isGateway: () => document.documentElement.hasAttribute('data-gateway'), labels: { play: copy.on, pause: copy.off },
    notice: {
      show(state) { notice.hidden = false; updateMusicNotice(state); placeMusicNotice(); },
      update: updateMusicNotice,
      hide() { notice.hidden = true; },
    },
  });
  $('music-notice-close').addEventListener('click', () => readingMusic.closeNotice(), { signal });
  $('music-volume').addEventListener('input', () => readingMusic.setVolume(Number($<HTMLInputElement>('music-volume').value)), { signal });
  document.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('#music-notice, #music-toggle, .world-choice, #world-toggle')) readingMusic.closeNotice();
  }, { signal });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') readingMusic.closeNotice(); }, { signal });
  addEventListener('resize', placeMusicNotice, { signal });
  addEventListener('scroll', placeMusicNotice, { passive: true, signal });
  readingMusic.enter('magic');
  // The notice greets the first entry into the magic world in this tab, not every return to it.
  try {
    if (sessionStorage.getItem('alux-music-world') === 'magic') readingMusic.closeNotice();
    sessionStorage.setItem('alux-music-world', 'magic');
  } catch {}
  return () => { controller.abort(); readingMusic.dispose(); };
}
