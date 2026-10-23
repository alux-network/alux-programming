import {parseHTML} from 'linkedom';
import type {ReaderBook, ReaderPage, TranslationDictionary, TranslationManifest, TranslationUnit} from '../src/book.ts';

const BLOCK_SELECTOR='h1,h2,h3,h4,h5,h6,p,li,td,th,.admonition-title,summary,figcaption';
const VOID_ELEMENTS=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const MARKER=/⟦(\d+)⟧/g;

export interface TokenizedFragment { template:string; tokens:string[] }
export interface HeadingAlias { chapterSlug:string; legacyId:string; nativeId:string }
interface LegacyFragment extends TokenizedFragment { documentOrderSlots:number[] }
interface BlockCandidate { source:string; template:string; tokens:string[]; identities:string[]; signature:string; element:Element }
interface UnitDescriptor { unit:TranslationUnit; legacy:LegacyFragment; signature:string }
interface ReindexedUnit { unit:TranslationUnit; template:string }

function fragmentRoot(html:string):Element{
 const {document}=parseHTML('<html><body><div data-translation-fragment="root">'+html+'</div></body></html>');
 const root=document.querySelector('[data-translation-fragment="root"]');
 if(!root)throw new Error('Could not create an HTML fragment root.');
 return root;
}

function appendToken(tokens:string[],template:string,raw:string):string{
 const index=tokens.push(raw)-1;
 return template+'⟦'+index+'⟧';
}

function escapeAttribute(value:string):string{return value.replaceAll('&','&amp;').replaceAll('"','&quot;');}

/** Tokenize a native HTML fragment in DOM order while retaining exact protected markup. */
export function tokenizeFragment(html:string):TokenizedFragment{
 const root=fragmentRoot(html);const tokens:string[]=[];let template='';
 const emit=(raw:string):void=>{template=appendToken(tokens,template,raw);};
 const walk=(node:Node):void=>{
  if(node.nodeType===3){template+=node.textContent??'';return;}
  if(node.nodeType===8){emit('<!--'+(node.textContent??'')+'-->');return;}
  if(node.nodeType!==1)return;
  const element=node as Element;const tag=element.localName.toLowerCase();
  const atomic=tag==='code'||tag==='img'||element.classList.contains('katex')||element.classList.contains('heading-anchor');
  if(atomic){emit(element.outerHTML);return;}
  if(VOID_ELEMENTS.has(tag)){emit(element.outerHTML);return;}
  const open=`<${tag}${[...element.attributes].map(attribute=>` ${attribute.name.toLowerCase()}="${escapeAttribute(attribute.value)}"`).join('')}>`;
  emit(open);
  for(const child of [...element.childNodes])walk(child);
  emit(`</${tag}>`);
 };
 for(const child of [...root.childNodes])walk(child);
 return {template,tokens};
}

function tokenPositions(fragment:string,slots:readonly string[]):Array<{index:number;start:number;end:number}>{
 const indexesByRaw=new Map<string,number[]>();
 slots.forEach((raw,index)=>{if(!raw)throw new Error(`Legacy translation token ${index} is empty.`);const indexes=indexesByRaw.get(raw)??[];indexes.push(index);indexesByRaw.set(raw,indexes);});
 const positions:Array<{index:number;start:number;end:number}>=[];
 for(const [raw,indexes] of indexesByRaw){
  const starts:number[]=[];let cursor=0;
  while(true){const start=fragment.indexOf(raw,cursor);if(start<0)break;starts.push(start);cursor=start+raw.length;}
  if(starts.length!==indexes.length)throw new Error(`Legacy token occurs ${starts.length} time(s), expected ${indexes.length}: ${raw.slice(0,100)}`);
  indexes.forEach((index,occurrence)=>positions.push({index,start:starts[occurrence]??-1,end:(starts[occurrence]??-1)+raw.length}));
 }
 positions.sort((left,right)=>left.start-right.start);
 for(let index=1;index<positions.length;index++)if((positions[index-1]?.end??0)>(positions[index]?.start??0))throw new Error('Legacy translation tokens overlap in their HTML source.');
 return positions;
}

function legacyFragment(unit:TranslationUnit):LegacyFragment{
 const positions=tokenPositions(unit.source,unit.tokens);let template='';let cursor=0;
 for(const position of positions){template+=unit.source.slice(cursor,position.start)+'⟦'+position.index+'⟧';cursor=position.end;}
 template+=unit.source.slice(cursor);
 const documentOrderSlots=[...template.matchAll(MARKER)].map(match=>Number(match[1]));
 if(documentOrderSlots.length!==unit.tokens.length)throw new Error(`Legacy token count does not match the template for ${unit.key}.`);
 return {template,tokens:[...unit.tokens],documentOrderSlots};
}

