// Private renderer assumptions are confined to the exact dependency this adapter was written for.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { STPAGEFLIP_VERSION } from '../stpageflip-version.ts';

function verify(version: string, expected: string) {
  assert.equal(version, expected, 'Review private StPageFlip hooks before upgrading');
}
test('installed and declared StPageFlip versions match the private adapter contract', () => {
  const installed = JSON.parse(readFileSync('node_modules/page-flip/package.json', 'utf8')).version;
  const declared = JSON.parse(readFileSync('package.json', 'utf8')).devDependencies['page-flip'];
  verify(installed, STPAGEFLIP_VERSION);
  verify(declared, STPAGEFLIP_VERSION);
});
test('a dependency upgrade fails the adapter contract', () => {
  assert.throws(() => verify('2.0.8', STPAGEFLIP_VERSION), assert.AssertionError);
});
