import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

test('localization support probes exit cleanly without reading stdin, including on Windows',()=>{
  const script=path.resolve(import.meta.dirname,'../scripts/mdbook-localization.ts');
  for(const [renderer,status] of [['html',0],['reader-json',0],['unknown-renderer',1]] as const){
    const result=spawnSync(process.execPath,[script,'supports',renderer],{encoding:'utf8',timeout:10000,windowsHide:true});
    assert.equal(result.error,undefined);assert.equal(result.status,status);assert.equal(result.stdout,'');assert.equal(result.stderr,'');
  }
});
