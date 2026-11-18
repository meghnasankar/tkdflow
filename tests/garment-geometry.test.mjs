/* Avatar garment geometry: the faster builder must give byte-identical output to
   the frozen copy of the earlier builder, computed in this same JavaScript engine.
   No hash of the output is pinned, because another engine may legitimately
   compute the last bit of Math.atan2 or Math.hypot differently. No timing is
   asserted. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as product from '../js/animation/avatar-geometry.js';
import * as reference from './helpers/garment-reference.mjs';

const REFERENCE_SOURCE_SHA256='0d3fb7872a215b9fb31b57e2b8a169dc85b14bb9d02a7a92fb5998ac4cb5c21e';
const ATTRIBUTES=['position','normal','uv','skinIndex','skinWeight'];
const bytesOf=a=>Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength);

function assertSameGeometry(actual,expected,label){
 assert.deepEqual(Object.keys(actual.attributes),ATTRIBUTES,`${label}: attribute names and order`);
 assert.deepEqual(Object.keys(expected.attributes),ATTRIBUTES,`${label}: reference attribute names`);
 assert.equal(actual.index,null,`${label}: stays non-indexed, so triangle order is the vertex order`);
 assert.equal(expected.index,null);
 for(const name of ATTRIBUTES){
  const a=actual.attributes[name],e=expected.attributes[name];
  assert.equal(a.array.constructor,e.array.constructor,`${label} ${name}: array type`);
  assert.equal(a.constructor,e.constructor,`${label} ${name}: attribute class`);
  assert.equal(a.itemSize,e.itemSize,`${label} ${name}: item size`);
  assert.equal(a.count,e.count,`${label} ${name}: count`);
  assert.equal(a.normalized,e.normalized,`${label} ${name}: normalized flag`);
  assert.equal(a.array.length,e.array.length,`${label} ${name}: length`);
  const i=bytesOf(a).compare(bytesOf(e));
  if(i!==0){
   const diff=a.array.findIndex((v,k)=>!Object.is(v,e.array[k]));
   assert.fail(`${label} ${name}: bytes differ, first at element ${diff} (${a.array[diff]} vs ${e.array[diff]})`);
  }
 }
 assert.deepEqual(actual.drawRange,expected.drawRange,`${label}: draw range`);
 assert.ok(Object.is(actual.boundingSphere.radius,expected.boundingSphere.radius),`${label}: bounding sphere radius`);
 assert.deepEqual(actual.boundingSphere.center.toArray(),expected.boundingSphere.center.toArray(),`${label}: bounding sphere centre`);
}

for(const kind of ['jacket','trousers']){
 test(`${kind}: every attribute is byte-identical to the frozen reference`,()=>{
  const before=Object.keys(globalThis);
  assertSameGeometry(product.buildGarmentGeometry(kind),reference.buildGarmentGeometry(kind),kind);
  assert.deepEqual(Object.keys(globalThis),before,'no globals left behind');
 });
}

test('vertex counts match the published garments (63,504 and 49,992, as also measured in Chrome)',()=>{
 assert.equal(product.buildGarmentGeometry('jacket').attributes.position.count,63504);
 assert.equal(product.buildGarmentGeometry('trousers').attributes.position.count,49992);
});

test('other grid spacings stay byte-identical (the exported spacing argument)',()=>{
 for(const [kind,spacing] of [['jacket',.031],['trousers',.027],['jacket',.045],['trousers',.05]])
  assertSameGeometry(product.buildGarmentGeometry(kind,spacing),reference.buildGarmentGeometry(kind,spacing),`${kind} @${spacing}`);
});

test('builds are independent: no cache carries over between calls or garments',()=>{
 const first=product.buildGarmentGeometry('trousers',.04);
 product.buildGarmentGeometry('jacket',.04);
 assertSameGeometry(product.buildGarmentGeometry('trousers',.04),first,'trousers again');
});

test('garmentField and garmentWeights return exactly the reference values',()=>{
 const points=[[0,1.2,0],[-0,1.2,0],[0,1.2,-0],[-0,-0,-0],[.19,1.455,0],[-.49,1.455,.02],[.76,1.455,-.035],[.095,.48,0],[-.095,.12,.05],[.3,.3,.3],[-2,5,9],[1e-9,.9,-1e-9]];
 for(let i=0;i<400;i++)points.push([Math.sin(i*12.9898)*.85,.05+Math.abs(Math.sin(i*78.233))*1.5,Math.sin(i*37.719)*.16]);
 for(const kind of ['jacket','trousers'])for(const p of points){
  const a=product.garmentField(kind,p),e=reference.garmentField(kind,p);
  assert.ok(Object.is(a,e),`${kind} field at ${p}: ${a} vs ${e}`);
  assert.deepEqual(product.garmentWeights(kind,p),reference.garmentWeights(kind,p));
 }
});

test('same public exports as before',()=>{
 assert.deepEqual(Object.keys(product).sort(),Object.keys(reference).sort());
 assert.deepEqual(Object.keys(product).sort(),['buildGarmentGeometry','garmentField','garmentWeights']);
});

test('the frozen reference is unchanged and stays test-only',()=>{
 const text=readFileSync(new URL('./helpers/garment-reference.mjs',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 // Hash of the reference source text (not of any computed output). If the garment
 // look is changed on purpose, replace the reference and this hash together.
 assert.equal(createHash('sha256').update(text).digest('hex'),REFERENCE_SOURCE_SHA256,'tests/helpers/garment-reference.mjs was edited');
 const src=readFileSync(new URL('../js/animation/avatar-geometry.js',import.meta.url),'utf8');
 assert.doesNotMatch(src,/garment-reference/);
 const avatar=readFileSync(new URL('../js/animation/avatar.js',import.meta.url),'utf8');
 assert.doesNotMatch(avatar,/garment-reference/);
 assert.match(avatar,/import \{ buildGarmentGeometry \} from '\.\/avatar-geometry\.js';/);
});
