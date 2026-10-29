// Source for the eleven localized social cards used by the reader and repository introductions.
// Render at the platforms' native 1200 × 630 dimensions; no image upscaling.
// Run: node web/social-cards.ts (requires Playwright Chromium; an installed Chrome can be selected
// with ALUX_CARD_BROWSER_CHANNEL=chrome). Existing card layout and original artwork are retained.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { languages } from './languages.ts';
import type { Language } from './languages.ts';
import { uiStrings } from './i18n.ts';

const copy: Record<Language, readonly [string, string]> = {
  en: [
    'Design programs|by meaning.',
    'Denotational design · Composition · Rust'
  ],
  zh: ['先定义含义，|再设计程序。', '指称设计 · 组合性 · Rust'],
  'zh-hant': ['先定義含義，|再設計程式。', '指稱設計 · 合成性 · Rust'],
  ja: ['意味を定め、|プログラムを設計する。', '指示的設計 · 合成性 · Rust'],
  ko: [
    '의미를 정의하고,|프로그램을 설계하세요.',
    '지시적 설계 · 합성성 · Rust'
  ],
  vi: ['Thiết kế từ|ý nghĩa.', 'Ngữ nghĩa biểu thị · Phép hợp thành · Rust'],
  de: [
    'Nach Bedeutung|programmieren.',
    'Denotationeller Entwurf · Komposition · Rust'
  ],
  es: [
    'Diseña programas|desde el significado.',
    'Diseño denotacional · Composición · Rust'
  ],
  ru: [
    'Проектируйте,|исходя из смысла.',
    'Денотационное проектирование · Композиция · Rust'
  ],
  uk: [
    'Проєктуйте,|виходячи зі змісту.',
    'Денотаційне проєктування · Композиція · Rust'
  ],
  ar: ['حدّد المعنى،|ثم صمّم البرنامج.', 'التصميم الدلالي · التركيب · Rust']
};

const subtitles = Object.fromEntries(languages.map(({ code }) => [code, uiStrings[code]?.Programming ?? 'Programming']));
export const shareCopy: Record<
  Language,
  readonly [string, string, string]
> = Object.fromEntries(
  Object.entries(copy).map(([code, values]) => [
    code,
    [subtitles[code as Language], ...values]
  ])
) as unknown as Record<Language, readonly [string, string, string]>;

