import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMdBookExport } from '../scripts/mdbook-model.ts';
import { transformBook } from '../scripts/book-model.ts';
import type { MdBook, MdBookChapter } from '../scripts/mdbook-model.ts';
import { presentChapter } from '../scripts/reader-presentation.ts';
import { normalizeBookLineEndings } from '../scripts/mdbook-line-endings.ts';
import { protectMathAnnotations } from '../scripts/mdbook-math-annotations.ts';
import { parseHTML } from 'linkedom';

const chapter = (name: string, path: string, sub_items: {Chapter: MdBookChapter}[] = []): MdBookChapter => ({ name, content: '# ' + name, number: [1], path, source_path: path, parent_names: [], sub_items });
const html = (content: string): string => '<!doctype html><html><body><main>' + content + '</main></body></html>';

test('Book JSON determines ordering, nested identity and parts without filesystem inference', () => {
  const child = chapter('Child', 'deep/child.md');
  const parent = chapter('Parent', 'parent.md', [{Chapter:child}]);
  const book: MdBook = { sections: [{ PartTitle: 'Part A' }, { Chapter: parent }, 'Separator', { PartTitle: 'Part B' }, { Chapter: chapter('Last', 'last.md') }] };
  const rendered = new Map([['parent.html',html('<h1 id="canonical-parent">Parent</h1>')],['deep/child.html',html('<h1 id="canonical-child">Child</h1>')],['last.html',html('<h1 id="last">Last</h1>')]]);
  const result = transformBook(book, rendered);
  assert.deepEqual(result.pages.map(page => page.id), ['parent.md', 'deep/child.md', 'last.md']);
  assert.equal(result.pages[1].parentId, 'parent.md');
  assert.deepEqual(result.pages[0].children, ['deep/child.md']);
  assert.deepEqual(result.groups.map(group => group.pages), [['parent.html','deep/child.html'],['last.html']]);
  assert.equal(result.toc[1].kind, 'chapter');
  assert.equal(result.pages[0].headings[0].id, 'canonical-parent');
});

test('mdBook native heading IDs, links, code and math survive reader presentation', () => {
  const source = html('<h2 id="native-punctuation"><a class="header" href="#native-punctuation">A heading?</a></h2><p><a href="../target.html#native-id">target</a> <a href="https://example.com/a.md">external</a> <code>x &lt; y</code></p><pre><code class="language-rust noplayground">fn main() { println!("a"); }\n</code></pre><p><span class="katex"><span class="katex-mathml"><annotation encoding="application/x-tex">a^2+b^2=c^2</annotation></span><span class="katex-html">rendered</span></span></p>');
  const result = presentChapter(source, 'nested/chapter.html', new Map([['target.html','target.html']]));
  assert.equal(result.headings[0].id, 'native-punctuation');
  assert.match(result.html,/href="\/target.html#native-id"/);
  assert.match(result.html,/https:\/\/example.com\/a.md/);
  assert.match(result.html,/a\^2\+b\^2=c\^2/);
  assert.match(result.html,/x &lt; y/);
  assert.doesNotMatch(result.html,/rust-playground/);
});

test('index route is an explicit compatibility alias and malformed Book JSON fails', () => {
  const intro = chapter('Introduction','index.md');
  const result = transformBook({ sections:[{Chapter:intro}] },new Map([['index.html',html('<h1 id="intro">Introduction</h1>')]]));
  assert.equal(result.pages[0].slug,'introduction.html');
  assert.equal(result.pages[0].source,'index.md');
  assert.throws(()=>parseMdBookExport({version:'0.4.52',book:{sections:[{Chapter:{name:'bad'}}]}}),/Chapter.content/);
  assert.throws(()=>transformBook({sections:[{Chapter:intro}]},new Map()),/Missing mdBook HTML/);
});

test('Windows line endings cannot leak into pre-rendered MathML while chapter identity stays intact',()=>{
  const original=chapter('Math','math.md');original.content='$$\r\nx\r\n=\r\ny\r\n$$\r\n';
  const normalized=normalizeBookLineEndings({sections:[{Chapter:original}]});
  const item=normalized.sections[0];assert.ok(typeof item==='object'&&'Chapter'in item);
  assert.equal(item.Chapter.content,'$$\nx\n=\ny\n$$\n');
  assert.equal(item.Chapter.source_path,original.source_path);
  assert.ok(original.content.includes('\r\n'),'input stays recoverable and untouched');
});

test('TeX annotation escapes survive Markdown without changing rendered math or source code',()=>{
  const original=chapter('Math','math.md');
  const tex=String.raw`P\{y/x\} \mathrel{\#} Q \swarrow^{*} A_B`;
  original.content=`<span class="katex"><math><mi>P</mi></math><annotation encoding="application/x-tex">${tex}</annotation></span>\n\n\`\`\`rust\nlet slash = "\\\\";\n\`\`\``;
  const protectedBook=protectMathAnnotations({sections:[{Chapter:original}]});
  const item=protectedBook.sections[0];assert.ok(typeof item==='object'&&'Chapter'in item);
  const {document}=parseHTML('<html><body>'+item.Chapter.content+'</body></html>');
  assert.equal(document.querySelector('annotation')?.textContent,tex);
  assert.match(item.Chapter.content,/<math><mi>P<\/mi><\/math>/);
  assert.ok(item.Chapter.content.endsWith('```rust\nlet slash = "\\\\";\n```'));
  assert.ok(original.content.includes(tex),'input remains untouched');
});
