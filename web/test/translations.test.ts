// Every translation keeps its English chapter's technical content: code, math, link targets,
// embedded media and heading structure. Prose and visible titles are free to differ, and so is the
// order of formulas and links within the text: a translated sentence may reorder them.
//
// Reads src/ only, no build needed. One test per translation file. A new protected property goes
// into protectedContent, with a change to it in the negative test at the end.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { languages } from '../languages.ts';

const src = 'src';
const codes = languages.map((l) => l.code).filter((c) => c !== 'en');
const translation = new RegExp(`\\.(${codes.join('|')})\\.md$`);

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? markdownFiles(full) : name.endsWith('.md') ? [full] : [];
  });
}

/** Splits Markdown into code blocks and the prose around them; admonitions are prose with code inside. */
function split(markdown: string, code: string[] = []): { prose: string; code: string[] } {
  const lines = markdown.split(/\r?\n/);
  let prose = '';
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i]!.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (!open) {
      prose += lines[i] + '\n';
      continue;
    }
    const fence = open[1]!, info = open[2]!.trim();
    let end = i + 1;
    while (end < lines.length && !new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(lines[end]!)) end++;
    const body = lines.slice(i + 1, end).join('\n');
    if (info.startsWith('admonish')) prose += split(body, code).prose;
    else code.push(dedent(body));
    i = end;
  }
  return { prose, code };
}

/** A code block without the indentation it has inside a list. */
function dedent(block: string) {
  const lines = block.split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

/** Link and media targets as the files or URLs they point to, in sorted order. */
function targets(found: string[], file: string) {
  return found
    .map((t) => (/^(?:[a-z]+:|#)/i.test(t) ? t : path.posix.normalize(path.posix.join(path.posix.dirname(file.replaceAll('\\', '/')), t))))
    .sort();
}

/** The parts of a chapter a translation must not change. `file` resolves relative targets. */
export function protectedContent(markdown: string, file = 'chapter.md') {
  const { prose: text, code } = split(markdown.replace(/^\s*<!--\s*reader:[\s\S]*?-->/, ''));
  const prose = text.replace(/`[^`\n]+`/g, '');
  const images = [...prose.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)].map((m) => m[1]!);
  const html = [...prose.matchAll(/<(?:img|iframe|video|audio|source)\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]!);
  const inline = [...prose.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)].map((m) => m[1]!);
  const references = [...prose.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)].map((m) => m[1]!);
  return {
    code,
    math: [...prose.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g)].map((m) => (m[1] ?? m[2]!).replace(/\s+/g, ' ').trim()).sort(),
    links: [...new Set(targets([...inline, ...references], file))],
    media: targets([...images, ...html], file),
    headings: [...prose.matchAll(/^(#{1,6})\s/gm)].map((m) => m[1]!.length),
  };
}

const pairs = markdownFiles(src)
  .filter((file) => translation.test(file))
  .map((file) => ({ file, english: file.replace(translation, '.md') }));

test('translations exist only for English chapters', () => {
  assert.deepEqual(pairs.filter((p) => !existsSync(p.english)).map((p) => p.file), []);
});

for (const { file, english } of pairs) {
  test(`${file} keeps the technical content of ${english}`, () => {
    const expected = protectedContent(readFileSync(english, 'utf8'), english);
    const actual = protectedContent(readFileSync(file, 'utf8'), file);
    assert.deepEqual(actual.code, expected.code, 'code blocks');
    assert.deepEqual(actual.math, expected.math, 'math');
    assert.deepEqual(actual.links, expected.links, 'link targets');
    assert.deepEqual(actual.media, expected.media, 'embedded media');
    assert.deepEqual(actual.headings, expected.headings, 'heading levels');
  });
}

test('a changed translation is reported', () => {
  const english = 'src/concepts/branching.md';
  const source = readFileSync(english, 'utf8');
  const changes = {
    'code blocks': source.replace('fn sign', 'fn signum'),
    math: source.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/, '$x$'),
    'link targets': source.replace(/\]\(([^)#\s]+)\.md/, '](missing.md'),
    'heading levels': source.replace(/^## /m, '### '),
  };
  const expected = protectedContent(source, english);
  // Windows checkouts must agree with LF/POSIX sources before testing real mutations.
  assert.deepEqual(protectedContent(source.replace(/\r?\n/g, '\r\n'), english.replaceAll('/', '\\')), expected);
  for (const [what, changed] of Object.entries(changes)) {
    assert.notEqual(changed, source, what);
    assert.notDeepEqual(protectedContent(changed, english), expected, what);
  }
});