export async function shareCardMarkup(
  code: Language,
  origin = 'http://127.0.0.1:4173'
): Promise<string> {
  const [subtitle, heading, caption] = shareCopy[code];
  const size: Record<Language, number> = {
    en: 72,
    zh: 76,
    'zh-hant': 76,
    ja: 56,
    ko: 57,
    vi: 80,
    de: 72,
    es: 64,
    ru: 66,
    uk: 60,
    ar: 82
  };
  const rtl = code === 'ar';
  return `<!doctype html><html lang="${code}"><head><meta charset="utf-8"><style>
 @font-face{font-family:Book;src:url('${origin}/fonts/cormorant-garamond-latin-500-normal.woff2');font-weight:500}@font-face{font-family:Book;src:url('${origin}/fonts/cormorant-garamond-latin-600-normal.woff2');font-weight:600}@font-face{font-family:Book;src:url('${origin}/fonts/cormorant-garamond-vietnamese-600-normal.woff2');font-weight:600;unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+1EA0-1EF9,U+20AB}*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#18251f;color:#e1e4d6;font-family:Book,Georgia,serif}.card{position:relative;height:630px;isolation:isolate}.paper{position:absolute;inset:0;background:linear-gradient(90deg,#14241ff5 0%,#14241fe8 43%,#14241f33 78%),url('${origin}/forest-gateway.webp') center/cover;z-index:-1}.copy{position:absolute;left:72px;top:46px;width:650px;z-index:1}.brand{display:flex;align-items:center;gap:14px}.brand img{width:62px;height:62px;object-fit:contain}.brand-letters{display:flex;flex-direction:column;gap:7px;line-height:1}.brand-name{display:block;font-family:Book,Georgia,serif;font-size:38px;font-weight:500;letter-spacing:6px;line-height:1;color:#e1e4d6}.brand-subtitle{display:block;font:600 20px/1.1 Book,Georgia,serif;letter-spacing:1.2px;padding-left:2px;white-space:nowrap;color:#e1e4d6}.rule{width:70px;height:1px;background:#c9ae75;margin:32px 0 28px}h1{font-size:${size[code]}px;line-height:1.17;font-weight:600;margin:0 0 28px;letter-spacing:0}h1{height:210px;display:flex;flex-direction:column;justify-content:center}h1 span{display:block}p{font:25px/1.65 Arial,'Microsoft YaHei',sans-serif;color:#d5c18f;max-width:620px;margin:0}p{height:80px}.byline{font:22px/1.4 Georgia,serif;color:#c1cbbf;margin-top:28px;letter-spacing:.4px}.wizard{position:absolute;width:390px;right:38px;bottom:8px}.wizard img{display:block;width:100%}.cjk h1{font-family:'SimSun','Yu Mincho','Malgun Gothic',serif;font-weight:500}.cjk .brand-subtitle{font-family:'SimSun','Yu Mincho','Malgun Gothic',serif}.arabic .copy{width:630px}.arabic .brand{justify-content:flex-end}.arabic .rule{margin-left:auto}.arabic h1,.arabic p{direction:rtl;text-align:right;font-family:'Traditional Arabic',Tahoma,serif}.arabic p{font-size:32px}.arabic .byline{text-align:right}.arabic .brand-subtitle{direction:rtl;font-family:'Traditional Arabic',Tahoma,serif;font-size:20px}.arabic .brand-name{display:block;direction:ltr;text-align:right}
 </style></head><body class="${['zh', 'zh-hant', 'ja', 'ko'].includes(code) ? 'cjk' : rtl ? 'arabic' : ''}"><main class="card"><div class="paper"></div><div class="copy"><div class="brand"><img src="${origin}/alux-bronze-night.webp" alt=""><div class="brand-letters"><span class="brand-name">ALUX</span><span class="brand-subtitle">${subtitle}</span></div></div><div class="rule"></div><h1>${heading
   .split('|')
   .map((line) => `<span>${line}</span>`)
   .join(
     ''
   )}</h1><p>${caption}</p><div class="byline" dir="ltr">Tomislav Grospić</div></div><div class="wizard"><img src="${origin}/wizard-standing.webp" alt=""></div></main></body></html>`;
}

const root = path.resolve(import.meta.dirname, '../public');
const browser = await chromium.launch({ channel: process.env.ALUX_CARD_BROWSER_CHANNEL });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const failures: string[] = [];
  await page.route('http://alux-card.local/**', async (route) => {
    const file = path.resolve(root, '.' + new URL(route.request().url()).pathname);
    if (!file.startsWith(root + path.sep)) throw new Error('Asset outside public directory');
    const type = file.endsWith('.woff2') ? 'font/woff2' : 'image/webp';
    await route.fulfill({ body: await fs.readFile(file), contentType: type, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('requestfailed', (request) => failures.push(request.url()));
  await fs.mkdir(path.join(root, 'social'), { recursive: true });
  for (const { code } of languages) {
    await page.setContent(await shareCardMarkup(code, 'http://alux-card.local'), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (!(await page.locator('.byline').textContent())?.includes('Tomislav Grospić')) throw new Error('Incorrect author');
    if (failures.length) throw new Error(failures.join('\n'));
    await page.screenshot({ path: path.join(root, 'social', `alux-programming-${code}.jpg`), type: 'jpeg', quality: 92 });
    console.log(`Rendered ${code}: 1200x630, Tomislav Grospić`);
  }
} finally {
  await browser.close();
}
