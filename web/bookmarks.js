const key='alux-bookmarks-v1';
export function bookmarks(){try{const value=localStorage.getItem(key);if(value!==null){const list=JSON.parse(value);return Array.isArray(list)?list.filter(x=>x&&typeof x.slug==='string'):[];}const old=localStorage.getItem('alux-bookmark');const list=old?[{slug:old,realm:'magic',anchor:'',updatedAt:Date.now()}]:[];localStorage.setItem(key,JSON.stringify(list));return list;}catch{return[];}}
export const hasBookmark=slug=>bookmarks().some(item=>item.slug===slug);
function save(list){try{localStorage.setItem(key,JSON.stringify(list));}catch{}dispatchEvent(new Event('alux-bookmarks-changed'));}
export function toggleBookmark(entry){const list=bookmarks();const exists=list.some(item=>item.slug===entry.slug);save(exists?list.filter(item=>item.slug!==entry.slug):[{...entry,updatedAt:Date.now()},...list]);return !exists;}
export function removeBookmark(slug){save(bookmarks().filter(item=>item.slug!==slug));}

addEventListener('storage',event=>{if(event.key===key)dispatchEvent(new Event('alux-bookmarks-changed'));});
