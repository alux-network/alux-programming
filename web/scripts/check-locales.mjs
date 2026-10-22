import {parseHTML} from 'linkedom';
import {uiRows} from '../ui-translations.js';
import fs from 'node:fs/promises';
import path from 'node:path';
const directory=path.resolve(import.meta.dirname,'../locales');
const source=JSON.parse(await fs.readFile(path.join(directory,'source.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
const emptyInline=html=>{const {document}=parseHTML('<html><body><div>'+html+'</div></body></html>');return [...document.querySelectorAll('a,em,strong')].filter(el=>!el.textContent.trim()&&!el.querySelector('img')).length;};
const expected=Object.keys(source).sort();
const referenced=Object.values(manifest).flatMap(page=>[page.titleKey,...page.units.map(unit=>unit.key)]).sort();
const tokens=text=>(text.match(/⟦\d+⟧/g)||[]).sort().join('|');
if(JSON.stringify(expected)!==JSON.stringify(referenced))throw Error('The translation manifest and English source keys differ.');
for(const language of ['zh','zh-hant','ko','ja','ar','vi','ru','uk','de','es']){
  const translations=JSON.parse(await fs.readFile(path.join(directory,language+'.json'),'utf8'));
  if(JSON.stringify(Object.keys(translations).sort())!==JSON.stringify(expected))throw Error(language+': missing or extra translation keys.');
  for(const key of expected){const text=translations[key];if(typeof text!=='string'||!text.trim()||tokens(text)!==tokens(source[key]))throw Error(language+': invalid translation or protected tokens at '+key);}
  for(const page of Object.values(manifest))for(const unit of page.units){const expand=text=>text.replace(/⟦(\d+)⟧/g,(_,n)=>unit.tokens[Number(n)]);if(emptyInline(expand(translations[unit.key]))>emptyInline(expand(source[unit.key])))throw Error(language+': empty translated link or emphasis at '+unit.key);}
  console.log(language+': '+expected.length+' complete translations; protected code, math and markup tokens match.');
}

const uiKeys=uiRows.map(row=>row[0]).sort();
for(const language of ['zh-hant','vi','ru','uk','de','es']){
 const ui=JSON.parse(await fs.readFile(path.join(directory,'ui-'+language+'.json'),'utf8'));
 if(JSON.stringify(Object.keys(ui).sort())!==JSON.stringify(uiKeys)||Object.values(ui).some(text=>typeof text!=='string'||!text.trim()))throw Error(language+': incomplete UI translations.');
 console.log(language+': '+uiKeys.length+' complete interface labels.');
}
