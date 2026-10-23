import type {ReaderBook, TranslationDictionary} from './book.ts';
import {localizeBook} from './localization.ts';
import {uiRows} from './ui-translations.ts';
import {englishUI} from './ui-english.ts';
import traditionalUI from '../locales/ui-zh-hant.json';
import {languages,normalizeLanguage,pathLanguage,stripLanguage,languagePath,htmlLanguage} from './locale-routing.ts';
import type {LanguageCode} from './locale-routing.ts';
export {languages,stripLanguage};

const codes:LanguageCode[]=languages.map(x=>x.code),columns:Record<LanguageCode,number>={en:0,zh:1,ko:2,ja:3,ar:4,'zh-hant':5,vi:6,ru:7,uk:8,de:9,es:10};
const catalog=new Map(uiRows.map(row=>[row[0],row] as const));
const dictionaries=import.meta.glob<unknown>(['../locales/*.json','!../locales/manifest.json','!../locales/source.json'],{import:'default'});
let active:LanguageCode='en';
let translations:TranslationDictionary={};
let extraUI:Record<string,string>={};
const textSources=new WeakMap<Text,{source:string;last:string}>();
type TranslatableAttribute='aria-label'|'placeholder'|'alt'|'title';
type SourceRecord={source:string;last:string};
const translatableAttributes:TranslatableAttribute[]=['aria-label','placeholder','alt','title'];
const attributeSources=new WeakMap<Element,Partial<Record<TranslatableAttribute,SourceRecord>>>();
const get=(key:string,session=false):string|null=>{try{return(session?sessionStorage:localStorage).getItem(key)}catch{return null}};
const put=(key:string,value:string,session=false):void=>{try{(session?sessionStorage:localStorage).setItem(key,value)}catch{}};
export const language=()=>active;
export const rememberLanguage=()=>put('alux-programming-language',active);
const form=(n:string,words:Record<string,string>):string=>words[new Intl.PluralRules(active).select(Number(n))]||words.other;
export function t(text:string):string{
  const normalized=String(text).trim();const row=catalog.get(normalized);if(row)return active==='en'?englishUI(normalized):active==='zh-hant'?(traditionalUI as Record<string,string>)[normalized]||normalized:['vi','ru','uk','de','es'].includes(active)?(extraUI[normalized]||normalized):row[columns[active]]||normalized;
  const minutes=normalized.match(/^(\d+) (?:min|minute read)$/);if(minutes)return [minutes[1]+' min',minutes[1]+' 分钟',minutes[1]+'분',minutes[1]+'分',minutes[1]+' دقائق',minutes[1]+' 分鐘',minutes[1]+' phút',minutes[1]+' мин',minutes[1]+' хв',minutes[1]+' Min.',minutes[1]+' min'][columns[active]];
  const results=normalized.match(/^(\d+) RESULTS?$/);if(results){const n=results[1];const labels={en:n+' '+(n==='1'?'RESULT':'RESULTS'),zh:n+' 条结果','zh-hant':n+' 條結果',ko:n+'개 결과',ja:n+'件',vi:n+' kết quả',de:n+' '+form(n,{one:'Ergebnis',other:'Ergebnisse'}),es:n+' '+form(n,{one:'resultado',other:'resultados'}),ru:n+' '+form(n,{one:'результат',few:'результата',many:'результатов',other:'результата'}),uk:n+' '+form(n,{one:'результат',few:'результати',many:'результатів',other:'результату'}),ar:form(n,{zero:n+' نتيجة',one:'نتيجة واحدة',two:'نتيجتان',few:n+' نتائج',many:n+' نتيجة',other:n+' نتيجة'})};return labels[active];}
  const part=normalized.match(/^(?:PART|Part|Begin Part) ([IVX]+)$/);if(part)return [(normalized.startsWith('Begin')?'Begin Part ':'Part ')+part[1],'第 '+part[1]+' 部',part[1]+'부',part[1]+'部','الجزء '+part[1],'第 '+part[1]+' 部','Phần '+part[1],'Часть '+part[1],'Частина '+part[1],'Teil '+part[1],'Parte '+part[1]][columns[active]];
  const count=normalized.match(/^(\d+) CHAPTERS TO EXPLORE$/);if(count)return [count[0],count[1]+' 个章节',count[1]+'개 장',count[1]+'章',count[1]+' فصول',count[1]+' 個章節',count[1]+' chương',count[1]+' глав',count[1]+' розділів',count[1]+' Kapitel',count[1]+' capítulos'][columns[active]];
  const size=normalized.match(/^Reading size (\d+) pixels$/);if(size)return [size[0],'字号为 '+size[1]+' 像素','글자 크기 '+size[1]+'픽셀','文字サイズ '+size[1]+'ピクセル','حجم النص '+size[1]+' بكسل','字級為 '+size[1]+' 像素','Cỡ chữ '+size[1]+' pixel','Размер текста: '+size[1]+' пикс.','Розмір тексту: '+size[1]+' пікс.','Schriftgröße: '+size[1]+' Pixel','Tamaño del texto: '+size[1]+' píxeles'][columns[active]];
  const explore=normalized.match(/^Explore (.+)$/);if(explore)return ['Explore '+explore[1],'探索 '+explore[1],explore[1]+' 탐색',explore[1]+'を探る','استكشف '+explore[1],'探索 '+explore[1],'Khám phá '+explore[1],'Изучить '+explore[1],'Дослідити '+explore[1],explore[1]+' erkunden','Explorar '+explore[1]][columns[active]];
  return active==='en'?englishUI(text):text;
}
export function languagePicker():string{return `<label class="language-picker"><span class="visually-hidden">${t('Language')}</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg><select data-language aria-label="${t('Language')}">${languages.map(l=>`<option value="${l.code}" ${l.code===active?'selected':''}>${l.name}</option>`).join('')}</select></label>`;}
export function languageURL(href:string):string{const url=new URL(href,location.origin);if(url.origin!==location.origin)return href;url.pathname=languagePath(url.pathname,active);url.searchParams.delete('lang');return url.pathname+url.search+url.hash;}
export function countryLanguage(country:string):LanguageCode{if(country==='CN')return'zh';if(['TW','HK','MO'].includes(country))return'zh-hant';if(['DE','AT','LI'].includes(country))return'de';if(['ES','MX','AR','CL','CO','PE','VE','EC','BO','PY','UY','CR','PA','GT','HN','SV','NI','DO','CU','GQ'].includes(country))return'es';if(country==='VN')return'vi';if(country==='RU')return'ru';if(country==='UA')return'uk';if(country==='JP')return'ja';if(['KR','KP'].includes(country))return'ko';if(['AE','SA','EG','IQ','JO','KW','QA','BH','OM','YE','LB','SY','PS','DZ','MA','TN','LY','SD','SO','MR','DJ','KM'].includes(country))return'ar';return'en';}
export async function resolveLanguage(){
  const explicit=pathLanguage(location.pathname)||normalizeLanguage(new URL(location.href).searchParams.get('lang'));if(explicit)return explicit;
  const saved=normalizeLanguage(get('alux-programming-language'));if(saved)return saved;
  const cached=normalizeLanguage(get('alux-programming-ip-language',true));if(cached)return cached;
  try{const r=await fetch('https://get.geojs.io/v1/ip/country.json',{signal:AbortSignal.timeout(1800),credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('Country unavailable');const {country}=await r.json();const result=countryLanguage(String(country).toUpperCase());put('alux-programming-ip-language',result,true);return result;}catch{return'en'}
}
export async function setLanguage(next:LanguageCode,manual=false):Promise<void>{
  if(!codes.includes(next))throw Error('Unsupported language');
  if(next!=='en'){
    const load=dictionaries[`../locales/${next}.json`];if(!load)throw Error('Translation unavailable');
    const uiLoad=dictionaries[`../locales/ui-${next}.json`];
    const [loadedDictionary,loadedUI]=await Promise.all([load(),['vi','ru','uk','de','es'].includes(next)&&uiLoad?uiLoad():Promise.resolve({})]);
    const dict=loadedDictionary as TranslationDictionary;
    extraUI=loadedUI as Record<string,string>;
    translations=dict;
  }else{translations={};}
  active=next;document.documentElement.lang=htmlLanguage(next);document.documentElement.dir=next==='ar'?'rtl':'ltr';document.documentElement.dataset.locale=next;
  if(manual)put('alux-programming-language',next);
}
export function localizedBook(original:ReaderBook):ReaderBook{
  if(active!=='en'&&!original.translationManifest)throw Error('Reader content has no generated translation manifest');
  return localizeBook(original,active==='en'?undefined:translations,original.translationManifest||{},t,document);
}
export function translateUI(root:Document|HTMLElement=document):void{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes:Node[]=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const rawNode of nodes){const node=rawNode as Text;if(node.parentElement?.closest('script,style,pre,code,.katex,option,[data-language]'))continue;let entry=textSources.get(node);if(!entry||node.textContent!==entry.last){const sourceText=node.textContent??'';entry={source:sourceText,last:sourceText};}const source=entry.source.trim();const translated=t(source);node.textContent=entry.source.replace(source,translated);entry.last=node.textContent;textSources.set(node,entry);}
  root.querySelectorAll('[aria-label],[placeholder],[alt],[title]').forEach(el=>{const entries=attributeSources.get(el)??{};for(const attr of translatableAttributes){const value=el.getAttribute(attr);if(value){if(!entries[attr]||value!==entries[attr]?.last)entries[attr]={source:value,last:value};const entry=entries[attr];if(entry){const translated=t(entry.source);el.setAttribute(attr,translated);entry.last=translated;}}}attributeSources.set(el,entries);});
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a=>{const href=a.getAttribute('href');if(href&&!href.startsWith('#')&&!a.target&&!a.hasAttribute('download')&&new URL(href,location.origin).origin===location.origin)a.setAttribute('href',languageURL(href));});
}
