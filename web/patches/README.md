# page-flip 2.0.7 lifecycle patch

The reader owns and destroys one PageFlip instance per layout. Upstream 2.0.7
continues its requestAnimationFrame loop after destroy and retains its resize
listener when useMouseEvents is false. Its delayed Safari init also survives
immediate destruction. This pinned pnpm patch stops the render loop, removes
handlers unconditionally, cancels init, and clears pages/event callbacks.
Readable upstream sources and both published bundles carry the same fix; the
upstream MIT license is retained. No global scheduling APIs are patched at runtime.

`node scripts/verify-page-flip.ts` creates/destroys five actual instances, including
mid-turn and immediate destruction. Before: 5 active frames and 5 resize listeners;
after: 0 frames, 0 listeners, 0 hosts and no uncaught exceptions. Use a Playwright
Chromium installation or PLAYWRIGHT_CHROMIUM_EXECUTABLE.

Remove this patch when a pinned upstream release fixes these defects and passes
the same regression. Do not edit node_modules as the delivery mechanism.