function annotationText(raw:string):string{
 const annotation=fragmentRoot(raw).querySelector('annotation[encoding="application/x-tex"]');
 if(!annotation)throw new Error('KaTeX token is missing its application/x-tex annotation.');
 return annotation.textContent??'';
}

function tokenIdentity(raw:string):string{
 const closing=raw.match(/^<\/([a-z][a-z\d-]*)\s*>$/i);
 if(closing)return `close:${closing[1]?.toLowerCase()??''}`;
 const root=fragmentRoot(raw);const element=root.firstElementChild;
 if(!element)throw new Error(`Translation token is not an HTML element: ${raw.slice(0,100)}`);
 const tag=element.localName.toLowerCase();
 const complete=VOID_ELEMENTS.has(tag)||new RegExp(`</${tag}\\s*>\\s*$`,'i').test(raw);
 const get=(name:string):string=>element.getAttribute(name)??'';
 if(complete&&tag==='code')return `code:${element.textContent??''}`;
 if(complete&&element.classList.contains('katex'))return `math:${annotationText(raw)}`;
 if(complete&&element.classList.contains('heading-anchor')){
  const attributes=[...element.attributes].filter(attribute=>attribute.name.toLowerCase()!=='href').map(attribute=>[attribute.name.toLowerCase(),attribute.value]).sort(([left],[right])=>left.localeCompare(right));
  return `heading-anchor:${JSON.stringify(attributes)}:${element.textContent??''}`;
 }
 if(complete&&tag==='img')return `image:${get('src')}:${get('alt')}:${get('style')}`;
 const identity=[`tag:${tag}`,complete?'whole':'open'];
 if(element.hasAttribute('href'))identity.push(`href:${get('href')}`);
 if(element.hasAttribute('id'))identity.push(`id:${get('id')}`);
 return identity.join('|');
}

function canonicalText(text:string,allowNoteCase:boolean):string{
 const decoded=(fragmentRoot(text).textContent??text).normalize('NFC');
 const normalized=decoded.replace(/\s+/g,' ').trim();
 return allowNoteCase&&/^(?:note)$/i.test(normalized)?'note':normalized;
}

function canonicalTemplate(template:string,allowNoteCase:boolean):string{
 const pieces=template.split(/(⟦\d+⟧)/g);let output='';
 for(const piece of pieces){if(/^⟦\d+⟧$/.test(piece))output+='⟦⟧';else output+=canonicalText(piece,allowNoteCase);}
 return output;
}

function orderedIdentities(template:string,tokens:readonly string[]):string[]{
 return [...template.matchAll(MARKER)].map(match=>{
  const index=Number(match[1]);const raw=tokens[index];
  if(raw===undefined)throw new Error(`Translation marker ⟦${index}⟧ has no token.`);
  return tokenIdentity(raw);
 });
}

function signature(template:string,identities:readonly string[],allowNoteCase:boolean):string{
 return JSON.stringify([canonicalTemplate(template,allowNoteCase),identities]);
}

