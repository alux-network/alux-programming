import fs from 'node:fs/promises';
import path from 'node:path';
import { parseMdBookExport, record } from './mdbook-model.ts';

// mdBook renderer protocol: a single RenderContext arrives on stdin.
process.stdin.setEncoding('utf8');
let input = '';
for await (const chunk of process.stdin) input += String(chunk);
const context = record(JSON.parse(input) as unknown, 'RenderContext');
if (typeof context.destination !== 'string') throw new Error('RenderContext.destination is missing');
const exported = parseMdBookExport({ version: context.version, book: context.book });
await fs.mkdir(context.destination, { recursive: true });
await fs.writeFile(path.join(context.destination, 'book.json'), JSON.stringify(exported));
