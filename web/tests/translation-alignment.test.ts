import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import type {ReaderBook, ReaderPage, TranslationDictionary, TranslationManifest} from '../src/book.ts';
import {parseHTML} from 'linkedom';
import {localizeBook} from '../src/localization.ts';
import {deriveTranslationManifest,headingAliases,tokenizeFragment,verifyLegacyTranslationContract} from '../scripts/translation-alignment.ts';

const loadJSON=async<T>(url:URL):Promise<T>=>JSON.parse(await fs.readFile(url,'utf8')) as T;

function page(html:string):ReaderPage{
 return {id:'chapter.md',title:'Chapter',source:'chapter.md',group:'Part One',slug:'chapter.html',hash:'fixture',markdown:'# Chapter',headings:[],html,text:'Chapter',minutes:1,parentId:null,children:[]};
}

function book(html:string):ReaderBook{
 return {groups:[{title:'Part One',pages:['chapter.html']}],pages:[page(html)],toc:[{kind:'chapter',id:'chapter.md',title:'Chapter',children:[]}]};
}

function manifest(source:string,tokens:string[]):TranslationManifest{
 return { 'chapter.html':{titleKey:'unit-0',units:[{key:'unit-0',source,tokens}]} };
}

test('tokenizer emits protected elements and ordinary tags in DOM order',()=>{
 const result=tokenizeFragment('<p><strong>Label</strong> uses <code>x &amp; y</code> and <a href="/chapter.html#top">the guide</a><img src="/art/book.png" alt="Book"></p>');
 assert.equal(result.template,'⟦0⟧⟦1⟧Label⟦2⟧ uses ⟦3⟧ and ⟦4⟧the guide⟦5⟧⟦6⟧⟦7⟧');
 assert.deepEqual(result.tokens,['<p>','<strong>','</strong>','<code>x &amp; y</code>','<a href="/chapter.html#top">','</a>','<img src="/art/book.png" alt="Book">','</p>']);
});

test('every approved legacy unit reconstructs the original English placeholder template',async()=>{
 const original=await loadJSON<TranslationManifest>(new URL('../locales/manifest.json',import.meta.url));
 const english=await loadJSON<TranslationDictionary>(new URL('../locales/source.json',import.meta.url));
 assert.doesNotThrow(()=>verifyLegacyTranslationContract(original,english));
});

test('manifest derivation preserves approved placeholder slots while storing native tokens',()=>{
 const legacy=manifest('<strong>Label</strong> uses <code>x</code>.',['<code>x</code>','<strong>','</strong>']);
 const english={ 'unit-0':'⟦1⟧Label⟦2⟧ uses ⟦0⟧.' };
 const native='<p><strong>Label</strong> uses <code class="language-rust">x</code>.</p>';
 const result=deriveTranslationManifest(book(native),legacy,english);
 const unit=result['chapter.html']?.units[0];
 assert.ok(unit);
 assert.equal(unit.source,'<strong>Label</strong> uses <code class="language-rust">x</code>.');
 assert.deepEqual(unit.tokens,['<code class="language-rust">x</code>','<strong>','</strong>']);
});

test('math identity follows the native TeX annotation while rendered KaTeX markup may differ',()=>{
 const oldMath='<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">x</annotation></semantics></math></span></span>';
 const newMath='<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi mathvariant="italic">x</mi></mrow><annotation encoding="application/x-tex">x</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">x</span></span>';
 const legacy=manifest('Value: '+oldMath+'.',[oldMath]);
 const result=deriveTranslationManifest(book('<p>Value: '+newMath+'.</p>'),legacy,{'unit-0':'Value: ⟦0⟧.'});
 assert.equal(result['chapter.html']?.units[0]?.tokens[0],newMath);
});

test('math identity preserves exact TeX annotations even when rendered MathML is unchanged',()=>{
 const oldMath='<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>y</mi><mo mathvariant="normal">#</mo><mi>P</mi></mrow><annotation encoding="application/x-tex">y \\mathrel{\\#} P</annotation></semantics></math></span></span>';
 const nativeMath=oldMath;
 const legacy=manifest('Here '+oldMath+' means P.',[oldMath]);
 const result=deriveTranslationManifest(book('<p>Here '+nativeMath+' means P.</p>'),legacy,{'unit-0':'Here ⟦0⟧ means P.'});
 assert.equal(result['chapter.html']?.units[0]?.tokens[0],nativeMath);
 const changedMath=nativeMath.replace('y \\mathrel{\\#} P','y \\mathrel{#} P');
 assert.throws(()=>deriveTranslationManifest(book('<p>Here '+changedMath+' means P.</p>'),legacy,{'unit-0':'Here ⟦0⟧ means P.'}),/alignment/i);
});

test('derivation rejects changes to protected code or link destinations',()=>{
 const codeManifest=manifest('Use <code>Vec&lt;T&gt;</code>.',['<code>Vec&lt;T&gt;</code>']);
 assert.throws(()=>deriveTranslationManifest(book('<p>Use <code>Vec&lt;U&gt;</code>.</p>'),codeManifest,{'unit-0':'Use ⟦0⟧.'}),/alignment|protected token/i);
 const linkManifest=manifest('Read <a href="/chapter.html">this chapter</a>.',['<a href="/chapter.html">','</a>']);
 assert.throws(()=>deriveTranslationManifest(book('<p>Read <a href="/different.html">this chapter</a>.</p>'),linkManifest,{'unit-0':'Read ⟦0⟧this chapter⟦1⟧.'}),/alignment|protected token/i);
});

