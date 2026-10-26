/** Offline internal routes/resources/fragments audit of the complete production tree. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseHTML} from 'linkedom';
const root=path.resolve(import.meta.dirname,'../dist'),output=path.resolve(root,'../../output/merge-acceptance');
async function walk(dir:string):Promise<string[]>{const items=await fs.readdir(dir,{withFileTypes:true});return(await Promise.all(items.map(item=>item.isDirectory()?walk(path.join(dir,item.name)):Promise.resolve([path.join(dir,item.name)])))).flat();}
const files=(await walk(root)).sort(),known=new Set(files.map(file=>path.relative(root,file).replaceAll('\\','/'))),failures:string[]=[],documents=new Map<string,ReturnType<typeof parseHTML>['document']>();
let links=0,fragments=0,resources=0;
async function documentFor(file:string){let document=documents.get(file);if(!document){document=parseHTML(await fs.readFile(path.join(root,file),'utf8')).document;documents.set(file,document);}return document;}
for(const file of known){
 if(!file.endsWith('.html'))continue;
 const document=await documentFor(file);
 for(const element of document.querySelectorAll('a[href],img[src],script[src],link[href],audio[src],video[src],source[src],track[src]')){
  const attribute=element.hasAttribute('src')?'src':'href',raw=element.getAttribute(attribute)!;
  const url=new URL(raw,'https://audit.invalid/'+file);if(url.origin!=='https://audit.invalid')continue;
  const target=decodeURIComponent(url.pathname).slice(1)+(url.pathname.endsWith('/')?'index.html':'');
  if(element.localName==='a')links++;else resources++;
  if(!known.has(target)){failures.push(file+': '+raw+' (missing '+target+')');continue;}
  if(url.hash&&target.endsWith('.html')){fragments++;const targetDocument=await documentFor(target),id=decodeURIComponent(url.hash.slice(1));if(!targetDocument.getElementById(id))failures.push(file+': '+raw+' (missing fragment)');}
 }
}
// Content and every generated route are deterministic inputs to the delivery.
const hashes:Record<string,string>={};for(const file of known)hashes[file]=createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'generated-inventory.json'),JSON.stringify(hashes,null,2));await fs.writeFile(path.join(output,'generated-audit.json'),JSON.stringify({html:documents.size,links,fragments,resources,failures},null,2));
console.log(JSON.stringify({html:documents.size,links,fragments,resources,failures:failures.length,samples:failures.slice(0,12)}));assert.equal(failures.length,0,'See generated-audit.json');
