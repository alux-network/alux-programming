import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import { musicCopy, musicHints } from './music-messages.ts';
import {
  readerAudioState,
  subscribeReaderAudio,
  toggleReaderAudio,
  setReaderVolume
} from './reader-audio.ts';
import type { LanguageCode } from './locale-routing.ts';

export function MusicControls(props: {
  host: HTMLElement | null;
  locale: LanguageCode;
}) {
  const [state, setState] = createSignal(readerAudioState()),
    [visible, setVisible] = createSignal(false),
    [position, setPosition] = createSignal({ left: '12px', top: '12px' });
  let button: HTMLButtonElement | undefined,
    panel: HTMLElement | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    keyboard = false,
    adjusting = false;
  const copy = () => musicCopy[props.locale];
  const dismiss = () => {
    clearTimeout(timer);
    keyboard = false;
    adjusting = false;
    setVisible(false);
  };
  function place() {
    if (!button || !panel || !visible()) return;
    const rect = button.getBoundingClientRect(),
      bounds = panel.getBoundingClientRect();
    setPosition({
      left:
        Math.max(
          12,
          Math.min(innerWidth - bounds.width - 12, rect.right - bounds.width)
        ) + 'px',
      top:
        Math.max(
          12,
          Math.min(innerHeight - bounds.height - 12, rect.bottom + 8)
        ) + 'px'
    });
  }
  function schedule(delay = 5000) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!panel?.matches(':hover') && !keyboard && !adjusting) dismiss();
    }, delay);
  }
  function show() {
    setVisible(true);
    requestAnimationFrame(place);
    schedule();
  }
  let previous = state().hintRevision;
  createEffect(() => {
    const revision = state().hintRevision;
    if (revision !== previous) {
      previous = revision;
      show();
    }
    if (!state().realm) dismiss();
  });
  createEffect(() => {
    props.host;
    props.locale;
    requestAnimationFrame(place);
  });
  onMount(() => {
    const unsubscribe = subscribeReaderAudio(setState);
    const finish = () => {
      if (adjusting) {
        adjusting = false;
        schedule(2000);
      }
    };
    const outside = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest('[data-reader-music]')
      )
        dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    addEventListener('resize', place);
    addEventListener('scroll', place, { passive: true });
    document.addEventListener('click', outside);
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerup', finish, { passive: true });
    document.addEventListener('pointercancel', finish, { passive: true });
    onCleanup(() => {
      unsubscribe();
      clearTimeout(timer);
      removeEventListener('resize', place);
      removeEventListener('scroll', place);
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
    });
  });
  return (
    <>
      <Show when={props.host} keyed>
        {(host) => (
          <Portal mount={host}>
            <button
              ref={button}
              type="button"
              data-reader-music
              class="reader-music-button"
              classList={{ 'is-playing': state().playing }}
              aria-label={state().playing ? copy().off : copy().on}
              title={state().playing ? copy().off : copy().on}
              aria-pressed={state().playing}
              onClick={() => {
                toggleReaderAudio();
                show();
              }}
              onMouseEnter={show}
              onFocus={show}
            >
              <span aria-hidden="true">{state().playing ? '♫' : '♪'}</span>
            </button>
          </Portal>
        )}
      </Show>
      <Portal>
        <section
          ref={panel}
          data-reader-music
          class="reader-music-popover"
          hidden={!visible() || !state().realm}
          style={position()}
          dir={props.locale === 'ar' ? 'rtl' : 'ltr'}
          aria-label={copy().music}
          onPointerEnter={() => clearTimeout(timer)}
          onPointerLeave={() => schedule(2000)}
          onPointerDown={(event) => {
            keyboard = false;
            adjusting =
              event.target instanceof Element &&
              event.target.matches('[data-music-volume]');
            clearTimeout(timer);
          }}
          onKeyDown={() => {
            keyboard = true;
            clearTimeout(timer);
          }}
          onFocusOut={(event) => {
            if (
              !(event.relatedTarget instanceof Node) ||
              !event.currentTarget.contains(event.relatedTarget)
            ) {
              keyboard = false;
              schedule(2000);
            }
          }}
        >
          <div class="reader-music-heading">
            <p data-music-hint role="status">
              {musicHints[props.locale][state().playing ? 0 : 1]}
            </p>
            <button
              type="button"
              data-music-close
              aria-label={copy().close}
              onClick={dismiss}
            >
              ×
            </button>
          </div>
          <label class="reader-music-volume">
            <span data-music-volume-label>{copy().volume}</span>
            <input
              data-music-volume
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state().volume}
              onInput={(event) => {
                setReaderVolume(Number(event.currentTarget.value));
                clearTimeout(timer);
              }}
            />
            <output>{Math.round(state().volume * 100)}%</output>
          </label>
          <p class="reader-music-error" role="status" hidden={!state().failed}>
            {copy().unavailable}
          </p>
        </section>
      </Portal>
    </>
  );
}
