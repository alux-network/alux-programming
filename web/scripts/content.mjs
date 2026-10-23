import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';

const root=path.resolve(import.meta.dirname,'../..');
const src=path.join(root,'src');
const out=path.join(root,'web/public');
const summary=await fs.readFile(path.join(src,'SUMMARY.md'),'utf8');
const groups=[]; const pages=[]; let group=null;
// Shared by both readers and static fallbacks; retain the original mdBook assets in src/.
const readingArt={'assets/semantic-view.png':'/art/semantic-view.webp','assets/design-by-meaning-rust.png':'/art/capability-crab.webp','assets/concepts.png':'/art/concepts.webp','assets/insights.png':'/art/insights.webp'};
for(const line of summary.split(/\r?\n/)){
  if(/^# /.test(line)){group={title:line.slice(2),pages:[]};groups.push(group);}
  const m=line.match(/\[([^\]]+)\]\(([^)]+\.md)\)/);
  if(m){const page={title:m[1],source:m[2],group:group?.title??'Welcome',slug:m[2]==='index.md'?'introduction.html':m[2].replace(/\.md$/,'.html')};pages.push(page);group?.pages.push(page.slug);}
}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.toLowerCase().replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,'').replace(/[^\p{L}\p{N}_ -]/gu,'').trim().replace(/\s+/g,'-');
const errors=[];
for(const page of pages){
  const raw=await fs.readFile(path.join(src,page.source),'utf8');
  page.hash=createHash('sha256').update(raw).digest('hex');
  page.markdown=raw; page.headings=[]; const used=new Map();
  const fixHref=href=>{
    if(!href||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href))return href;
    const [file,anchor]=href.split('#');
    const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(page.source),file));
    if(readingArt[resolved])return readingArt[resolved];
    if(/\.md$/.test(file)){
      const dest=pages.find(x=>x.source===resolved);
      if(!dest)errors.push(`${page.source}: missing ${href}`);
      return '/'+(dest?.slug??resolved.replace(/\.md$/,'.html'))+(anchor?'#'+anchor:'');
    }
    return '/book-assets/'+resolved+(anchor?'#'+anchor:'');
  };
  const md=new Marked({gfm:true,breaks:false});
  md.use({extensions:[{
    name:'blockMath',level:'block',start:s=>s.indexOf('$$'),tokenizer(s){const m=s.match(/^\$\$\s*\n?([\s\S]+?)\n?\$\$(?:\n|$)/);if(m)return{type:'blockMath',raw:m[0],text:m[1]};},renderer(t){return '<div class="math-display">'+katex.renderToString(t.text,{displayMode:true,throwOnError:false,strict:false})+'</div>';}
  },{
    name:'inlineMath',level:'inline',start:s=>s.indexOf('$'),tokenizer(s){const m=s.match(/^\$(?!\s|\$)((?:[^$\n]|\\\$)+?)\$(?!\$)/);if(m)return{type:'inlineMath',raw:m[0],text:m[1]};},renderer(t){return katex.renderToString(t.text,{throwOnError:false,strict:false});}
  }],renderer:{
    heading(t){const text=this.parser.parseInline(t.tokens);let id=slug(text.replace(/<[^>]+>/g,''));const n=used.get(id)??0;used.set(id,n+1);if(n)id+='-'+n;page.headings.push({level:t.depth,id,text:text.replace(/<[^>]+>/g,'')});return `<h${t.depth} id="${id}">${text}<a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a></h${t.depth}>`;},
    link(t){return `<a href="${escape(fixHref(t.href))}"${/^https?:/.test(t.href)?' target="_blank" rel="noopener noreferrer"':''}>${this.parser.parseInline(t.tokens)}</a>`;},
    image(t){return `<img src="${escape(fixHref(t.href))}" alt="${escape(t.text)}" loading="lazy">`;},
    html(t){return t.text.replace(/\bsrc="(?!https?:|\/\/)([^"]+)"/g,(_,s)=>`src="${fixHref(s)}"`);},
    code(t){
      if(/^admonish\b/.test(t.lang??'')){
        const kind=t.lang.match(/^admonish\s+(\w+)/)?.[1]??'note';
        const title=t.lang.match(/title="([^"]+)"/)?.[1]??kind;
        return `<aside class="admonition ${escape(kind)}"><div class="admonition-title">${escape(title)}</div>${md.parse(t.text)}</aside>`;
      }
      const lang=(t.lang??'text').split(/[, ]/)[0];
      const code=hljs.getLanguage(lang)?hljs.highlight(t.text,{language:lang}).value:escape(t.text);
      const playground=lang==='rust'&&!/noplayground|ignore|compile_fail|no_run/.test(t.lang??'')?`<a class="rust-playground" href="https://play.rust-lang.org/?version=stable&amp;mode=debug&amp;edition=2021&amp;code=${encodeURIComponent(t.text)}" target="_blank" rel="noopener noreferrer">Rust Playground ↗</a>`:'';
      return `<div class="code-block"><div class="code-toolbar"><span>${escape(lang)}</span><div>${playground}<button class="copy-code" aria-label="Copy code">Copy code</button></div></div><pre><code class="language-${escape(lang)}">${code}</code></pre></div>`;
    }
  }});
  page.html=await md.parse(raw);
  page.text=raw.replace(/<[^>]+>/g,' ').replace(/[`#*_>\[\]]/g,'').replace(/\s+/g,' ').trim();
  page.minutes=Math.max(1,Math.ceil(page.text.split(/\s+/).length/220));
}
if(errors.length)throw new Error(errors.join('\n'));
await fs.mkdir(out,{recursive:true});
await fs.cp(path.join(src,'assets'),path.join(out,'book-assets/assets'),{recursive:true});
await fs.writeFile(path.join(out,'content.json'),JSON.stringify({groups,pages}));
await fs.mkdir(path.join(root,'output'),{recursive:true});
await fs.writeFile(path.join(root,'output/content-baseline.json'),JSON.stringify(pages.map(({source,hash,slug})=>({source,hash,slug})),null,2));
console.log(`Preserved ${pages.length} complete source pages in ${groups.length} sections. Rendered code, admonitions, math and original assets.`);
