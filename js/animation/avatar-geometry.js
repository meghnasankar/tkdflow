/* Connected garment surfaces in bind pose, with smooth skeletal weights.
   Built once per garment on every lesson page. The construction reuses work
   without changing any result: field values are cached per lattice point,
   gradients are cached per exact point, sort angles are computed once per point,
   and the distance functions do the same arithmetic in the same order as the
   array versions they replaced. tests/garment-geometry.test.mjs requires
   byte-identical output against a frozen copy of the earlier builder. */
import * as THREE from '../../vendor/three/three.module.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u);};
// Same operations as q=p-c, Math.hypot(...q/r), Math.hypot(...q/(r*r)), Math.min(...r).
function ellipsoid(px,py,pz,c,r){const q0=px-c[0],q1=py-c[1],q2=pz-c[2],k0=Math.hypot(q0/r[0],q1/r[1],q2/r[2]),k1=Math.hypot(q0/(r[0]*r[0]),q1/(r[1]*r[1]),q2/(r[2]*r[2]));return k1<1e-8?-Math.min(r[0],r[1],r[2]):k0*(k0-1)/k1;}
// Same operations as the reduce() dot products (left to right, starting from 0).
function capsule(px,py,pz,a,b,r0,r1=r0){const ab0=b[0]-a[0],ab1=b[1]-a[1],ab2=b[2]-a[2],ap0=px-a[0],ap1=py-a[1],ap2=pz-a[2],u=clamp((((0+ap0*ab0)+ap1*ab1)+ap2*ab2)/(((0+ab0*ab0)+ab1*ab1)+ab2*ab2),0,1);return Math.hypot(ap0-ab0*u,ap1-ab1*u,ap2-ab2*u)-(r0+(r1-r0)*u);}
function union(a,b,k=.035){const h=clamp(.5+.5*(b-a)/k,0,1);return b+(a-b)*h-k*h*(1-h);}
function fieldAt(kind,px,py,pz){
 let d;
 if(kind==='jacket'){
  d=union(ellipsoid(px,py,pz,[0,1.23,0],[.18,.28,.103]),ellipsoid(px,py,pz,[0,.99,0],[.177,.15,.108]),.055);
  d=union(d,capsule(px,py,pz,[-.19,1.455,0],[.19,1.455,0],.052),.045);
  for(const sign of [-1,1]){d=union(d,capsule(px,py,pz,[sign*.19,1.455,0],[sign*.49,1.455,0],.052,.044),.038);d=union(d,capsule(px,py,pz,[sign*.49,1.455,0],[sign*.76,1.455,0],.044,.035),.025);}
 }else{
  d=ellipsoid(px,py,pz,[0,.9,0],[.157,.14,.105]);
  for(const sign of [-1,1]){d=union(d,capsule(px,py,pz,[sign*.095,.93,0],[sign*.095,.48,0],.072,.058),.035);d=union(d,capsule(px,py,pz,[sign*.095,.48,0],[sign*.095,.12,0],.058,.05),.025);}
 }
 return d;
}
export function garmentField(kind,p){return fieldAt(kind,p[0],p[1],p[2]);}
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
// Exact cache key: the raw bits of the three coordinates, so values that are
// equal but differently signed (0 and -0) never share an entry.
const KEY_BITS=new Float64Array(3),KEY_HALVES=new Uint16Array(KEY_BITS.buffer);
function pointKey(p){
 KEY_BITS[0]=p[0];KEY_BITS[1]=p[1];KEY_BITS[2]=p[2];const k=KEY_HALVES;
 return String.fromCharCode(k[0],k[1],k[2],k[3],k[4],k[5],k[6],k[7],k[8],k[9],k[10],k[11]);
}
export function buildGarmentGeometry(kind,spacing=.020){
 const min=kind==='jacket'?[-.81,.82,-.155]:[-.225,.055,-.15],max=kind==='jacket'?[.81,1.54,.155]:[.225,1.05,.15];
 const dims=min.map((v,i)=>Math.ceil((max[i]-v)/spacing)),step=min.map((v,i)=>(max[i]-v)/dims[i]);
 const positions=[],normals=[],uvs=[],indices=[],weights=[];
 // Same steps as perturbing copies of p by +h and -h, then dividing by Math.hypot.
 const h=.001,gradients=new Map();
 const gradient=p=>{
  const key=pointKey(p);let g=gradients.get(key);if(g)return g;
  const px=p[0],py=p[1],pz=p[2];
  const gx=fieldAt(kind,px+h,py,pz)-fieldAt(kind,px-h,py,pz),gy=fieldAt(kind,px,py+h,pz)-fieldAt(kind,px,py-h,pz),gz=fieldAt(kind,px,py,pz+h)-fieldAt(kind,px,py,pz-h);
  const d=Math.hypot(gx,gy,gz)||1;g=[gx/d,gy/d,gz/d];gradients.set(key,g);return g;
 };
 const emit=p=>{positions.push(...p);normals.push(...gradient(p));uvs.push(p[0]*5+p[2]*.5,p[1]*5);const skin=garmentWeights(kind,p);indices.push(...skin.indices);weights.push(...skin.weights);};
 // Field value at every lattice point, once. min+k*step with an integer k is the
 // same number as min+(x+c)*step for each cell corner that shares the point.
 const NY=dims[1]+1,NZ=dims[2]+1,lattice=new Float64Array((dims[0]+1)*NY*NZ);
 for(let x=0;x<=dims[0];x++)for(let y=0;y<NY;y++)for(let z=0;z<NZ;z++)lattice[(x*NY+y)*NZ+z]=fieldAt(kind,min[0]+x*step[0],min[1]+y*step[1],min[2]+z*step[2]);
 for(let x=0;x<dims[0];x++)for(let y=0;y<dims[1];y++)for(let z=0;z<dims[2];z++){
  const values=CORNERS.map(c=>lattice[((x+c[0])*NY+(y+c[1]))*NZ+(z+c[2])]);
  if(values.every(v=>v>=0)||values.every(v=>v<0))continue;
  const points=CORNERS.map(c=>[min[0]+(x+c[0])*step[0],min[1]+(y+c[1])*step[1],min[2]+(z+c[2])*step[2]]);
  for(const tet of TETS){
   const polygon=[];
   for(const [a,b]of EDGES){const ia=tet[a],ib=tet[b];if((values[ia]<0)===(values[ib]<0))continue;const u=values[ia]/(values[ia]-values[ib]),p=points[ia].map((v,i)=>v+(points[ib][i]-v)*u);if(!polygon.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<1e-8))polygon.push(p);}
   if(polygon.length<3)continue;
   const centre=[0,1,2].map(i=>polygon.reduce((s,p)=>s+p[i],0)/polygon.length),n=new THREE.Vector3(...gradient(centre)),axis=Math.abs(n.x)<.8?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),u=new THREE.Vector3().crossVectors(axis,n).normalize(),v=new THREE.Vector3().crossVectors(n,u);
   // One angle per point, with the arithmetic of Vector3 sub() then dot().
   const angles=new Map();
   for(const q of polygon){const qx=q[0]-centre[0],qy=q[1]-centre[1],qz=q[2]-centre[2];angles.set(q,Math.atan2(qx*v.x+qy*v.y+qz*v.z,qx*u.x+qy*u.y+qz*u.z));}
   polygon.sort((a,b)=>angles.get(a)-angles.get(b));
   for(let i=1;i<polygon.length-1;i++){emit(polygon[0]);emit(polygon[i]);emit(polygon[i+1]);}
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.computeBoundingSphere();
 return geometry;
}
