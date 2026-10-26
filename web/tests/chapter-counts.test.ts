import test from 'node:test';
import assert from 'node:assert/strict';
import {recordChapterCount,invalidateChapterCounts} from '../src/chapter-counts.ts';
import type {ReaderPage} from '../src/book.ts';
const edition=()=>[{id:'a.md'},{id:'b.md'},{id:'c.md'}] as ReaderPage[];
test('global numbering is unavailable until every count was learned from that edition and exact layout',()=>{
 const pages=edition();assert.equal(recordChapterCount(pages,'layout',pages[1]!,4),null);
 assert.equal(recordChapterCount(pages,'layout',pages[0]!,6),null);
 assert.deepEqual(recordChapterCount(pages,'layout',pages[2]!,2),{offset:10,total:12});
 assert.deepEqual(recordChapterCount(pages,'layout',pages[1]!,5),{offset:6,total:13});
 assert.equal(recordChapterCount(pages,'other-size',pages[0]!,6),null);
 const other=edition();assert.equal(recordChapterCount(other,'layout',other[0]!,6),null);
});
test('font invalidation and bounded layout history cannot reuse stale counts',()=>{
 const pages=edition();for(const page of pages)recordChapterCount(pages,'old',page,2);
 invalidateChapterCounts(pages);assert.equal(recordChapterCount(pages,'old',pages[0]!,2),null);
 for(let i=0;i<9;i++)recordChapterCount(pages,'layout-'+i,pages[0]!,2);
 assert.equal(recordChapterCount(pages,'layout-0',pages[1]!,2),null);
 assert.throws(()=>recordChapterCount(pages,'x',pages[0]!,0),/Invalid/);
});
