import fs from 'node:fs/promises';
import path from 'node:path';
const dir=path.resolve(import.meta.dirname,'../dist');
const {pages}=JSON.parse(await fs.readFile(path.join(dir,'content.json'),'utf8'));
const template=await fs.readFile(path.join(dir,'index.html'),'utf8');
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const extras=[['atlas.html','The chapter atlas'],['contents.html','Table of contents'],['parts/the-semantic-view.html','The Semantic View'],['parts/design-by-meaning-in-rust.html','Design by Meaning in Rust'],['parts/concepts.html','Concepts'],['parts/insights.html','Insights']];
async function write(route,title,description,body=''){
  body=body.replace(/(<h1\b[^>]*>)\s*<img\b(?=[^>]*alux-logo)[^>]*>/g,'$1');
  let html=template.replace('<title>ALUX Programming · Build with meaning</title>',`<title>${escape(title)} · ALUX Programming</title>`);
  html=html.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${escape(description)}">`);
  if(body)html=html.replace('</body>',`<noscript><main class="no-script-page prose"><nav><a href="/">ALUX Programming</a> · <a href="/introduction.html">Introduction</a> · <a href="/about.html">About</a></nav>${body}</main></noscript></body>`);
  const dest=path.join(dir,route);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,html);
}
for(const [route,title]of extras)await write(route,title,`${title}. Explore the ALUX programming book, original chapters and meaning-first design.`);
for(const page of pages)await write(page.slug,page.title,page.text.slice(0,175),page.html);
const staticContents=`<h2>Chapters</h2><ol>${pages.map(p=>`<li><a href="/${p.slug}">${escape(p.title)}</a></li>`).join('')}</ol>`;
await write('index.html','Build with meaning','The ALUX programming book. Meaning-first design, compositionality and Rust.',pages[0].html+staticContents);
await write('404.html','This page is uncharted','Find your way back to the ALUX programming book.');
console.log(`Generated ${pages.length} original chapter routes with readable no-JavaScript fallbacks, ${extras.length} product routes and a 404 page.`);
