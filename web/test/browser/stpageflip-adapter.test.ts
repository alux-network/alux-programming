// Extended browser contract for the installed StPageFlip engine; runs with npm run test:browser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { chromium } from 'playwright';

interface Hook { name: string; type: string; arity: number | null }
const hooks = [
  ['getRender', 0], ['getFlipController', 0],
  ['drawFrame', 0], ['setFlippingPage', 1], ['convertToGlobal', 2], ['finishAnimation', 0],
  ['start', 1], ['fold', 1], ['stopMove', 0],
] as const;

/** Checks the callable hooks and argument shapes used by the private adapter. */
function verifyHooks(actual: Hook[]) {
  for (const [name, arity] of hooks) {
    const hook = actual.find(hook => hook.name === name);
    assert.equal(hook?.type, 'function', name + ' must be callable');
    assert.equal(hook?.arity, arity, name + ' argument shape');
  }
}

test('the installed HTML engine exposes every private adapter hook after loading pages', async (t) => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="book" style="width:800px;height:600px"><div>Left</div><div>Right</div></div>');
    await page.addScriptTag({ path: createRequire(import.meta.url).resolve('page-flip') });
    const actual = await page.evaluate(() => {
      const PageFlip = (window as any).St.PageFlip;
      const host = document.getElementById('book')!;
      const engine = new PageFlip(host, { width: 400, height: 600 });
      engine.loadFromHTML([...host.children]);
      const describe = (object: any, names: string[]) => names.map(name => ({
        name, type: typeof object?.[name], arity: typeof object?.[name] === 'function' ? object[name].length : null,
      }));
      try {
        return [
          ...describe(engine, ['getRender', 'getFlipController']),
          ...describe(engine.getRender?.(), ['drawFrame', 'setFlippingPage', 'convertToGlobal', 'finishAnimation']),
          ...describe(engine.getFlipController?.(), ['start', 'fold', 'stopMove']),
        ];
      } finally { engine.destroy(); }
    });
    verifyHooks(actual);
    for (const [name, arity] of hooks) {
      await t.test(name + ' rejects a missing hook or incompatible arguments', () => {
        assert.throws(() => verifyHooks(actual.filter(hook => hook.name !== name)), assert.AssertionError);
        assert.throws(() => verifyHooks(actual.map(hook => hook.name === name ? { ...hook, type: 'object' } : hook)), assert.AssertionError);
        assert.throws(() => verifyHooks(actual.map(hook => hook.name === name ? { ...hook, arity: arity + 1 } : hook)), assert.AssertionError);
      });
    }
  } finally { await browser.close(); }
});
