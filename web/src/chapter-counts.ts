import type {ReaderPage} from './book.ts';
const counts=new WeakMap<ReaderPage[],Map<string,Map<string,number>>>();
/** Counts are learned only from chapters the reader actually opened, never from prefetch measurements. */
export function recordChapterCount(pages:ReaderPage[],layout:string,page:ReaderPage,count:number):{offset:number;total:number}|null{
 if(!pages.includes(page)||!Number.isInteger(count)||count<1)throw Error('Invalid visited chapter count');
 let layouts=counts.get(pages);if(!layouts){layouts=new Map();counts.set(pages,layouts);}
 let visited=layouts.get(layout);if(!visited){visited=new Map();layouts.set(layout,visited);if(layouts.size>8)layouts.delete(layouts.keys().next().value!);}
 visited.set(page.id,count);
 const known=pages.map(chapter=>visited!.get(chapter.id));if(known.some(value=>value===undefined))return null;
 return {offset:known.slice(0,pages.indexOf(page)).reduce<number>((sum,value)=>sum+value!,0),total:known.reduce<number>((sum,value)=>sum+value!,0)};
}
export function invalidateChapterCounts(pages:ReaderPage[]):void{counts.delete(pages);}
