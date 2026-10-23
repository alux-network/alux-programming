import assert from 'node:assert/strict';
import test from 'node:test';
import {parseHTML} from 'linkedom';
import {presentChapter,readingArt} from '../scripts/reader-presentation.ts';

test('mapped illustrations reserve their intrinsic size before lazy loading',()=>{
  for(const [source,runtime] of Object.entries(readingArt)){
    const chapter=presentChapter(`<main><h1 id="chapter">Chapter</h1><p><img src="${source}" alt="Illustration"></p></main>`,'chapter.html',new Map());
    const image=parseHTML(chapter.html).document.querySelector('img');
    assert.equal(image?.getAttribute('src'),runtime);
    assert.equal(image?.getAttribute('width'),'512');
    assert.equal(image?.getAttribute('height'),'512');
    assert.equal(image?.getAttribute('loading'),'lazy');
    assert.equal(image?.getAttribute('alt'),'Illustration');
  }
});
