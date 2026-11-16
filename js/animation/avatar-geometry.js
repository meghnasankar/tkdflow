/* Connected garment surfaces in bind pose, with smooth skeletal weights. */
import * as THREE from '../../vendor/three/three.module.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u);};
function ellipsoid(p,c,r){const q=p.map((v,i)=>v-c[i]),k0=Math.hypot(...q.map((v,i)=>v/r[i])),k1=Math.hypot(...q.map((v,i)=>v/(r[i]*r[i])));return k1<1e-8?-Math.min(...r):k0*(k0-1)/k1;}
function capsule(p,a,b,r0,r1=r0){const ab=b.map((v,i)=>v-a[i]),ap=p.map((v,i)=>v-a[i]),u=clamp(ap.reduce((s,v,i)=>s+v*ab[i],0)/ab.reduce((s,v)=>s+v*v,0),0,1);return Math.hypot(...ap.map((v,i)=>v-ab[i]*u))-(r0+(r1-r0)*u);}
function union(a,b,k=.035){const h=clamp(.5+.5*(b-a)/k,0,1);return b+(a-b)*h-k*h*(1-h);}
export function garmentField(kind,p){
 let d;
 if(kind==='jacket'){
  d=union(ellipsoid(p,[0,1.23,0],[.18,.28,.103]),ellipsoid(p,[0,.99,0],[.177,.15,.108]),.055);
  d=union(d,capsule(p,[-.19,1.455,0],[.19,1.455,0],.052),.045);
  for(const sign of [-1,1]){d=union(d,capsule(p,[sign*.19,1.455,0],[sign*.49,1.455,0],.052,.044),.038);d=union(d,capsule(p,[sign*.49,1.455,0],[sign*.76,1.455,0],.044,.035),.025);}
 }else{
  d=ellipsoid(p,[0,.9,0],[.157,.14,.105]);
  for(const sign of [-1,1]){d=union(d,capsule(p,[sign*.095,.93,0],[sign*.095,.48,0],.072,.058),.035);d=union(d,capsule(p,[sign*.095,.48,0],[sign*.095,.12,0],.058,.05),.025);}
 }
 return d;
}
// Bone order: pelvis, chest, L upper/fore/wrist, R upper/fore/wrist,
// L thigh/shin/ankle, R thigh/shin/ankle, neck.
export function garmentWeights(kind,[x,y]){
 if(kind==='jacket'){
  const ax=Math.abs(x),arm=smooth(.135,.235,ax)*smooth(1.29,1.39,y),root=1-arm;
  const lower=smooth(.43,.55,ax),upperIndex=x>=0?2:5,lowerIndex=x>=0?3:6;
  const chest=smooth(.88,1.18,y);
  return {indices:[0,1,upperIndex,lowerIndex],weights:[root*(1-chest),root*chest,arm*(1-lower),arm*lower]};
 }
 const leg=smooth(.99,.80,y),lower=1-smooth(.41,.55,y),upperIndex=x>=0?8:11,lowerIndex=x>=0?9:12;
 return {indices:[0,upperIndex,lowerIndex,0],weights:[1-leg,leg*(1-lower),leg*lower,0]};
}
const CORNERS=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const TETS=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const EDGES=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
export function buildGarmentGeometry(kind,spacing=.020){
 const min=kind==='jacket'?[-.81,.82,-.155]:[-.225,.055,-.15],max=kind==='jacket'?[.81,1.54,.155]:[.225,1.05,.15];
 const dims=min.map((v,i)=>Math.ceil((max[i]-v)/spacing)),step=min.map((v,i)=>(max[i]-v)/dims[i]);
 const positions=[],normals=[],uvs=[],indices=[],weights=[];
 const field=p=>garmentField(kind,p);
 const gradient=p=>{const h=.001,g=[0,1,2].map(i=>{const a=[...p],b=[...p];a[i]+=h;b[i]-=h;return field(a)-field(b);});const d=Math.hypot(...g)||1;return g.map(v=>v/d);};
 const emit=p=>{positions.push(...p);normals.push(...gradient(p));uvs.push(p[0]*5+p[2]*.5,p[1]*5);const skin=garmentWeights(kind,p);indices.push(...skin.indices);weights.push(...skin.weights);};
 for(let x=0;x<dims[0];x++)for(let y=0;y<dims[1];y++)for(let z=0;z<dims[2];z++){
  const points=CORNERS.map(c=>[min[0]+(x+c[0])*step[0],min[1]+(y+c[1])*step[1],min[2]+(z+c[2])*step[2]]),values=points.map(field);
  if(values.every(v=>v>=0)||values.every(v=>v<0))continue;
  for(const tet of TETS){
   const polygon=[];
   for(const [a,b]of EDGES){const ia=tet[a],ib=tet[b];if((values[ia]<0)===(values[ib]<0))continue;const u=values[ia]/(values[ia]-values[ib]),p=points[ia].map((v,i)=>v+(points[ib][i]-v)*u);if(!polygon.some(q=>Math.hypot(...p.map((v,i)=>v-q[i]))<1e-8))polygon.push(p);}
   if(polygon.length<3)continue;
   const centre=[0,1,2].map(i=>polygon.reduce((s,p)=>s+p[i],0)/polygon.length),n=new THREE.Vector3(...gradient(centre)),axis=Math.abs(n.x)<.8?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),u=new THREE.Vector3().crossVectors(axis,n).normalize(),v=new THREE.Vector3().crossVectors(n,u);
   polygon.sort((a,b)=>{const pa=new THREE.Vector3(...a).sub(new THREE.Vector3(...centre)),pb=new THREE.Vector3(...b).sub(new THREE.Vector3(...centre));return Math.atan2(pa.dot(v),pa.dot(u))-Math.atan2(pb.dot(v),pb.dot(u));});
   for(let i=1;i<polygon.length-1;i++){emit(polygon[0]);emit(polygon[i]);emit(polygon[i+1]);}
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.computeBoundingSphere();
 return geometry;
}
