import type {ReaderPage} from './book.ts';

interface SearchEntry {p:ReaderPage;title:string;text:string}
const indexes=new WeakMap<ReaderPage[],SearchEntry[]>();

/** A localized book is immutable for its lifetime; changing language supplies a new array. */
export function searchBook(pages:ReaderPage[],query:string):{p:ReaderPage;score:number;at:number}[]{
 let index=indexes.get(pages);
 if(!index){index=pages.map(p=>({p,title:p.title.toLowerCase(),text:p.text.toLowerCase()}));indexes.set(pages,index);}
 const terms=query.toLowerCase().trim().split(/\s+/);
 return index.filter(({title,text})=>terms.every(term=>text.includes(term)||title.includes(term)))
  .map(({p,title,text})=>({p,score:terms.reduce((n,term)=>n+(title.includes(term)?15:0)+(text.includes(term)?1:0),0),at:text.indexOf(terms[0]??'')}))
  .sort((a,b)=>b.score-a.score);
}
