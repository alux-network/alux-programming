// mdBook 0.4.52 prefixes print-page image URLs with the chapter directory, even for /URLs.
// The HTML-only mdbook-assets.ts preprocessor calls this after admonitions and math expand.
// Syntax-tree positions restrict edits to actual images; code and unrelated Markdown stay intact.
import path from 'node:path';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { parse, postprocess, preprocess } from 'micromark';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Definition, Image, Nodes } from 'mdast';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';

/** Rewrites root-relative image URLs without serializing the surrounding chapter. */
export function chapterAssets(content: string, chapter: string, lang: string): string {
  const depth = path.posix.dirname(chapter.replaceAll('\\', '/')).split('/').filter((part) => part !== '.').length;
  const prefix = '../'.repeat(depth + (lang === 'en' ? 0 : 1)) || './';
  const root = fromMarkdown(content);
  const images = new Map<number, { labelEnd: number; destination?: { start: number; end: number } }>();
  const stack: number[] = [];
  // Token offsets let us change a destination without reserializing labels or container prefixes.
  for (const [kind, token] of postprocess(parse().document().write(preprocess()(content, 'utf8', true)))) {
    if (token.type === 'image') {
      if (kind === 'enter') {
        stack.push(token.start.offset);
        images.set(token.start.offset, { labelEnd: token.start.offset });
      } else stack.pop();
    }
    const image = images.get(stack[stack.length - 1]!);
    if (kind !== 'enter' || !image) continue;
    if (token.type === 'label' && token.start.offset === stack[stack.length - 1]) image.labelEnd = token.end.offset;
    if (token.type === 'resourceDestination') image.destination = { start: token.start.offset, end: token.end.offset };
  }
  const definitions = new Map<string, Definition>();
  const edits: { start: number; end: number; value: string }[] = [];
  const absolute = (url: string) => url.startsWith('/') && !url.startsWith('//');

  /** Visits parsed Markdown without interpreting literal code as markup. */
  function visit(node: Nodes, action: (node: Nodes) => void): void {
    action(node);
    if ('children' in node) for (const child of node.children) visit(child, action);
  }
  visit(root, (node) => {
    // CommonMark resolves duplicate labels to their first definition.
    if (node.type === 'definition' && !definitions.has(node.identifier)) definitions.set(node.identifier, node);
  });
  visit(root, (node) => {
    const start = node.position!.start.offset!, end = node.position!.end.offset!;
    let image: Image | undefined;
    if (node.type === 'image') image = node;
    if (node.type === 'imageReference') {
      const definition = definitions.get(node.identifier);
      // Inline only this image, leaving a definition shared with ordinary links untouched.
      if (definition) image = { type: 'image', alt: node.alt, url: definition.url, title: definition.title };
    }
    if (image && absolute(image.url)) {
      const token = images.get(start)!;
      const normalized = { ...image, alt: '', url: prefix + image.url.slice(1) };
      if (node.type === 'image') {
        // Serialize only the destination; preserve the original alt text, title and whitespace.
        const destination = toMarkdown({ ...normalized, title: null }).trimEnd().slice(4, -1);
        edits.push({ ...token.destination!, value: destination });
      } else {
        const resource = toMarkdown(normalized).trimEnd().slice(3);
        edits.push({ start: token.labelEnd, end, value: resource });
      }
    }
    if (node.type === 'html') {
      const html = content.slice(start, end);
      /** Finds genuine img elements and attribute spans, excluding comments and script text. */
      function visitHtml(element: DefaultTreeAdapterTypes.Node): void {
        if ('tagName' in element && element.tagName === 'img') {
          const src = element.attrs.find((attribute) => attribute.name === 'src');
          const location = element.sourceCodeLocation?.attrs?.src;
          if (src && location && absolute(src.value)) {
            const value = (prefix + src.value.slice(1)).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
            edits.push({ start: start + location.startOffset, end: start + location.endOffset, value: `src="${value}"` });
          }
        }
        if ('childNodes' in element) for (const child of element.childNodes) visitHtml(child);
        if ('content' in element) visitHtml(element.content);
      }
      visitHtml(parseFragment(html, { sourceCodeLocationInfo: true }));
    }
  });
  // Work backward so each offset continues to refer to the original Markdown.
  for (const edit of edits.sort((a, b) => b.start - a.start)) content = content.slice(0, edit.start) + edit.value + content.slice(edit.end);
  return content;
}
