import assert from 'node:assert/strict';
import test from 'node:test';
import {parseHTML} from 'linkedom';
import type {ReaderBook, ReaderPage, TranslationManifest} from '../src/book.ts';
import {localizeBook} from '../src/localization.ts';
import {englishUI} from '../src/ui-english.ts';

const sourceHeading='A visitor-based structure';
const sourceParagraph='Read <code>Result&lt;T, E&gt;</code>, follow <a href="/chapter.html#target" data-source="kept">the guide</a> and check <span class="katex"><span class="katex-mathml">x + y</span></span>.';
const anchor='<a class="heading-anchor" href="#chapter-title" aria-label="Link to this section">#</a>';
const protectedHeadingAnchor=`${sourceHeading}${anchor}`;
const protectedCode='<code>Result&lt;T, E&gt;</code>';
const protectedLinkOpen='<a href="/chapter.html#target" data-source="kept">';
const protectedLinkClose='</a>';
const protectedMath='<span class="katex"><span class="katex-mathml">x + y</span></span>';

function page(id:string,slug:string,title:string,html:string,parentId:string|null=null,children:string[]=[]):ReaderPage{
  return {id,title,source:`${id}.md`,group:'Part One',slug,hash:`hash-${id}`,markdown:`# ${title}\n`,headings:[{level:1,id:'chapter-title',text:title}],html,text:title,minutes:3,parentId,children};
}

function fixture():ReaderBook{
  const chapter=page('chapter-1','chapter.html',sourceHeading,`<h1 id="chapter-title">${protectedHeadingAnchor}</h1><p>${sourceParagraph}</p>`,null,['chapter-2']);
  const child=page('chapter-2','child.html','Nested source','<h1 id="child-title">Nested source</h1>',chapter.id,[]);
  return {
    groups:[{title:'Part One',pages:[chapter.slug,child.slug]}],
    pages:[chapter,child],
    toc:[
      {kind:'part',title:'Part One'},
      {kind:'chapter',id:chapter.id,title:chapter.title,children:[{kind:'chapter',id:child.id,title:child.title,children:[]},{kind:'separator'}]},
      {kind:'separator'}
    ]
  };
}

function manifestFor(book:ReaderBook):TranslationManifest{
  return {
    'chapter.html':{titleKey:'title.chapter',units:[
      {key:'unit.heading',source:protectedHeadingAnchor,tokens:[anchor]},
      {key:'unit.body',source:sourceParagraph,tokens:[protectedCode,protectedLinkOpen,protectedLinkClose,protectedMath]}
    ]},
    'child.html':{titleKey:'title.child',units:[]}
  };
}

function translatedBook(book:ReaderBook,document:Document):ReaderBook{
  const dictionary={
    'title.chapter':'Une structure visitable',
    'title.child':'Titre imbriqué',
    'unit.heading':`Une structure visitable ⟦0⟧`,
    'unit.body':'Lire ⟦0⟧, suivre ⟦1⟧le guide⟦2⟧ et vérifier ⟦3⟧.'
  };
  return localizeBook(book,dictionary,manifestFor(book),text=>text==='Part One'?'Première partie':text,document);
}

