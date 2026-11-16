import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFormMotion} from '../js/animation/form-motion.js';
import * as original from '../js/animation/taegeuk-1-motion.js';
import {POSES} from '../js/lessons/taegeuk-1-data.js';
import {formRecordProblem} from '../js/lib/catalog.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(read(p));
const forms=json('data/forms.json'),manifest=json('data/form-thumbnails.json');
const sha=b=>createHash('sha256').update(b).digest('hex');

test('all 23 catalogue thumbnails are unique, complete 16:9 WebPs within a lightweight budget',()=>{
 assert.equal(manifest.files.length,23);
 assert.deepEqual(new Set(manifest.files.map(f=>f.id)),new Set(forms.map(f=>f.id)));
 const hashes=new Set();let bytes=0;
 for(const f of forms){
  const s=manifest.files.find(s=>s.id===f.id),b=read(s.src.slice(1));
  assert.deepEqual(f.thumbnail,{src:s.src,width:960,height:540,alt:s.alt});
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.equal(b.toString('ascii',12,16),'VP8X');
  assert.equal(b.readUIntLE(24,3)+1,960);assert.equal(b.readUIntLE(27,3)+1,540);
  assert.equal(sha(b),s.assetSha256);assert.equal(b.length,s.bytes);
  assert.ok(b.length<40000,f.id+' should remain a thumbnail');
  hashes.add(sha(b));bytes+=b.length;
 }
 assert.equal(hashes.size,23);assert.ok(bytes<600000);
});

test('every thumbnail records an unchanged lesson endpoint and a fully visible rendered character',()=>{
 for(const s of manifest.files){
  const m=s.id==='taegeuk-1'?{...original,POSES}:createFormMotion(json(`data/lessons/${s.id}.json`));
  const p=m.poseAtIndex(s.poseIndex);
  const signature=JSON.stringify({pelvis:p.pelvis,yaw:p.yaw,chestYaw:p.chestYaw,arms:p.arms,legs:p.legs},(_,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v);
  assert.equal(sha(signature),s.sourcePoseSha256,s.id);
  assert.equal(s.renderProof.poseHash,s.sourcePoseSha256,s.id);
  assert.equal(m.POSES[s.poseIndex].name,s.poseName);assert.equal(s.poseNumber,s.poseIndex+1);
  const b=s.renderProof.alphaBounds;
  assert.ok(b.left>=8&&b.right<=1071&&b.top>=8&&b.bottom<=991&&b.count>10000,s.id+' clipping/blank check');
 }
});

test('the Taegeuk trigrams use the correct top-to-bottom line order; other series do not borrow them',()=>{
 const bits=['111','011','101','001','110','010','100','000'];
 for(const s of manifest.files){const n=/^taegeuk-(\d)$/.exec(s.id);assert.equal(s.trigram,n?bits[Number(n[1])-1]:null,s.id);}
});

test('thumbnail data rejects external sources, mismatched dimensions and missing alternative text',()=>{
 const f=forms[0];assert.equal(formRecordProblem(f),null);
 for(const patch of [{src:'https://example.com/image.webp'},{src:'/assets/forms/other.webp'},{width:500},{height:100},{alt:''}]){
  assert.match(formRecordProblem({...f,thumbnail:{...f.thumbnail,...patch}}),/thumbnail/);
 }
});
