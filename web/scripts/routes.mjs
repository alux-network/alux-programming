import fs from 'node:fs/promises';
import path from 'node:path';
import {parseHTML} from 'linkedom';
import {languages,languagePath,htmlLanguage} from '../locale-routing.js';
import {siteDescriptions,socialLocales} from '../site-meta.js';
import {uiRows} from '../ui-translations.js';
import {gatewayMarkup} from '../worlds.js';
import {englishUI} from '../ui-english.js';
import {contentsMarkup} from '../contents.js';
const siteOrigin=(process.env.ALUX_SITE_URL||'http://127.0.0.1:4174').replace(/\/$/,'');
const dir=path.resolve(import.meta.dirname,'../dist');
const {pages,groups}=JSON.parse(await fs.readFile(path.join(dir,'content.json'),'utf8'));
const template=await fs.readFile(path.join(dir,'index.html'),'utf8');
const locales=path.resolve(import.meta.dirname,'../locales');
const manifest=JSON.parse(await fs.readFile(path.join(locales,'manifest.json'),'utf8'));
const hantUI=JSON.parse(await fs.readFile(path.join(locales,'ui-zh-hant.json'),'utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const columns={en:0,zh:1,ko:2,ja:3,ar:4};
const known=new Set(pages.map(p=>p.slug));
const extras=[['atlas.html','The chapter atlas'],['contents.html','Table of contents'],['parts/the-semantic-view.html','The Semantic View'],['parts/design-by-meaning-in-rust.html','Design by Meaning in Rust'],['parts/concepts.html','Concepts'],['parts/insights.html','Insights']];
for(const {code} of languages){
 const dict=code==='en'?null:JSON.parse(await fs.readFile(path.join(locales,code+'.json'),'utf8'));
 const extraUI=['vi','ru','uk','de','es'].includes(code)?JSON.parse(await fs.readFile(path.join(locales,'ui-'+code+'.json'),'utf8')):{};
 const t=text=>code==='en'?englishUI(text):['vi','ru','uk','de','es'].includes(code)?(extraUI[text]||text):code==='zh-hant'?(hantUI[text]||text):(uiRows.find(row=>row[0]===text)?.[columns[code]]||text);
 const localPages=pages.map(p=>{if(!dict)return {...p,title:englishUI(p.title)};const {document}=parseHTML('<html><body><article>'+p.html+'</article></body></html>');const root=document.querySelector('article'),used=new Set();
  for(const unit of manifest[p.slug].units){const canonical=document.createElement('div');canonical.innerHTML=unit.source;const target=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,.admonition-title,summary,figcaption')].find(el=>!used.has(el)&&el.innerHTML===canonical.innerHTML);if(!target)throw Error('Static translation cannot match '+unit.key);used.add(target);target.innerHTML=escape(dict[unit.key]).replace(/⟦(\d+)⟧/g,(_,n)=>unit.tokens[Number(n)]);}
  return{...p,title:dict[manifest[p.slug].titleKey],html:root.innerHTML,text:root.textContent};
 });
 async function write(route,title,description,body='',realm='magic'){
  const {document}=parseHTML(template);document.documentElement.lang=htmlLanguage(code);document.documentElement.dir=code==='ar'?'rtl':'ltr';document.title=title+' · ALUX Programming';document.querySelector('meta[name=description]').content=description;
  const canonicalURL=siteOrigin+languagePath('/'+route.replace(/index\.html$/,''),code);
  const shareTitle=(route==='introduction.html'||route==='real/introduction.html'?t('Introduction'):title)+' · ALUX Programming';document.title=shareTitle;
  const values={'og:title':shareTitle,'og:description':siteDescriptions[code],'og:type':'website','og:site_name':'ALUX Programming','og:locale':socialLocales[code],'og:url':canonicalURL,'og:image':siteOrigin+'/social/alux-programming-'+code+'.jpg','og:image:width':'1200','og:image:height':'630','og:image:alt':'ALUX Programming','twitter:card':'summary_large_image','twitter:title':shareTitle,'twitter:description':siteDescriptions[code],'twitter:image':siteOrigin+'/social/alux-programming-'+code+'.jpg','twitter:image:alt':'ALUX Programming'};
  for(const [name,value]of Object.entries(values)){const meta=document.createElement('meta');meta.setAttribute(name.startsWith('og:')?'property':'name',name);meta.content=value;document.head.append(meta);}const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=canonicalURL;document.head.append(canonical);
  if(realm==='real')document.body.className='reality-view real-theme-light';
  if(body){const no=document.createElement('noscript');no.innerHTML=realm==='gateway'?body:`<main class="no-script-page ${realm==='real'?'real-prose':'prose'}"><nav><a href="/">${t('Choose world')}</a> · <a href="/${realm==='real'?'real/':''}introduction.html">${t('Introduction')}</a></nav>${body}</main>`;
   no.querySelectorAll('h1 img').forEach(e=>e.remove());
   if(no.querySelector('#alux-programming-guidelines'))no.querySelector('.admonition.warning')?.remove();
   no.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href');if(!href.startsWith('/')||href.startsWith('//'))return;let [slug,hash]=href.slice(1).split('#');if(realm==='real'&&known.has(slug))slug='real/'+slug;a.setAttribute('href',languagePath('/'+slug,code)+(hash?'#'+hash:''));});
   no.querySelectorAll('.copy-code').forEach(el=>el.remove());
   for(const el of no.querySelectorAll('*')){for(const node of el.childNodes)if(node.nodeType===3&&!el.closest('pre,code,.katex')){const original=node.textContent.trim();if(original)node.textContent=node.textContent.replace(original,t(original));}for(const name of ['alt','aria-label','title'])if(el.hasAttribute(name))el.setAttribute(name,t(el.getAttribute(name)));}document.body.append(no);
  }
  for(const {code:other} of languages){const alternate=document.createElement('link');alternate.rel='alternate';alternate.hreflang=htmlLanguage(other);alternate.href=siteOrigin+languagePath('/'+route.replace(/index\.html$/,''),other);document.head.append(alternate);}
  const destination=path.join(dir,languagePath('/'+route,code));await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,document.toString());
 }
 for(const p of localPages){await write(p.slug,p.title,p.text.slice(0,175),p.html);await write('real/'+p.slug,p.title,p.text.slice(0,175),p.html,'real');}
 const contentsGroups=groups.map(group=>({...group,title:t(group.title)}));
 const contentsBody=real=>contentsMarkup({groups:contentsGroups,pages:localPages,icon:()=>'',real}).replace(/^<main[^>]*>/,'').replace(/<\/main>$/,'');
 for(const [route,title] of extras)await write(route,t(title),t(title),route==='contents.html'?contentsBody(false):'');
 await write('real/contents.html',t('Table of contents'),t('Table of contents'),contentsBody(true),'real');
 await write('magic.html',localPages[0].title,localPages[0].text.slice(0,175),localPages[0].html);
 await write('real/index.html',localPages[0].title,localPages[0].text.slice(0,175),localPages[0].html,'real');
 await write('index.html',t('Choose your world'),t('ALUX Programming'),gatewayMarkup({t}),'gateway');
 await write('404.html',t('This page is uncharted.'),t('Find your way back to the book.'));
}
console.log(`Generated ${languages.length} language routes for ${pages.length} chapters in both worlds, chooser and legacy aliases.`);
