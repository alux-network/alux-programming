import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { parseMdBookExport } from '../scripts/mdbook-model.ts';
import { chaptersOf, htmlPath, readerSlug } from '../scripts/book-model.ts';
import type { ReaderBook, TranslationDictionary } from '../src/book.ts';
import { localizeBook } from '../src/localization.ts';
import { resolveAnchor } from '../src/anchors.ts';

const web = path.resolve(import.meta.dirname, '..');
const raw = parseMdBookExport(JSON.parse(await fs.readFile(path.join(web,'.cache/mdbook/build/reader-json/book.json'),'utf8')) as unknown);
const reader = JSON.parse(await fs.readFile(path.join(web,'public/content.json'),'utf8')) as ReaderBook;
const markup = (html:string):Document => parseHTML('<html><body><article>'+html+'</article></body></html>').document as unknown as Document;
const code = (document:Document):string[] => [...document.querySelectorAll('pre code')].map(node=>(node.textContent||'').replace(/\n$/,''));
const math = (document:Document):string[] => [...document.querySelectorAll('annotation[encoding="application/x-tex"]')].map(node=>node.textContent||'');

test('real book hierarchy and ordering come from mdBook JSON, with no lost chapter',()=>{
  const chapters=chaptersOf(raw.book).filter(chapter=>chapter.path);
  assert.equal(reader.pages.length,chapters.length);
  assert.deepEqual(reader.pages.map(page=>page.id),chapters.map(chapter=>chapter.source_path||chapter.path));
  assert.deepEqual(reader.pages.map(page=>page.slug),chapters.map(readerSlug));
  assert.deepEqual(reader.groups.map(group=>group.title),raw.book.sections.flatMap(item=>typeof item==='object'&&'PartTitle'in item?[item.PartTitle]:[]));
  assert.ok(reader.toc.some(node=>node.kind==='separator'));
  for(const page of reader.pages)assert.ok(page.children.every(id=>reader.pages.some(child=>child.id===id&&child.parentId===page.id)));
});

test('canonical mdBook anchors, source code and every mathematical expression survive adaptation',async()=>{
  for(const chapter of chaptersOf(raw.book)){
    const nativePath=htmlPath(chapter);if(!nativePath)continue;
    const native=parseHTML(await fs.readFile(path.join(web,'.cache/mdbook/build/html',nativePath),'utf8')).document as unknown as Document;
    const page=reader.pages.find(candidate=>candidate.id===(chapter.source_path||chapter.path));assert.ok(page);
    const presented=markup(page.html);
    assert.deepEqual(page.headings.map(heading=>heading.id),[...native.querySelectorAll('main h1,main h2,main h3,main h4,main h5,main h6')].map(heading=>heading.id),page.slug+' anchors');
    assert.deepEqual(code(presented),code(native),page.slug+' code');
    assert.deepEqual(math(presented),math(native),page.slug+' math');
    assert.equal(page.markdown,chapter.content);
  }
});

test('rendered local chapter links and anchors resolve without source-file conventions',()=>{
  const bySlug=new Map(reader.pages.map(page=>[page.slug,markup(page.html)]));
  for(const page of reader.pages){const document=bySlug.get(page.slug);assert.ok(document);for(const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')){
    const href=anchor.getAttribute('href')||'';if(!href||/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)||href.startsWith('/book-assets/'))continue;
    const target=new URL(href,'https://book.invalid/'+page.slug);const slug=target.pathname.slice(1),chapter=bySlug.get(slug);assert.ok(chapter,`${page.slug}: ${href}`);
    if(target.hash){const id=decodeURIComponent(target.hash.slice(1));assert.ok([...chapter.querySelectorAll('[id]')].some(node=>node.id===id),`${page.slug}: missing ${href}`);}
  }}
});

test('legacy deep links resolve to native headings through the same reader helper',()=>{
  let aliases=0;
  for(const page of reader.pages)for(const [legacy,native] of Object.entries(page.anchorAliases??{})){
    aliases++;
    assert.ok(page.headings.some(heading=>heading.id===native));
    assert.equal(resolveAnchor(page,encodeURIComponent(legacy)),native);
    assert.equal(resolveAnchor(page,encodeURIComponent(native)),native);
  }
  assert.ok(aliases>0,'the existing catalog includes changed native punctuation rules');
});

test('all approved translations retain identical identity, code, equations and source links',async()=>{
  assert.ok(reader.translationManifest,'generated native translation manifest');
  for(const language of['zh','zh-hant','ja','ko','vi','de','es','ru','uk','ar']){
    const dictionary=JSON.parse(await fs.readFile(path.join(web,'locales',language+'.json'),'utf8')) as TranslationDictionary;
    const localized=localizeBook(reader,dictionary,reader.translationManifest,text=>text,markup(''));
    assert.deepEqual(localized.pages.map(page=>page.id),reader.pages.map(page=>page.id));
    for(const [index,page]of localized.pages.entries()){
      const before=markup(reader.pages[index].html),after=markup(page.html);
      assert.deepEqual(code(after),code(before),language+' '+page.slug+' code');
      // Native word order can move inline tokens; their content and multiplicity remain exact.
      assert.deepEqual(math(after).sort(),math(before).sort(),language+' '+page.slug+' math');
      assert.deepEqual([...after.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).sort(),[...before.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).sort(),language+' '+page.slug+' links');
      assert.deepEqual(page.headings.map(h=>h.id),reader.pages[index].headings.map(h=>h.id));
    }
  }
});
