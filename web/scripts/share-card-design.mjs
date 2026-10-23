import {htmlLanguage} from '../locale-routing.js';
export const shareCopy={
 en:['Programming','Design programs|by meaning.','Denotational design · Composition · Rust'],
 zh:['编程指南','先定义含义，|再设计程序。','指称设计 · 组合性 · Rust'],
 'zh-hant':['程式設計指南','先定義含義，|再設計程式。','指稱設計 · 組合性 · Rust'],
 ja:['プログラミングガイド','意味を定め、|プログラムを設計する。','指示的設計 · 合成性 · Rust'],
 ko:['프로그래밍 가이드','의미를 정의하고,|프로그램을 설계하세요.','지시적 설계 · 합성성 · Rust'],
 vi:['Hướng dẫn lập trình','Thiết kế từ|ý nghĩa.','Ngữ nghĩa biểu thị · Phép hợp thành · Rust'],
 de:['Programmierleitfaden','Nach Bedeutung|programmieren.','Denotationeller Entwurf · Komposition · Rust'],
 es:['Guía de programación','Diseña programas|desde el significado.','Diseño denotacional · Composición · Rust'],
 ru:['Руководство по программированию','Проектируйте,|исходя из смысла.','Денотационное проектирование · Композиция · Rust'],
 uk:['Посібник із програмування','Проєктуйте,|виходячи зі змісту.','Денотаційне проєктування · Композиція · Rust'],
 ar:['دليل البرمجة','حدّد المعنى،|ثم صمّم البرنامج.','التصميم الدلالي · التركيب · Rust']
};
export async function shareCardMarkup(code,origin='http://127.0.0.1:4173'){
 const [subtitle,heading,caption]=shareCopy[code]||shareCopy.en;
 const size={en:72,zh:76,'zh-hant':76,ja:56,ko:57,vi:80,de:72,es:64,ru:66,uk:60,ar:82}[code]||72;
 const rtl=code==='ar';
 return `<!doctype html><html lang="${htmlLanguage(code)}"><head><meta charset="utf-8"><style>
 @font-face{font-family:Book;src:url('${origin}/node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2');font-weight:600}@font-face{font-family:Book;src:url('${origin}/node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-vietnamese-600-normal.woff2');font-weight:600;unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+1EA0-1EF9,U+20AB}*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#18251f;color:#e1e4d6;font-family:Book,Georgia,serif}.card{position:relative;height:630px;isolation:isolate}.paper{position:absolute;inset:0;background:linear-gradient(90deg,#14241ff5 0%,#14241fe8 43%,#14241f33 78%),url('${origin}/art/forest-gateway.webp') center/cover;z-index:-1}.copy{position:absolute;left:72px;top:46px;width:650px;z-index:1}.brand{display:flex;align-items:center;gap:19px}.brand img{width:78px;height:78px;object-fit:contain}.brand-name{font-size:48px;line-height:1;letter-spacing:7px;color:#e1e4d6}.brand-subtitle{display:block;font:24px/1.4 Georgia,'Microsoft YaHei',serif;letter-spacing:.5px;margin-top:8px;color:#e1e4d6}.rule{width:70px;height:1px;background:#c9ae75;margin:32px 0 28px}h1{font-size:${size}px;line-height:1.17;font-weight:600;margin:0 0 28px;letter-spacing:0}h1{height:210px;display:flex;flex-direction:column;justify-content:center}h1 span{display:block}p{font:25px/1.65 Arial,'Microsoft YaHei',sans-serif;color:#d5c18f;max-width:620px;margin:0}p{height:80px}.byline{font:22px/1.4 Georgia,serif;color:#c1cbbf;margin-top:28px;letter-spacing:.4px}.wizard{position:absolute;width:390px;right:38px;bottom:8px}.wizard img{display:block;width:100%}.cjk h1{font-family:'SimSun','Yu Mincho','Malgun Gothic',serif;font-weight:500}.cjk .brand-subtitle{font-family:'SimSun','Yu Mincho','Malgun Gothic',serif}.arabic .copy{width:630px}.arabic .brand{justify-content:flex-end}.arabic .rule{margin-left:auto}.arabic h1,.arabic p{direction:rtl;text-align:right;font-family:'Traditional Arabic',Tahoma,serif}.arabic p{font-size:32px}.arabic .byline{text-align:right}.arabic .brand-subtitle{direction:rtl;font-family:'Traditional Arabic',Tahoma,serif;font-size:30px}.arabic .brand-name{display:block;direction:ltr;text-align:right}
 </style></head><body class="${['zh','zh-hant','ja','ko'].includes(code)?'cjk':rtl?'arabic':''}"><main class="card"><div class="paper"></div><div class="copy"><div class="brand"><img src="${origin}/art/alux-bronze-night.webp" alt=""><div><span class="brand-name">ALUX</span><span class="brand-subtitle">${subtitle}</span></div></div><div class="rule"></div><h1>${heading.split('|').map(line=>`<span>${line}</span>`).join('')}</h1><p>${caption}</p><div class="byline" dir="ltr">Tomislav Grospic</div></div><div class="wizard"><img src="${origin}/art/wizard-standing.webp" alt=""></div></main></body></html>`;
}