test('translated reader preserves chapter hierarchy, metadata, source markup, and translated TOC titles',()=>{
  const original=fixture();
  const {document}=parseHTML('<!doctype html><html><body></body></html>');
  const localized=translatedBook(original,document as unknown as Document);

  assert.equal(localized.pages[0].id,original.pages[0].id);
  assert.equal(localized.pages[0].slug,original.pages[0].slug);
  assert.equal(localized.pages[0].source,original.pages[0].source);
  assert.equal(localized.pages[0].hash,original.pages[0].hash);
  assert.equal(localized.pages[0].markdown,original.pages[0].markdown);
  assert.equal(localized.pages[0].parentId,original.pages[0].parentId);
  assert.deepEqual(localized.pages[0].children,original.pages[0].children);
  assert.equal(localized.pages[1].parentId,original.pages[1].parentId);
  assert.deepEqual(localized.toc.map(node=>node.kind),original.toc.map(node=>node.kind));
  assert.equal(localized.toc[0].kind,'part');
  if(localized.toc[0].kind==='part')assert.equal(localized.toc[0].title,'Première partie');
  assert.equal(localized.toc[1].kind,'chapter');
  if(localized.toc[1].kind==='chapter'){
    assert.equal(localized.toc[1].id,'chapter-1');
    assert.equal(localized.toc[1].title,'Une structure visitable');
    assert.equal(localized.toc[1].children[0].kind,'chapter');
    if(localized.toc[1].children[0].kind==='chapter'){
      assert.equal(localized.toc[1].children[0].id,'chapter-2');
      assert.equal(localized.toc[1].children[0].title,'Titre imbriqué');
    }
    assert.equal(localized.toc[1].children[1].kind,'separator');
  }
  assert.equal(localized.groups[0].title,'Première partie');
  assert.deepEqual(localized.groups[0].pages,original.groups[0].pages);

  const translatedDOM=parseHTML(`<article>${localized.pages[0].html}</article>`).document;
  const heading=translatedDOM.querySelector('h1');
  assert.equal(heading?.id,'chapter-title');
  assert.equal(heading?.textContent?.replace(/#$/,'').trim(),'Une structure visitable');
  assert.equal(heading?.querySelector('a.heading-anchor')?.getAttribute('href'),'#chapter-title');
  const code=translatedDOM.querySelector('code');
  assert.equal(code?.textContent,'Result<T, E>');
  assert.equal(translatedDOM.querySelector('code')?.outerHTML,protectedCode);
  const link=translatedDOM.querySelector('p a');
  assert.equal(link?.getAttribute('href'),'/chapter.html#target');
  assert.equal(link?.getAttribute('data-source'),'kept');
  assert.equal(translatedDOM.querySelector('.katex')?.outerHTML,protectedMath);
  assert.match(localized.pages[0].text,/Result<T, E>/);
});

test('the same localization helper works with separate browser-like and static DOM documents',()=>{
  const original=fixture();
  const browserDocument=parseHTML('<!doctype html><html><body></body></html>').document as unknown as Document;
  const staticDocument=parseHTML('<!doctype html><html><body><main></main></body></html>').document as unknown as Document;

  const browserBook=translatedBook(original,browserDocument);
  const staticBook=translatedBook(original,staticDocument);
  assert.deepEqual(staticBook,browserBook);
  assert.equal(staticBook.pages[0].title,'Une structure visitable');
});

test('missing translations and unmatched source units fail with useful messages',()=>{
  const original=fixture();
  const {document}=parseHTML('<!doctype html><html><body></body></html>');
  const manifest=manifestFor(original);
  assert.throws(
    ()=>localizeBook(original,{'title.chapter':'Titre'},manifest,englishUI,document as unknown as Document),
    /Translation is missing: unit\.heading/
  );
  const wrongManifest:TranslationManifest={...manifest,'chapter.html':{...manifest['chapter.html'],units:[{key:'unit.heading',source:'No matching content',tokens:[]}]}};
  assert.throws(
    ()=>localizeBook(original,{'title.chapter':'Titre','unit.heading':'Titre'},wrongManifest,englishUI,document as unknown as Document),
    /Translated block cannot be matched: unit\.heading/
  );
});

test('English display normalization applies to page, group, part, and chapter titles without changing content',()=>{
  const original=fixture();
  original.pages[0].title='Search the book';
  original.pages[0].html='<h1 id="chapter-title">Search the book</h1>';
  original.groups[0].title='The book';
  original.toc[0]={kind:'part',title:'The book'};
  if(original.toc[1].kind==='chapter')original.toc[1].title='Search the book';
  const {document}=parseHTML('<!doctype html><html><body></body></html>');
  const localized=localizeBook(original,undefined,{},englishUI,document as unknown as Document);
  assert.equal(localized.pages[0].title,'Search');
  assert.equal(localized.pages[0].html,original.pages[0].html);
  assert.equal(localized.groups[0].title,'The Book');
  if(localized.toc[0].kind==='part')assert.equal(localized.toc[0].title,'The Book');
  if(localized.toc[1].kind==='chapter')assert.equal(localized.toc[1].title,'Search');
});
