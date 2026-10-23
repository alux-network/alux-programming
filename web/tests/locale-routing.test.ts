import assert from 'node:assert/strict';
import test from 'node:test';
import {htmlLanguage,languagePath,languages,normalizeLanguage,pathLanguage,stripLanguage} from '../src/locale-routing.ts';
import type {LanguageCode} from '../src/locale-routing.ts';

const languageCodes:LanguageCode[]=languages.map(language=>language.code);

test('all supported languages resolve from explicit locale paths and retain the requested route',()=>{
  for(const code of languageCodes){
    const explicitPath='/'+code+'/parts/concepts.html';
    const canonicalPath=code==='en'?'/parts/concepts.html':explicitPath;
    assert.equal(pathLanguage(explicitPath),code);
    assert.equal(stripLanguage(explicitPath),'/parts/concepts.html');
    assert.equal(languagePath(explicitPath,code),canonicalPath);
  }
});

test('locale aliases resolve to canonical language codes and canonical paths',()=>{
  const aliases:[string,LanguageCode,string][]=[
    ['zh-Hans','zh','/zh/contents.html'],
    ['zh_CN','zh','/zh/contents.html'],
    ['zh-CN','zh','/zh/contents.html'],
    ['zh-SG','zh','/zh/contents.html'],
    ['zh-TW','zh-hant','/zh-hant/contents.html'],
    ['zh_HK','zh-hant','/zh-hant/contents.html'],
    ['zh-MO','zh-hant','/zh-hant/contents.html']
  ];
  for(const [alias,canonical,expectedPath] of aliases){
    assert.equal(normalizeLanguage(alias),canonical);
    const requestedPath=`/${alias}/contents.html`;
    assert.equal(pathLanguage(requestedPath),canonical);
    assert.equal(languagePath(requestedPath,canonical),expectedPath);
  }
});

test('canonicalizing a localized URL preserves its query and chapter anchor',()=>{
  const origin='https://alux.example';
  const requested=new URL('/zh-CN/parts/concepts.html?from=search#composition',origin);
  const language=pathLanguage(requested.pathname);
  assert.ok(language);
  const canonical=new URL(languagePath(requested.pathname,language)+requested.search+requested.hash,origin);
  assert.equal(canonical.pathname,'/zh/parts/concepts.html');
  assert.equal(canonical.search,'?from=search');
  assert.equal(canonical.hash,'#composition');
});

test('unlocalized paths stay intact, while locale prefixes are stripped with root slash semantics',()=>{
  assert.equal(pathLanguage('/'),null);
  assert.equal(pathLanguage('/parts/concepts.html'),null);
  assert.equal(stripLanguage('/parts/concepts.html'),'/parts/concepts.html');
  assert.equal(stripLanguage('/zh-hant/'),'/');
  assert.equal(stripLanguage('/zh/contents.html/'),'/contents.html/');
  assert.equal(languagePath('/zh/contents.html','en'),'/contents.html');
});

test('language normalization and HTML language tags cover the full supported set',()=>{
  for(const code of languageCodes){
    assert.equal(normalizeLanguage(code.toUpperCase()),code);
    assert.equal(htmlLanguage(code),code==='zh'?'zh-Hans':code==='zh-hant'?'zh-Hant':code);
  }
  assert.equal(normalizeLanguage('fr'),null);
  assert.equal(normalizeLanguage(null),null);
});
