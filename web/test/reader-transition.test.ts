// Laws over reading changes, with a single broken interpreter for each law.
import assert from 'node:assert/strict';
import test from 'node:test';
import { transition, transitionState, acceptsReady } from '../reader-transition.ts';
import type { TransitionEvent, TransitionState } from '../reader-transition.ts';

const first = { world: 'magic', mode: 'pages', chapter: 'first', progress: .2 } as const;
const next = { ...first, chapter: 'next', progress: 0 };
type Step = typeof transition;
const pending = () => transition(transitionState(first), { type: 'begin', view: next });

const laws: Record<string, { check: (step: Step) => void; broken: Step }> = {
  'font events change measurement without completing or cancelling a transition': {
    check(step) {
      const state = pending(), measured = step(state, { type: 'font' });
      assert.deepEqual(measured.pending, state.pending);
      assert.deepEqual(measured.view, first);
      assert.equal(measured.measurement, state.measurement + 1);
    },
    broken(state, event) { return event.type === 'font' ? transition(state, { type: 'replace', view: state.view }) : transition(state, event); },
  },
  'geometry, world and mode replacements never commit the cancelled destination': {
    check(step) {
      for (const view of [first, { ...first, world: 'real' as const }, { ...first, mode: 'scroll' as const }]) {
        const state = pending(), token = state.pending!.token;
        const cancelled = step(state, { type: 'replace', view });
        assert.equal(acceptsReady(cancelled, token), false);
        assert.deepEqual(step(cancelled, { type: 'ready', token }).view, view);
      }
    },
    broken(state, event) { return event.type === 'replace' ? { ...state, view: event.view } : transition(state, event); },
  },
  'stale readiness cannot replace a newer reading request': {
    check(step) {
      const state = pending(), token = state.pending!.token;
      const newer = step(state, { type: 'begin', view: { ...next, chapter: 'newest' } });
      assert.deepEqual(step(newer, { type: 'ready', token }), newer);
      assert.equal(step(newer, { type: 'ready', token: newer.pending!.token }).view.chapter, 'newest');
    },
    broken(state, event) { return event.type === 'ready' && state.pending ? transition(state, { ...event, token: state.pending.token }) : transition(state, event); },
  },
  'a completed change has no audio effect or playback state': {
    check(step) {
      const state = pending(), committed = step(state, { type: 'ready', token: state.pending!.token });
      assert.deepEqual(committed.view, next);
      assert.deepEqual(Object.keys(committed).sort(), ['measurement', 'revision', 'view']);
      assert.deepEqual(Object.keys(committed.view).sort(), ['chapter', 'mode', 'progress', 'world']);
    },
    broken(state, event) { return { ...transition(state, event), audio: 'pause' } as TransitionState; },
  },
};
for (const [name, law] of Object.entries(laws)) {
  test(name, () => law.check(transition));
  test(name + ' rejects its broken interpreter', () => assert.throws(() => law.check(law.broken), assert.AssertionError));
}

test('transition events are immutable and matching readiness commits only once', () => {
  const original = transitionState(first), event: TransitionEvent = { type: 'begin', view: next };
  const state = transition(original, event);
  assert.equal(original.pending, undefined);
  const done = transition(state, { type: 'ready', token: state.pending!.token });
  assert.equal(done.pending, undefined);
  assert.equal(transition(done, { type: 'ready', token: state.pending!.token }), done);
});

test('readiness supplies the measured chapter progress without replacing its requested identity', () => {
  const state = pending(), token = state.pending!.token;
  assert.deepEqual(transition(state, { type: 'ready', token, progress: .75 }).view, { ...next, progress: .75 });
  assert.equal(transition(state, { type: 'ready', token: token + 1, progress: .75 }), state);
});
