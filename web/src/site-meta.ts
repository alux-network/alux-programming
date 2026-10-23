export const siteTitles={en:'ALUX Programming',zh:'ALUX 编程指南','zh-hant':'ALUX 程式設計指南',ja:'ALUX プログラミングガイド',ko:'ALUX 프로그래밍 가이드',vi:'Hướng dẫn lập trình ALUX',de:'ALUX-Programmierleitfaden',es:'Guía de programación de ALUX',ru:'Руководство по программированию ALUX',uk:'Посібник із програмування ALUX',ar:'دليل البرمجة في ALUX'};
export const siteDescriptions={
 en:'Define what programs mean before choosing how they run. Denotational design, composition, laws and interpreters, with Rust examples.',
 zh:'先定义程序的含义，再选择执行方式。通过 Rust 示例理解指称设计、组合性、定律与解释器。',
 'zh-hant':'先定義程式的含義，再選擇執行方式。透過 Rust 範例理解指稱設計、組合性、定律與解釋器。',
 ja:'プログラムの意味を定めてから、実行方法を選ぶ。Rust の例を通じて、指示的設計、合成性、法則、インタープリターを学ぶ本です。',
 ko:'프로그램의 의미를 먼저 정의한 뒤 실행 방법을 선택합니다. Rust 예제로 지시적 설계, 합성성, 법칙, 해석기를 설명합니다.',
 vi:'Xác định ý nghĩa của chương trình trước khi chọn cách thực thi. Tìm hiểu thiết kế theo ngữ nghĩa biểu thị, phép hợp thành, các luật và bộ thông dịch qua ví dụ Rust.',
 de:'Zuerst die Bedeutung eines Programms festlegen, dann seine Ausführung wählen. Denotationeller Entwurf, Komposition, Gesetze und Interpreter anhand von Rust-Beispielen.',
 es:'Define primero el significado de un programa y después cómo ejecutarlo. Diseño denotacional, composición, leyes e intérpretes con ejemplos en Rust.',
 ru:'Сначала определите смысл программы, затем выберите способ выполнения. Денотационное проектирование, композиция, законы и интерпретаторы на примерах Rust.',
 uk:'Спочатку визначте зміст програми, потім оберіть спосіб виконання. Денотаційне проєктування, композиція, закони та інтерпретатори на прикладах Rust.',
 ar:'حدّد معنى البرنامج أولًا، ثم اختر طريقة تنفيذه. تعرّف إلى التصميم الدلالي والتركيب والقوانين والمفسرات من خلال أمثلة بلغة Rust.'
};
export const socialLocales={en:'en_US',zh:'zh_CN','zh-hant':'zh_TW',ja:'ja_JP',ko:'ko_KR',ar:'ar_AR',vi:'vi_VN',ru:'ru_RU',uk:'uk_UA',de:'de_DE',es:'es_ES'};
import type {LanguageCode} from './locale-routing.ts';
/** Browser/app/site identity has Chinese and English treatments; prose stays localized. */
export function siteBrandName(code:LanguageCode):string {
 return code==='zh'?'ALUX 编程':code==='zh-hant'?'ALUX 程式設計':'ALUX Programming';
}
export function brandedPageTitle(title:string,code:LanguageCode):string {
 let chapter=title.trim();
 for(const name of new Set([...Object.values(siteTitles),'ALUX 编程','ALUX 程式設計'])){
  if(chapter===name)return siteBrandName(code);
  if(chapter.endsWith(' · '+name)){chapter=chapter.slice(0,-name.length-3);break;}
 }
 return chapter?chapter+' · '+siteBrandName(code):siteBrandName(code);
}
export function updateSiteMeta(code:LanguageCode):void{
 const entry=/^\/(?:en\/|zh\/|zh-hant\/|ja\/|ko\/|vi\/|de\/|es\/|ru\/|uk\/|ar\/)?$/.test(location.pathname);
 document.title=entry?siteBrandName(code):brandedPageTitle(document.title,code);
 const title=entry?(siteTitles[code]||siteTitles.en):document.title,description=siteDescriptions[code]||siteDescriptions.en;
 const values={'application-name':siteBrandName(code),'apple-mobile-web-app-title':siteBrandName(code),'description':description,'og:title':title,'og:description':description,'og:type':'website','og:site_name':siteBrandName(code),'og:locale':socialLocales[code]||'en_US','og:url':location.origin+location.pathname,'og:image':location.origin+'/social/alux-programming-'+code+'.jpg','og:image:width':'1200','og:image:height':'630','og:image:alt':siteTitles[code],'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':location.origin+'/social/alux-programming-'+code+'.jpg','twitter:image:alt':siteTitles[code]};
  for(const [key,value]of Object.entries(values)){const attr=key.startsWith('og:')?'property':'name';let meta=document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);if(!meta){meta=document.createElement('meta');meta.setAttribute(attr,key);document.head.append(meta);}meta.content=value;}
  let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href=location.origin+location.pathname;
}
