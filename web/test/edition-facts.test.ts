import assert from 'node:assert/strict';
import test from 'node:test';
import { languages, countryEditions, readerName } from '../languages.ts';

test('every country resolves to its declaring edition and every reader name is explicit', () => {
  const countries = countryEditions(languages);
  for (const edition of languages) {
    assert.ok(edition.readerName.trim());
    assert.equal(readerName(edition.code), edition.readerName);
    for (const country of edition.countries) assert.equal(countries.get(country), edition.code);
  }
  assert.equal(countries.size, languages.reduce((n, edition) => n + edition.countries.length, 0));
});

test('country configuration rejects ambiguous and malformed declarations', () => {
  const edition = { code: 'a', name: 'A', readerName: 'A', countries: ['AA'] };
  assert.throws(() => countryEditions([edition, { ...edition, code: 'b' }]), /duplicate country/);
  assert.throws(() => countryEditions([edition, edition]), /Duplicate edition/);
  assert.throws(() => countryEditions([{ ...edition, countries: ['bad'] }]), /Invalid/);
});
