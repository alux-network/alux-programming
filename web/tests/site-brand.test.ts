import assert from 'node:assert/strict';
import test from 'node:test';
import {languages} from '../src/locale-routing.ts';
import {siteBrandName,brandedPageTitle} from '../src/site-meta.ts';

test('site identity uses Chinese for Chinese editions and English for other languages',()=>{
 for(const {code}of languages){
  const name=code==='zh'?'ALUX 编程':code==='zh-hant'?'ALUX 程式設計':'ALUX Programming';
  assert.equal(siteBrandName(code),name);
  assert.equal(brandedPageTitle('',code),name);
  assert.equal(brandedPageTitle('章节 · ALUX Programming',code),'章节 · '+name);
  assert.equal(brandedPageTitle('章节 · '+name,code),'章节 · '+name);
 }
});
