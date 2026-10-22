import fs from 'node:fs/promises';
import path from 'node:path';
import {uiRows} from '../ui-translations.js';
import {englishUI} from '../ui-english.js';
const wording={
 en:['Build with|meaning.','Two worlds. One book.'],
 zh:['以意义|构建程序。','两个世界，同一本书。'],
 'zh-hant':['以意義|構建程式。','兩個世界，同一本書。'],
 ja:['意味から、|つくる。','二つの世界で、一冊の本を。'],
 ko:['의미에서|시작하세요.','두 가지 세계, 한 권의 책.'],
 vi:['Xây dựng từ|ý nghĩa.','Hai thế giới. Một cuốn sách.'],
 de:['Mit Bedeutung|entwickeln.','Zwei Welten. Ein Buch.'],
 es:['Crea con|significado.','Dos mundos. Un libro.'],
 ru:['Создавайте|со смыслом.','Два мира. Одна книга.'],
 uk:['Створюйте|зі змістом.','Два світи. Одна книга.'],
 ar:['ابدأ بالمعنى،|ثم ابنِ.','عالمان. كتاب واحد.']
};
export async function shareCardMarkup(code,origin='http://127.0.0.1:4173'){
 const columns={en:0,zh:1,ko:2,ja:3,ar:4};let ui={};
 if(code==='zh-hant'||['vi','de','es','ru','uk'].includes(code))ui=JSON.parse(await fs.readFile(path.resolve(import.meta.dirname,'../locales/ui-'+code+'.json'),'utf8'));
 const t=text=>code==='en'?englishUI(text):ui[text]||uiRows.find(row=>row[0]===text)?.[columns[code]]||text;
 const [title,caption]=wording[code];const headingSize=['zh','zh-hant','ja','ko','ar'].includes(code)?70:['ru','uk','de','vi'].includes(code)?72:82;
 return `<!doctype html><html lang="${code}" dir="ltr"><head><meta charset="utf-8"><style>
 @font-face{font-family:Book;src:url('${origin}/node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2');font-weight:600}*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#101a17;color:#eee6d4;font-family:Book,Georgia,serif}.card{position:relative;height:630px;isolation:isolate;background:#101a17}.paper{position:absolute;inset:0;background:linear-gradient(90deg,#0a1717f2 0%,#0a1717d9 38%,#0b17204d 75%),url('${origin}/art/forest-gateway.webp') center/cover;opacity:1;z-index:-1}.copy{position:absolute;left:76px;top:63px;z-index:1;width:570px}.brand{display:flex;align-items:center;gap:19px;font-size:27px;letter-spacing:7px}.brand small{display:block;font:11px Arial,sans-serif;letter-spacing:2px;margin-top:4px}.brand img{width:60px;height:60px;object-fit:contain}.rule{width:65px;height:1px;background:#c8a466;margin:37px 0 20px}h1{font-size:${headingSize}px;line-height:1.13;font-weight:600;margin:0 0 25px;letter-spacing:-1px}p{font:20px/1.55 Arial,'Microsoft YaHei',sans-serif;color:#bfcbbf;max-width:440px}.worlds{font-size:24px;display:flex;gap:24px;color:#e4c88f;align-items:center;margin-top:30px}.worlds span:last-child{color:#b5d8e8}.worlds b{width:1px;height:20px;background:#b5c0a566;font-weight:400}.wizard{position:absolute;width:390px;right:55px;bottom:8px}.wizard img{display:block;width:100%}.cjk h1{font-family:'SimSun','Yu Mincho',serif;font-weight:500;letter-spacing:1px}.arabic .copy{width:480px}.arabic .brand{justify-content:flex-end}.arabic h1,.arabic p{direction:rtl;text-align:right;font-family:'Traditional Arabic',Tahoma,serif}.arabic p{font-size:29px;max-width:none}.arabic .worlds{font-size:30px;justify-content:flex-end;direction:rtl}.arabic h1{font-size:82px}.cjk .worlds,.arabic .worlds{font-family:'SimSun','Traditional Arabic',serif}
 </style></head><body class="${['zh','zh-hant','ja','ko'].includes(code)?'cjk':code==='ar'?'arabic':''}"><main class="card"><div class="paper"></div><div class="copy"><div class="brand"><img src="${origin}/alux-white.png" alt=""><span>ALUX<small>PROGRAMMING</small></span></div><div class="rule"></div><h1>${title.replace('|','<br>')}</h1><p>${caption}</p><div class="worlds"><span>${t('Magic world')}</span><b></b><span>${t('Real world')}</span></div></div><div class="wizard"><img src="${origin}/art/wizard-standing.webp" alt=""></div></main></body></html>`;
}