test('derivation rejects ambiguous repeated native blocks',()=>{
 const legacy=manifest('Repeated text.',[]);
 assert.throws(()=>deriveTranslationManifest(book('<p>Repeated text.</p><p>Repeated text.</p>'),legacy,{'unit-0':'Repeated text.'}),/ambiguous/i);
});

test('the default Note capitalization is accepted without broad case folding',()=>{
 const legacy=manifest('note',[]);
 const result=deriveTranslationManifest(book('<aside><div class="admonition-title">Note</div></aside>'),legacy,{'unit-0':'note'});
 assert.equal(result['chapter.html']?.units[0]?.source,'Note');
 assert.throws(()=>deriveTranslationManifest(book('<p>NOTE</p>'),legacy,{'unit-0':'note'}),/alignment/i);
});

test('entity serialization differences in native text do not change alignment',()=>{
 const legacy=manifest('Why A &gt; B',[]);
 const result=deriveTranslationManifest(book('<h2>Why A &gt; B</h2>'),legacy,{'unit-0':'Why A &gt; B'});
 assert.equal(result['chapter.html']?.units[0]?.source,'Why A &gt; B');
});

test('standalone native display math remains structural when no legacy translation unit exists',()=>{
 const legacy=manifest('A sentence.',[]);
 const native='<p>A sentence.</p><div class="math-display"><span class="katex-display"><span class="katex"><math><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">x</annotation></semantics></math></span></span></div>';
 const result=deriveTranslationManifest(book(native),legacy,{'unit-0':'A sentence.'});
 assert.equal(result['chapter.html']?.units[0]?.source,'A sentence.');
});

test('protected-token-only table cells are structural while prose cells require catalog entries',()=>{
 const legacy=manifest('Words <code>x</code>.',['<code>x</code>']);
 const native='<p>Words <code class="language-rust">x</code>.</p><table><tbody><tr><td><code>closed_outcome(slot)</code></td></tr></tbody></table>';
 const result=deriveTranslationManifest(book(native),legacy,{'unit-0':'Words ⟦0⟧.'});
 assert.equal(result['chapter.html']?.units[0]?.source,'Words <code class="language-rust">x</code>.');
 assert.throws(()=>deriveTranslationManifest(book(native.replace('<code>closed_outcome(slot)</code>','Meaning oriented')),legacy,{'unit-0':'Words ⟦0⟧.'}),/no approved dictionary entry/i);
});

test('an explicitly cataloged token-only block is still aligned',()=>{
 const raw='<code>closed_outcome(slot)</code>';
 const legacy=manifest(raw,[raw]);
 const result=deriveTranslationManifest(book('<table><tbody><tr><td>'+raw+'</td></tr></tbody></table>'),legacy,{'unit-0':'⟦0⟧'});
 assert.equal(result['chapter.html']?.units[0]?.source,raw);
});

test('only an exactly matched heading anchor may receive a legacy ID alias',()=>{
 const legacy=manifest('Haskell (functional / ADT)<a class="heading-anchor" href="#haskell-functional-adt" aria-label="Link to this section">#</a>',['<a class="heading-anchor" href="#haskell-functional-adt" aria-label="Link to this section">#</a>']);
 const english={'unit-0':'Haskell (functional / ADT)⟦0⟧'};
 const native='<h2>Haskell (functional / ADT)<a aria-label="Link to this section" href="#haskell-functional--adt" class="heading-anchor">#</a></h2>';
 const result=deriveTranslationManifest(book(native),legacy,english);
 assert.equal(result['chapter.html']?.units[0]?.tokens[0]?.includes('href="#haskell-functional--adt"'),true);
 assert.deepEqual(headingAliases(book(native),legacy),[{chapterSlug:'chapter.html',legacyId:'haskell-functional-adt',nativeId:'haskell-functional--adt'}]);
 assert.throws(()=>deriveTranslationManifest(book(native.replace('Haskell (functional / ADT)','Haskell ADT')),legacy,english),/alignment/i);
});

test('derived native fragments localize prose and headings while preserving token markup',()=>{
 const anchor='<a class="heading-anchor" href="#chapter-title" aria-label="Link to this section">#</a>';
 const legacy:TranslationManifest={'chapter.html':{titleKey:'page-title',units:[
  {key:'heading',source:'Chapter title'+anchor,tokens:[anchor]},
  {key:'intro',source:'<strong>Start</strong> with <code>Thing</code>.',tokens:['<code>Thing</code>','<strong>','</strong>']}
 ]}};
 const source={'page-title':'Chapter title',heading:'Chapter title⟦0⟧',intro:'⟦1⟧Start⟦2⟧ with ⟦0⟧.'};
 const native=book('<h1 id="chapter-title">Chapter title'+anchor+'</h1><p><strong>Start</strong> with <code class="language-rust">Thing</code>.</p>');
 const derived=deriveTranslationManifest(native,legacy,source);
 const localized=localizeBook(native,{'page-title':'Chapitre',heading:'Titre⟦0⟧',intro:'⟦1⟧Début⟦2⟧ avec ⟦0⟧.'},derived,text=>text,parseHTML('<html><body></body></html>').document as unknown as Document);
 const {document}=parseHTML('<html><body>'+localized.pages[0]?.html+'</body></html>');
 const heading=document.querySelector('h1');
 const paragraph=document.querySelector('p');
 assert.equal(localized.pages[0]?.title,'Chapitre');
 assert.equal(heading?.textContent,'Titre#');
 assert.equal(heading?.querySelector('.heading-anchor')?.getAttribute('href'),'#chapter-title');
 assert.equal(paragraph?.innerHTML,'<strong>Début</strong> avec <code class="language-rust">Thing</code>.');
});
