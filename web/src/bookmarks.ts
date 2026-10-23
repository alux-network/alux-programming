export interface BookmarkEntry { slug: string; realm: 'magic' | 'real'; anchor: string; folio?: number; scroll?: number; updatedAt?: number; title?: string }
const key='alux-bookmarks-v1';
export function bookmarks(): BookmarkEntry[]{try{const value=localStorage.getItem(key);if(value!==null){const list:unknown=JSON.parse(value);return Array.isArray(list)?list.filter((x):x is BookmarkEntry=>typeof x==='object'&&x!==null&&'slug'in x&&typeof x.slug==='string'):[];}const old=localStorage.getItem('alux-bookmark');const list:BookmarkEntry[]=old?[{slug:old,realm:'magic',anchor:'',updatedAt:Date.now()}]:[];localStorage.setItem(key,JSON.stringify(list));return list;}catch{return[];}}
export const hasBookmark=(slug:string):boolean=>bookmarks().some(item=>item.slug===slug);
function save(list:BookmarkEntry[]):void{try{localStorage.setItem(key,JSON.stringify(list));}catch{}dispatchEvent(new Event('alux-bookmarks-changed'));}
export function toggleBookmark(entry:BookmarkEntry):boolean{const list=bookmarks();const exists=list.some(item=>item.slug===entry.slug);save(exists?list.filter(item=>item.slug!==entry.slug):[{...entry,updatedAt:Date.now()},...list]);return !exists;}
export function removeBookmark(slug:string):void{save(bookmarks().filter(item=>item.slug!==slug));}

addEventListener('storage',event=>{if(event.key===key)dispatchEvent(new Event('alux-bookmarks-changed'));});
