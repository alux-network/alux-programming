export const languages=[{code:'en',name:'English'},{code:'zh',name:'简体中文'},{code:'zh-hant',name:'繁體中文'},{code:'ja',name:'日本語'},{code:'ko',name:'한국어'},{code:'vi',name:'Tiếng Việt'},{code:'de',name:'Deutsch'},{code:'es',name:'Español'},{code:'ru',name:'Русский'},{code:'uk',name:'Українська'},{code:'ar',name:'العربية'}] as const;
export type LanguageCode=(typeof languages)[number]['code'];
export function normalizeLanguage(value:unknown):LanguageCode|null{
  const code=String(value||'').toLowerCase().replaceAll('_','-');
  if(['zh-hans','zh-cn','zh-sg'].includes(code))return'zh';
  if(['zh-tw','zh-hk','zh-mo'].includes(code))return'zh-hant';
  return languages.some(language=>language.code===code)?code as LanguageCode:null;
}
export function pathLanguage(pathname:string):LanguageCode|null{return normalizeLanguage(pathname.split('/').filter(Boolean)[0]);}
export function stripLanguage(pathname:string):string{const pieces=pathname.split('/').filter(Boolean);if(normalizeLanguage(pieces[0]))pieces.shift();return'/'+pieces.join('/')+(pathname.endsWith('/')&&pieces.length?'/':'');}
export function languagePath(pathname:string,language:LanguageCode):string{const path=stripLanguage(pathname);return language==='en'?path:'/'+language+(path==='/'?'/':path);}
export const htmlLanguage=(code:LanguageCode):string=>code==='zh'?'zh-Hans':code==='zh-hant'?'zh-Hant':code;