function hasTranslatableProse(template:string):boolean{
 const text=template.replace(/⟦\d+⟧/g,'').replace(/&(?:nbsp|#160);/gi,' ');
 return /[\p{L}\p{N}]/u.test(text);
}

function isHeadingAnchor(raw:string):boolean{
 const element=fragmentRoot(raw).firstElementChild;
 return Boolean(element?.classList.contains('heading-anchor'));
}

function hrefOf(raw:string):string{
 const element=fragmentRoot(raw).firstElementChild;
 if(!element?.hasAttribute('href'))throw new Error(`Heading anchor has no href: ${raw.slice(0,120)}`);
 return element.getAttribute('href')??'';
}

/** Reconstructs the approved marker slots from the original catalog's protected tokens. */
export function verifyLegacyTranslationContract(original:TranslationManifest,englishSource:TranslationDictionary):void{
 const mismatches:string[]=[];let checked=0;const referenced=new Set<string>();
 for(const [slug,chapter] of Object.entries(original))for(const unit of chapter.units){
  referenced.add(unit.key);
  checked++;
  try{const derived=legacyFragment(unit).template;const expected=englishSource[unit.key];if(expected===undefined||derived!==expected)mismatches.push(`${slug}:${unit.key} expected ${JSON.stringify(expected)} but reconstructed ${JSON.stringify(derived)}`);}
  catch(error){mismatches.push(`${slug}:${unit.key}: ${error instanceof Error?error.message:String(error)}`);}
 }
 for(const chapter of Object.values(original))referenced.add(chapter.titleKey);
 for(const key of Object.keys(englishSource))if(!referenced.has(key))mismatches.push(`English source contains an unreferenced key: ${key}`);
 for(const key of referenced)if(englishSource[key]===undefined)mismatches.push(`English source is missing referenced key: ${key}`);
 if(mismatches.length)throw new Error(`Approved translation contract failed for ${mismatches.length}/${checked} units:\n${mismatches.slice(0,12).join('\n')}`);
}

/** Resolve old heading fragment IDs to their canonical mdBook IDs from exact heading matches. */
export function headingAliases(book:ReaderBook,original:TranslationManifest):HeadingAlias[]{
 const pageBySlug=new Map(book.pages.map(page=>[page.slug,page]));
 if(pageBySlug.size!==book.pages.length)throw new Error('ReaderBook contains duplicate chapter slugs.');
 const aliases:HeadingAlias[]=[];
 for(const [slug,chapter] of Object.entries(original)){
  const page=pageBySlug.get(slug);if(!page)throw new Error(`Translation chapter is missing from the rendered book: ${slug}`);
  const descriptors=chapter.units.map(unit=>{
   const legacy=legacyFragment(unit);
   return {unit,legacy,signature:signature(legacy.template,orderedIdentities(legacy.template,legacy.tokens),false)};
  });
  const headingDescriptors=descriptors.filter(descriptor=>descriptor.unit.tokens.some(isHeadingAnchor));
  const approvedSignatures=new Set(descriptors.map(descriptor=>descriptor.signature));
  const candidates=pageBlocks(page,approvedSignatures);
  for(const descriptor of headingDescriptors){
   const matches=candidates.filter(candidate=>candidate.signature===descriptor.signature);
   if(matches.length!==1)throw new Error(`${slug}: legacy heading ${descriptor.unit.key} resolves to ${matches.length} native headings; expected exactly one.`);
   const candidate=matches[0];if(!candidate)continue;
   const slots=descriptor.legacy.documentOrderSlots;
   for(const [slot,oldRaw] of descriptor.unit.tokens.entries()){
    if(!isHeadingAnchor(oldRaw))continue;
    const position=slots.indexOf(slot);
    const nativeIndex=position<0?undefined:Number([...candidate.template.matchAll(MARKER)][position]?.[1]);
    const nativeRaw=nativeIndex===undefined?undefined:candidate.tokens[nativeIndex];
    if(!nativeRaw||!isHeadingAnchor(nativeRaw))throw new Error(`${slug}: native heading anchor could not be resolved for ${descriptor.unit.key}.`);
    const legacyHref=hrefOf(oldRaw);const nativeHref=hrefOf(nativeRaw);
    if(legacyHref===nativeHref)continue;
    if(!legacyHref.startsWith('#')||!nativeHref.startsWith('#'))throw new Error(`${slug}: heading-anchor destination is not a same-page fragment for ${descriptor.unit.key}.`);
    aliases.push({chapterSlug:slug,legacyId:legacyHref.slice(1),nativeId:nativeHref.slice(1)});
   }
  }
 }
 return aliases.sort((left,right)=>left.chapterSlug.localeCompare(right.chapterSlug)||left.legacyId.localeCompare(right.legacyId));
}

function describeLegacyUnit(unit:TranslationUnit,expected:string):UnitDescriptor{
 const legacy=legacyFragment(unit);
 if(legacy.template!==expected)throw new Error(`Approved source mismatch for translation key ${unit.key}.`);
 const identities=orderedIdentities(legacy.template,legacy.tokens);
 const allowNoteCase=canonicalTemplate(expected,false)==='note';
 return {unit,legacy,signature:signature(expected,identities,allowNoteCase)};
}

function describeCandidate(element:Element):BlockCandidate{
 const source=element.innerHTML;const tokenized=tokenizeFragment(source);
 const identities=orderedIdentities(tokenized.template,tokenized.tokens);
 const allowNoteCase=canonicalTemplate(tokenized.template,false)==='Note';
 return {source,template:tokenized.template,tokens:tokenized.tokens,identities,signature:signature(tokenized.template,identities,allowNoteCase),element};
}

function pageBlocks(page:ReaderPage,approvedStructuralSignatures:ReadonlySet<string>):BlockCandidate[]{
 const root=fragmentRoot(page.html);
 // mdBook often wraps phrasing content in a paragraph inside list/table cells;
 // select the deepest eligible block so one source passage is not counted twice.
 return [...root.querySelectorAll(BLOCK_SELECTOR)].filter(element=>!element.querySelector(BLOCK_SELECTOR))
  .map(describeCandidate)
  .filter(candidate=>hasTranslatableProse(candidate.template)||approvedStructuralSignatures.has(candidate.signature));
}

function reindexCandidate(candidate:BlockCandidate,slots:readonly number[],tokenCount:number,key:string):ReindexedUnit{
 if(candidate.tokens.length!==slots.length||candidate.tokens.length!==tokenCount)throw new Error(`Protected token count changed for ${key}: old=${tokenCount}, native=${candidate.tokens.length}.`);
 const tokens=new Array<string>(tokenCount);
 let source='';let cursor=0;
 const markers=[...candidate.template.matchAll(MARKER)];
 if(markers.length!==slots.length)throw new Error(`Native token marker count changed for ${key}.`);
 markers.forEach((marker,position)=>{
  const start=marker.index??0;const oldSlot=slots[position];const newIndex=Number(marker[1]);const raw=candidate.tokens[newIndex];
  if(oldSlot===undefined||raw===undefined)throw new Error(`Could not map a native token slot for ${key}.`);
  source+=candidate.template.slice(cursor,start)+'⟦'+oldSlot+'⟧';cursor=start+marker[0].length;tokens[oldSlot]=raw;
 });
 source+=candidate.template.slice(cursor);
 if(tokens.some(token=>token===undefined))throw new Error(`A protected token slot was not mapped for ${key}.`);
 return {unit:{key,source:candidate.source,tokens},template:source};
}

/** Derive localization match sources from normalized mdBook HTML without changing catalog keys or translations. */
export function deriveTranslationManifest(book:ReaderBook,original:TranslationManifest,englishSource:TranslationDictionary):TranslationManifest{
 verifyLegacyTranslationContract(original,englishSource);
 const pageBySlug=new Map(book.pages.map(page=>[page.slug,page]));
 if(pageBySlug.size!==book.pages.length)throw new Error('ReaderBook contains duplicate chapter slugs.');
 for(const page of book.pages)if(!original[page.slug])throw new Error(`Rendered chapter has no approved translation catalog entry: ${page.slug}`);
 const result:TranslationManifest={};
 for(const [slug,chapter] of Object.entries(original)){
  const page=pageBySlug.get(slug);if(!page)throw new Error(`Translation chapter is missing from the rendered book: ${slug}`);
  const descriptors=chapter.units.map(unit=>{
   const expected=englishSource[unit.key];if(expected===undefined)throw new Error(`English source is missing translation key ${unit.key}.`);
   return describeLegacyUnit(unit,expected);
  });
  const descriptorGroups=new Map<string,UnitDescriptor[]>();
  for(const descriptor of descriptors){const group=descriptorGroups.get(descriptor.signature)??[];group.push(descriptor);descriptorGroups.set(descriptor.signature,group);}
  const candidates=pageBlocks(page,new Set(descriptorGroups.keys()));
  const candidateGroups=new Map<string,BlockCandidate[]>();
  for(const candidate of candidates){const group=candidateGroups.get(candidate.signature)??[];group.push(candidate);candidateGroups.set(candidate.signature,group);}
  for(const [key,units] of descriptorGroups){
   const matches=candidateGroups.get(key)??[];
   if(matches.length!==units.length)throw new Error(`${slug}: translation block alignment is ${matches.length===0?'missing':matches.length>units.length?'ambiguous or duplicated':'incomplete'} for ${units.map(item=>item.unit.key).join(', ')} (native=${matches.length}, catalog=${units.length}).`);
   if(units.some(item=>item.unit.tokens.some(isHeadingAnchor))&&(units.length!==1||matches.length!==1))throw new Error(`${slug}: heading template resolves ambiguously for ${units.map(item=>item.unit.key).join(', ')}.`);
  }
  for(const [key,matches] of candidateGroups)if(!descriptorGroups.has(key))throw new Error(`${slug}: native translatable block has no approved dictionary entry (${matches.length} occurrence(s)): ${matches[0]?.source.slice(0,120)??key}`);
  const usedBySignature=new Map<string,number>();
  const units=descriptors.map(descriptor=>{
   const matches=candidateGroups.get(descriptor.signature)??[];const occurrence=usedBySignature.get(descriptor.signature)??0;const candidate=matches[occurrence];
   if(!candidate)throw new Error(`${slug}: could not resolve ${descriptor.unit.key} to a unique native block.`);
   usedBySignature.set(descriptor.signature,occurrence+1);
   const native= reindexCandidate(candidate,descriptor.legacy.documentOrderSlots,descriptor.unit.tokens.length,descriptor.unit.key);
   const newIdentities=orderedIdentities(native.template,native.unit.tokens);
   if(JSON.stringify(newIdentities)!==JSON.stringify(descriptor.legacy.documentOrderSlots.map(slot=>tokenIdentity(descriptor.legacy.tokens[slot]??''))))throw new Error(`${slug}: protected token identity changed for ${descriptor.unit.key}.`);
   return native.unit;
  });
  result[slug]={titleKey:chapter.titleKey,units};
 }
 return result;
}
