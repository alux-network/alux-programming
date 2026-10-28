// mdBook 0.4.52 prefixes print-page media URLs with the chapter directory, even for /URLs.
// Give its HTML renderer chapter-relative public asset paths before rendering, leaving canonical
// Markdown and other renderers untouched. The edition itself adds one directory outside English.
import path from 'node:path';

export function chapterAssets(content: string, chapter: string, lang: string): string {
  const depth = path.posix.dirname(chapter.replaceAll('\\', '/')).split('/').filter((part) => part !== '.').length;
  const prefix = '../'.repeat(depth + (lang === 'en' ? 0 : 1)) || './';
  let fence = '';
  return content.split('\n').map((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1]!;
      else if (marker[1]![0] === fence[0] && marker[1]!.length >= fence.length) fence = '';
      return line;
    }
    if (fence) return line;
    return line.split(/(`+[^`]*`+)/g).map((part, index) => index % 2 ? part
      : part.replace(/(<img\b[^>]*\bsrc="|!\[[^\]\n]*\]\()\/(?!\/)/g, '$1' + prefix)).join('');
  }).join('\n');
}
