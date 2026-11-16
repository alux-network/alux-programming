// Pure navigation meaning, shared by paper folds and chapter-frame commits.
// DOM interpreters own timing and presentation; only the matching ready token can commit a view.
export interface ReaderView {
  world: 'magic' | 'real';
  mode: 'pages' | 'scroll';
  chapter: string;
  progress: number;
}
export interface TransitionState {
  view: ReaderView;
  revision: number;
  measurement: number;
  pending?: { token: number; view: ReaderView };
}
export type TransitionEvent =
  | { type: 'begin'; view: ReaderView }
  | { type: 'ready'; token: number; progress?: number }
  | { type: 'font' }
  | { type: 'replace'; view: ReaderView };

/** Creates an idle reading view without audio or presentation state. */
export function transitionState(view: ReaderView): TransitionState {
  return { view, revision: 0, measurement: 0 };
}

/** Interprets a reading event without side effects or time-dependent ordering. */
export function transition(state: TransitionState, event: TransitionEvent): TransitionState {
  switch (event.type) {
    case 'begin': {
      const revision = state.revision + 1;
      return { ...state, revision, pending: { token: revision, view: event.view } };
    }
    case 'font': return { ...state, measurement: state.measurement + 1 };
    case 'replace': return { view: event.view, revision: state.revision + 1, measurement: state.measurement + 1 };
    case 'ready': return state.pending?.token === event.token
      ? { view: { ...state.pending.view, progress: event.progress ?? state.pending.view.progress }, revision: state.revision, measurement: state.measurement }
      : state;
  }
}

/** Returns whether a callback still belongs to the pending reading change. */
export function acceptsReady(state: TransitionState, token: number): boolean {
  return state.pending?.token === token;
}
