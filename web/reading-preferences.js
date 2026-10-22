import {language} from './i18n.js';

export function readingSize(scale=0){
  const locale=language();
  const base=locale==='ar'?26:['zh','zh-hant','ja','ko'].includes(locale)?22:24;
  return base+scale;
}
export function readingScale(storage){
  const value=Number(storage.get('alux-reading-scale')||0);
  return Number.isFinite(value)?Math.max(-4,Math.min(4,value)):0;
}
export function applyReadingSize(size){
  for(const name of ['--reading-size','--real-size','--sidebar-size'])document.body.style.setProperty(name,size+'px');
  document.documentElement.style.setProperty('--reading-size',size+'px');
  document.body.style.setProperty('--reader-ui-size',Math.max(18,size-2)+'px');
}
