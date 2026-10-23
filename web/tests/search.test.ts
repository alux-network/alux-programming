import assert from 'node:assert/strict';
import test from 'node:test';
import {searchBook} from '../src/search.ts';
import type {ReaderPage} from '../src/book.ts';
const page=(title:string,text:string):ReaderPage=>({title,text} as ReaderPage);

test('search retains title priority, all-term matching, stable ties and snippet offsets',()=>{
 const pages=[page('First','Rust type'),page('Rust','The type algebra'),page('Third','RUST type'),page('Other','Rust alone')];
 const hits=searchBook(pages,'RUST type');
 assert.deepEqual(hits.map(hit=>[hit.p.title,hit.score,hit.at]),[['Rust',16,-1],['First',2,0],['Third',2,0]]);
 assert.deepEqual(searchBook(pages,'missing'),[]);
});

test('cached search indexes do not leak across localized book datasets',()=>{
 const english=[page('Meaning','A program')],chinese=[page('含义','程序')],arabic=[page('المعنى','برنامج')];
 assert.equal(searchBook(english,'program').length,1);
 assert.equal(searchBook(chinese,'program').length,0);
 assert.equal(searchBook(chinese,'程序')[0]?.p,chinese[0]);
 assert.equal(searchBook(arabic,'برنامج')[0]?.p,arabic[0]);
 assert.equal(searchBook(english,'含义').length,0);
});
