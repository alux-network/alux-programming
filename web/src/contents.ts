export const partRoutes=['parts/the-semantic-view.html','parts/design-by-meaning-in-rust.html','parts/concepts.html','parts/insights.html'];
const roman=['I','II','III','IV','V'];
const descriptions=[
  'Begin with the meaning of a program. Explore denotations, compositionality, laws, interpretations, and the role of dependent types.',
  'Carry meaning-first design into Rust: capability algebras, semantic types, derived operations, interpreters, evidence, and language pipelines.',
  'Explore execution models and useful machinery: operational semantics, the expression problem, free monads, continuations, and branching.',
  'Connect the machinery back to meaning. Revisit semantics, the expression problem, referential transparency, and the EVM.'
];
export function contentsMarkup({groups,pages,icon,real=false}:{groups:BookGroup[];pages:ReaderPage[];icon:Icon;real?:boolean}):string{
  const prefix=real?'/real/':'/';
  return `<main id="main" class="contents-main"><header class="contents-heading"><h1>Table of contents</h1><a class="contents-introduction" href="${prefix}introduction.html">Read the introduction ${icon('arrow-right')}</a></header><div class="contents-spread">${groups.map((g,i)=>`<section class="contents-part"><header><span class="contents-roman">${roman[i]}</span><h2>${g.title}</h2></header><ol>${g.pages.map((slug,j)=>{const p=pages.find(p=>p.slug===slug);if(!p)throw new Error('Missing contents chapter: '+slug);return `<li><a href="${prefix}${slug}"><span>${String(j+1).padStart(2,'0')}</span><strong>${p.title}</strong>${icon('arrow-up-right')}</a></li>`}).join('')}</ol></section>`).join('')}</div></main>`;
}
export function partMarkup({index,groups,pages,icon}:{index:number;groups:BookGroup[];pages:ReaderPage[];icon:Icon}):string{
  const g=groups[index];
  return `<main id="main" class="part-main"><div class="part-breadcrumb"><a href="/contents.html">Table of contents</a>${icon('chevron-right')}<span>Part ${roman[index]}</span></div><section class="part-opening"><div class="part-frontispiece"><span class="part-front-number">${roman[index]}</span><div class="section-label">PART ${roman[index]}</div><h1>${g.title}</h1><p>${descriptions[index]}</p><img src="/art/world-${index}.webp" alt="" width="543" height="724"><a class="button primary" data-open-book href="/${g.pages[0]}">Begin Part ${roman[index]} ${icon('arrow-right')}</a></div><div class="part-chapters"><div class="section-label"><span></span>${g.pages.length} CHAPTERS TO EXPLORE</div>${g.pages.map((slug,j)=>{const p=pages.find(p=>p.slug===slug);if(!p)throw new Error('Missing part chapter: '+slug);return `<a href="/${slug}" class="part-chapter"><span>${String(j+1).padStart(2,'0')}</span><div><h2>${p.title}</h2><p>${p.minutes} minute read</p></div>${icon('arrow-right')}</a>`}).join('')}<nav class="part-pagination">${index>0?`<a href="/${partRoutes[index-1]}">${icon('arrow-left')} Part ${roman[index-1]}</a>`:'<span></span>'}${index<3?`<a href="/${partRoutes[index+1]}">Part ${roman[index+1]} ${icon('arrow-right')}</a>`:'<a href="/about.html">About the book '+icon('arrow-right')+'</a>'}</nav></div></section></main>`;
}
import type {BookGroup, Icon, ReaderPage} from './book.ts';
