import type {BookNode, ReaderBook, ReaderPage, TranslationDictionary, TranslationManifest} from './book.ts';

const translatableBlocks='h1,h2,h3,h4,h5,h6,p,li,td,th,.admonition-title,summary,figcaption';
const safeHtml=(value:string):string=>value
  .replace(/&(?!(?:[a-z]+|#\d+|#x[\da-f]+);)/gi,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;');

/** Localize reader content while retaining chapter identity, anchors, and source metadata. */
export function localizeBook(
  book:ReaderBook,
  dictionary:TranslationDictionary|undefined,
  manifest:TranslationManifest,
  translate:(text:string)=>string,
  document:Document
):ReaderBook{
  const pages=book.pages.map((page:ReaderPage)=>{
    if(!dictionary){
      return {...page,title:translate(page.title)};
    }

    const chapter=manifest[page.slug];
    if(!chapter)throw new Error(`Translation manifest is missing chapter: ${page.slug}`);
    const translatedTitle=dictionary[chapter.titleKey];
    if(typeof translatedTitle!=='string')throw new Error(`Translation is missing: ${chapter.titleKey}`);
    const root=document.createElement('article');
    root.innerHTML=page.html;
    const used=new Set<Element>();
    let candidatesByHtml=new Map<string,Element[]>();
    const rebuildCandidates=():void=>{
      candidatesByHtml=new Map<string,Element[]>();
      for(const element of root.querySelectorAll(translatableBlocks)){
        const candidates=candidatesByHtml.get(element.innerHTML)??[];
        candidates.push(element);
        candidatesByHtml.set(element.innerHTML,candidates);
      }
    };
    const hasTranslatableParent=(element:Element):boolean=>{
      for(let parent=element.parentElement;parent&&parent!==root;parent=parent.parentElement){
        if(parent.matches(translatableBlocks))return true;
      }
      return false;
    };
    const hasTranslatableChild=(element:Element):boolean=>element.querySelector(translatableBlocks)!==null;
    rebuildCandidates();
    let candidatesDirty=false;
    for(const unit of chapter.units){
      if(candidatesDirty){rebuildCandidates();candidatesDirty=false;}
      const canonical=document.createElement('div');
      canonical.innerHTML=unit.source;
      const sourceHtml=canonical.innerHTML;
      const target=candidatesByHtml.get(sourceHtml)?.find(element=>!used.has(element)&&root.contains(element)&&element.innerHTML===sourceHtml);
      if(!target)throw new Error(`Translated block cannot be matched: ${unit.key}`);
      if(hasTranslatableParent(target)||hasTranslatableChild(target))candidatesDirty=true;
      used.add(target);
      const translated=dictionary[unit.key];
      if(typeof translated!=='string')throw new Error(`Translation is missing: ${unit.key}`);
      target.innerHTML=safeHtml(translated).replace(/⟦(\d+)⟧/g,(_token,index)=>unit.tokens[Number(index)]??'');
      if(hasTranslatableParent(target)||hasTranslatableChild(target))candidatesDirty=true;
    }

    const elementsById=new Map<string,HTMLElement>();
    for(const element of root.querySelectorAll<HTMLElement>('[id]'))if(!elementsById.has(element.id))elementsById.set(element.id,element);
    const headings=page.headings.map(heading=>{
      const element=elementsById.get(heading.id);
      const text=element?.textContent?.replace(/#$/,'').trim();
      return {...heading,text:text||heading.text};
    });
    const plain=root.cloneNode(true) as HTMLElement;
    plain.querySelectorAll('.heading-anchor,.copy-code,.katex-html').forEach(element=>element.remove());
    return {
      ...page,
      title:translatedTitle,
      group:translate(page.group),
      html:root.innerHTML,
      headings,
      text:(plain.textContent??'').replace(/\s+/g,' ').trim()
    };
  });
  const titlesById=new Map(pages.map(page=>[page.id,page.title]));
  const localizeNode=(node:BookNode):BookNode=>{
    if(node.kind==='chapter')return {...node,title:titlesById.get(node.id)??translate(node.title),children:node.children.map(localizeNode)};
    if(node.kind==='part')return {...node,title:translate(node.title)};
    return {...node};
  };
  return {
    ...book,
    pages,
    groups:book.groups.map(group=>({...group,title:translate(group.title)})),
    toc:book.toc.map(localizeNode)
  };
}
