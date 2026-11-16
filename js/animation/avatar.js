/* A connected skinned 3D avatar with a locally modeled Indian girl face.
   The existing Nano Banana atlas supplies cotton texture only. No photograph
   is placed on the face and no head images are swapped during playback. */
import * as THREE from '../../vendor/three/three.module.js';
import { BODY } from './motion-math.js';
import { MEDIA } from './media.js';
import { buildGarmentGeometry } from './avatar-geometry.js';
const RAD=Math.PI/180;
const material=(colour,roughness=.8)=>new THREE.MeshStandardMaterial({color:colour,roughness});
function mesh(geo,mat){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;return m;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function texture(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function asset(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
function uniformTexture(image){const c=canvas(128,128),ctx=c.getContext('2d');ctx.drawImage(image,220,1160,65,95,0,0,128,128);const t=texture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
function beltTexture(label,emblem){const c=canvas(256,1024),ctx=c.getContext('2d');ctx.fillStyle='#13161b';ctx.fillRect(0,0,256,1024);if(label){ctx.save();ctx.translate(130,130);ctx.rotate(Math.PI/2);ctx.font='bold 180px Georgia,serif';ctx.fillStyle='#eac979';ctx.fillText(label,0,0);ctx.restore();}else{ctx.drawImage(emblem,30,280,196,148);ctx.fillStyle='#eac979';ctx.fillRect(30,855,196,18);ctx.fillRect(30,900,196,18);}return texture(c);}
export function faceDepth(x,y){
 const ny=y/.125,jaw=1-.12*THREE.MathUtils.smoothstep(-ny,.15,.85);
 const nz=Math.sqrt(Math.max(0,1-ny*ny-(x/(.088*jaw))**2));
 const g=(cx,cy,wx,wy)=>Math.exp(-(((x-cx)/wx)**2+((y-cy)/wy)**2));
 return nz*.082+nz*nz*(.014*g(0,-.015,.015,.024)+.005*g(0,.015,.013,.038)
  +.006*(g(.044,-.019,.025,.030)+g(-.044,-.019,.025,.030))
  -.003*(g(.034,.009,.018,.011)+g(-.034,.009,.018,.011))
  +.005*g(0,-.063,.028,.013)+.004*g(0,-.096,.027,.018));
}

export function buildFacialFeatures(skin){
 const group=new THREE.Group();group.name='sculpted-facial-features';
 const eyeWhite=material(0xebe4db,.52),irisMat=material(0x483025,.68),pupilMat=material(0x171219,.75);
 const browMat=material(0x2a1d1a,.84),lipMat=material(0x9b6254,.86),mouthMat=material(0x6a4238,.9);
 const shine=new THREE.MeshBasicMaterial({color:0xfff6eb});
 const curveMesh=(points,radius,mat,name)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,faceDepth(x,y)+.0015)));
  const m=mesh(new THREE.TubeGeometry(curve,24,radius,6,false),mat);m.name=name;group.add(m);return m;
 };
 for(const sign of [-1,1]){
  const eye=new THREE.Group();eye.name=sign===1?'left-eye':'right-eye';
  const cx=sign*.034,cy=.011,cz=faceDepth(cx,cy);
  eye.position.set(cx,cy,cz);group.add(eye);
  const conform=(geometry,offset)=>{
   const p=geometry.attributes.position;
   for(let i=0;i<p.count;i++)p.setZ(i,faceDepth(cx+p.getX(i),cy+p.getY(i))-cz+offset);
   geometry.computeVertexNormals();return geometry;
  };
  // Almond-shaped openings, not enlarged spherical cartoon eyeballs.
  const shape=new THREE.Shape();shape.moveTo(-.0145,0);
  shape.quadraticCurveTo(0,.011,.0145,0);shape.quadraticCurveTo(0,-.007,-.0145,0);
  const white=mesh(conform(new THREE.ShapeGeometry(shape,24),.0016),eyeWhite);eye.add(white);
  const iris=mesh(conform(new THREE.CircleGeometry(.0046,32),.0020),irisMat);eye.add(iris);
  const pupil=mesh(conform(new THREE.CircleGeometry(.00225,24),.0023),pupilMat);eye.add(pupil);
  const lightGeo=new THREE.CircleGeometry(.0008,12);lightGeo.translate(-.0012,.0017,0);
  const light=mesh(conform(lightGeo,.0026),shine);eye.add(light);
  curveMesh([[sign*.019,.031],[sign*.035,.036],[sign*.053,.031]],.0018,browMat,sign===1?'left-brow':'right-brow');
  const lid=new THREE.CatmullRomCurve3([[-.0145,0],[0,.0055],[.0145,0]].map(([x,y])=>new THREE.Vector3(x,y,faceDepth(cx+x,cy+y)-cz+.0019)));
  eye.add(mesh(new THREE.TubeGeometry(lid,20,.00065,6,false),browMat));
 }
 curveMesh([[-.020,-.058],[-.007,-.060],[0,-.059],[.007,-.060],[.020,-.058]],.00135,lipMat,'upper-lip');
 curveMesh([[-.020,-.058],[0,-.064],[.020,-.058]],.0018,lipMat,'lower-lip');
 curveMesh([[-.019,-.058],[0,-.061],[.019,-.058]],.00065,mouthMat,'gentle-smile');
 return group;
}

export function buildHeadGeometry(){
 const g=new THREE.SphereGeometry(1,72,56),a=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<a.count;i++){
  const nx=a.getX(i),ny=a.getY(i),nz=a.getZ(i);
  const jaw=1-.12*THREE.MathUtils.smoothstep(-ny,.15,.85);
  const x=nx*.088*jaw,y=ny*.125;let z=nz*.082;
  if(nz>0)z=faceDepth(x,y);
  a.setXYZ(i,x,y,z);
  // UVs are retained for geometry compatibility; the skin has no face image.
  uv.setXY(i,THREE.MathUtils.clamp(.5+x/.184,0,1),THREE.MathUtils.clamp(.5+y/.25,0,1));
 }
 // Face art only belongs to the front half; back of head uses plain skin/hair.
 g.clearGroups();const ix=g.index,front=[],back=[];
 for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],z=tri.reduce((sum,j)=>sum+a.getZ(j),0)/3;(z>=0?front:back).push(...tri);}
 g.setIndex([...front,...back]);g.addGroup(0,front.length,0);g.addGroup(front.length,back.length,1);
 g.computeVertexNormals();return g;
}
export function buildHairGeometry(){
 const vertices=[],indices=[],rings=20,sides=48;
 for(let row=0;row<=rings;row++)for(let col=0;col<=sides;col++){
  const phi=col/sides*Math.PI*2,front=Math.max(0,Math.sin(phi)),back=Math.max(0,-Math.sin(phi));
  // Keep side hair ABOVE the cheek and jaw. The old spherical cap extended
  // around the lower face, reading as a dark beard from oblique views.
  const ymin=.06+.59*front**.7-.30*back**1.4,theta=row/rings*Math.acos(ymin);
  vertices.push(Math.cos(phi)*Math.sin(theta)*.091,Math.cos(theta)*.131,Math.sin(phi)*Math.sin(theta)*.086);
 }
 for(let r=0;r<rings;r++)for(let c=0;c<sides;c++){const a=r*(sides+1)+c,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function createAvatar({onReady,onError}={}){
 const root=new THREE.Group();root.name='connected-meghna-avatar';let rig=null;
 Promise.all([asset(MEDIA.character.src),asset(MEDIA.emblem.src)]).then(([atlas,emblem])=>{
  const cloth=material(0xf3f2ef,.88);cloth.map=uniformTexture(atlas);cloth.map.anisotropy=4;
  const skin=material(0xb68162,.78),hair=material(0x181316,.72),black=material(0x12151b,.75);
  skin.emissive.set(0xb68162);skin.emissiveIntensity=.035;
  const bones=[];const bone=(name,parent,position)=>{const b=new THREE.Bone();b.name=name;b.position.set(...position);if(parent)parent.add(b);bones.push(b);return b;};
  const pelvis=bone('pelvis',null,[0,1,0]),chest=bone('chest',pelvis,[0,0,0]);root.add(pelvis);
  const arms={};for(const [side,sign]of [['left',1],['right',-1]]){const upper=bone(side+'-upper',chest,[sign*.19,.455,0]),lower=bone(side+'-forearm',upper,[sign*BODY.upperArm,0,0]),wrist=bone(side+'-wrist',lower,[sign*BODY.forearm,0,0]);arms[side]={upper,lower,wrist,sign};}
  const legs={};for(const [side,sign]of [['left',1],['right',-1]]){const upper=bone(side+'-thigh',pelvis,[sign*.095,-.07,0]),lower=bone(side+'-shin',upper,[0,-BODY.thigh,0]),ankle=bone(side+'-ankle',lower,[0,-BODY.shin,0]);legs[side]={upper,lower,ankle};}
  const neck=bone('neck',chest,[0,.545,0]);root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);
  for(const kind of ['jacket','trousers']){const garment=new THREE.SkinnedMesh(buildGarmentGeometry(kind),cloth);garment.name='connected-'+kind;garment.castShadow=true;garment.receiveShadow=true;root.add(garment);garment.bind(skeleton,new THREE.Matrix4());garment.normalizeSkinWeights();}
  const neckSkin=mesh(new THREE.CylinderGeometry(.041,.049,.062,24),skin);neckSkin.name='natural-neck';neckSkin.position.y=-.016;neck.add(neckSkin);
  const head=new THREE.Group();head.name='modeled-girl-head';head.position.y=.098;neck.add(head);
  const headSkin=skin.clone();headSkin.emissiveIntensity=.16;
  const faceSurface=mesh(buildHeadGeometry(),[headSkin,headSkin]);faceSurface.name='skin-head';faceSurface.receiveShadow=false;
  head.add(faceSurface,buildFacialFeatures(skin));
  const cap=mesh(buildHairGeometry(),hair);cap.name='scalp-hair';cap.position.y=.098;neck.add(cap);
  const strandMat=material(0x2b2223,.82);
  for(const sign of [-1,1])for(let i=0;i<7;i++){
   const s=(i+1)/8,x=sign*(.015+.065*s);
   const points=[[x,.086-.048*s,.064-.032*s],[x*.8,.126-.033*s,.017],[x*.40,.113-.025*s,-.049],[sign*.008,.079,-.075]];
   const strand=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
   const m=mesh(new THREE.TubeGeometry(strand,20,.00055,4,false),strandMat);m.position.y=.098;neck.add(m);
  }
  for(const sign of [-1,1]){const ear=mesh(new THREE.SphereGeometry(1,20,14),skin);ear.scale.set(.010,.021,.013);ear.position.set(sign*.087,.088,-.008);neck.add(ear);}
  const ponyCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.173,-.070),new THREE.Vector3(0,.175,-.115),new THREE.Vector3(.012,.050,-.17),new THREE.Vector3(.020,-.110,-.16),new THREE.Vector3(.025,-.180,-.18)]);
  const ponyGeo=new THREE.TubeGeometry(ponyCurve,40,.024,12,false),pos=ponyGeo.attributes.position;
  for(let r=0;r<=40;r++){const t=r/40,c=ponyCurve.getPointAt(t),factor=1.25-.85*t;for(let s=0;s<=12;s++){const i=r*13+s;pos.setXYZ(i,c.x+(pos.getX(i)-c.x)*factor,c.y+(pos.getY(i)-c.y)*factor,c.z+(pos.getZ(i)-c.z)*factor);}}
  ponyGeo.computeVertexNormals();neck.add(mesh(ponyGeo,hair));
  const tie=mesh(new THREE.TorusGeometry(.024,.0045,8,24),black);tie.position.set(0,.170,-.083);neck.add(tie);
  // A real 3D collar and belt remain on the shared chest bone through the turn.
  for(const pts of [[[-.062,.51,.05],[-.035,.43,.105],[.005,.34,.11]],[[.062,.51,.05],[.035,.43,.105],[.005,.34,.11]]]){
   const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),positions=[],indices=[];
   for(let i=0;i<=24;i++){
    const p=curve.getPointAt(i/24),t=curve.getTangentAt(i/24),n=new THREE.Vector3(-t.y,t.x,0).normalize().multiplyScalar(.0135);
    positions.push(p.x-n.x,p.y-n.y,p.z,p.x+n.x,p.y+n.y,p.z);
    if(i<24){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
   const collar=black.clone();collar.side=THREE.DoubleSide;chest.add(mesh(g,collar));
  }
  const band=mesh(new THREE.CylinderGeometry(.179,.179,.049,48,1,true),black);band.scale.z=.63;band.position.y=.005;chest.add(band);
  const knot=mesh(new THREE.BoxGeometry(.055,.043,.028),black);knot.position.set(0,-.003,.122);chest.add(knot);
  for(const [i,label]of [[0,MEDIA.character.beltName],[1,null]]){const printed=material(0xffffff,.8);printed.map=beltTexture(label,emblem);const tail=mesh(new THREE.BoxGeometry(.036,.25,.009),[black,black,black,black,printed,black]);tail.position.set(i?-.034:.028,-.145,.12);tail.rotation.z=i?-.13:.10;chest.add(tail);}
  for(const arm of Object.values(arms)){
   const {wrist,sign}=arm;arm.fingers=[];
   const palm=mesh(new THREE.SphereGeometry(1,24,16),skin);palm.scale.set(.048,.034,.039);palm.position.set(sign*.044,0,0);wrist.add(palm);
   for(let i=0;i<4;i++){const knuckle=mesh(new THREE.SphereGeometry(.012,12,8),skin);knuckle.position.set(sign*.078,.003,(i-1.5)*.016);wrist.add(knuckle);arm.fingers.push(knuckle);}
   const thumb=mesh(new THREE.SphereGeometry(1,16,12),skin);thumb.scale.set(.025,.017,.018);thumb.position.set(sign*.035,-.026,.022);wrist.add(thumb);
  }
  for(const leg of Object.values(legs)){
   const footRoot=new THREE.Group();leg.ankle.add(footRoot);leg.footRoot=footRoot;
   const ankleSkin=mesh(new THREE.CylinderGeometry(.031,.035,.08,20),skin);ankleSkin.position.y=.025;footRoot.add(ankleSkin);
   const foot=mesh(new THREE.SphereGeometry(1,28,18),skin);foot.scale.set(.049,.035,.12);foot.position.set(0,-.035,.055);footRoot.add(foot);
   for(let i=0;i<5;i++){const toe=mesh(new THREE.SphereGeometry(1,12,8),skin);toe.scale.set(.010,.015,.021);toe.position.set((i-2)*.018,-.038,.145-Math.abs(i-1)*.005);footRoot.add(toe);}
  }
  rig={pelvis,chest,arms,legs,neck,skeleton};root.userData.source=MEDIA.character.src;root.userData.faceSource='modeled-features-no-photo';root.userData.rig='connected-skinned-3d';root.userData.vertices=root.children.filter(x=>x.isSkinnedMesh).reduce((s,m)=>s+m.geometry.attributes.position.count,0);onReady?.();
 }).catch(onError);
 const axisY=new THREE.Vector3(0,1,0),rootQ=new THREE.Quaternion(),chestQ=new THREE.Quaternion(),upperQ=new THREE.Quaternion(),lowerQ=new THREE.Quaternion();
 const direction=(a,b)=>new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize();
 const frame=new THREE.Matrix4(),xAxis=new THREE.Vector3(),yAxis=new THREE.Vector3(),zAxis=new THREE.Vector3();
 const armFrame=(along,normal,sign,q)=>{
  xAxis.copy(along).multiplyScalar(sign);zAxis.copy(normal).multiplyScalar(sign).normalize();
  yAxis.crossVectors(zAxis,xAxis).normalize();zAxis.crossVectors(xAxis,yAxis).normalize();
  q.setFromRotationMatrix(frame.makeBasis(xAxis,yAxis,zAxis));
 };
 const legFrame=(along,lateral,q)=>{
  yAxis.copy(along).negate();xAxis.copy(lateral).addScaledVector(yAxis,-lateral.dot(yAxis)).normalize();
  zAxis.crossVectors(xAxis,yAxis).normalize();xAxis.crossVectors(yAxis,zAxis).normalize();
  q.setFromRotationMatrix(frame.makeBasis(xAxis,yAxis,zAxis));
 };
 function applyPose(pose){if(!rig)return;
  const {pelvis,chest,arms,legs,neck}=rig;pelvis.position.set(...pose.pelvis);rootQ.setFromAxisAngle(axisY,pose.yaw*RAD);pelvis.quaternion.copy(rootQ);
  chestQ.setFromEuler(new THREE.Euler(pose.lean*RAD,pose.chestYaw*RAD,0,'YXZ'));chest.quaternion.copy(rootQ).invert().multiply(chestQ);neck.quaternion.setFromAxisAngle(axisY,pose.headYaw*RAD);
  for(const side of ['left','right']){
   const a=arms[side],p=pose.arms[side],upper=direction(p.shoulder,p.elbow),lower=direction(p.elbow,p.wrist),normal=new THREE.Vector3().crossVectors(upper,lower).normalize();
   // The elbow plane supplies a common roll frame for sleeve, forearm and fist.
   // Shortest-arc rotations alone left the hands twisting independently.
   armFrame(upper,normal,a.sign,upperQ);armFrame(lower,normal,a.sign,lowerQ);
   a.upper.quaternion.copy(chestQ).invert().multiply(upperQ);a.lower.quaternion.copy(upperQ).invert().multiply(lowerQ);a.wrist.quaternion.setFromAxisAngle(new THREE.Vector3(a.sign,0,0),(p.roll||0)*RAD);
   for(let i=0;i<a.fingers.length;i++){const finger=a.fingers[i],open=THREE.MathUtils.clamp(p.open||0,0,1);finger.scale.x=1+open*(1.9-Math.abs(i-1.5)*.2);finger.position.x=a.sign*(.078+.016*open);}
   const l=legs[side],leg=pose.legs[side],lateral=leg.lateral?new THREE.Vector3(...leg.lateral):new THREE.Vector3(1,0,0).applyAxisAngle(axisY,leg.yaw*RAD);
   legFrame(direction(leg.hip,leg.knee),lateral,upperQ);legFrame(direction(leg.knee,leg.ankle),lateral,lowerQ);
   l.upper.quaternion.copy(rootQ).invert().multiply(upperQ);l.lower.quaternion.copy(upperQ).invert().multiply(lowerQ);
   const footQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(leg.pitch*RAD,leg.yaw*RAD,0,'YXZ'));l.ankle.quaternion.copy(lowerQ).invert().multiply(footQ);
  }
  root.updateMatrixWorld(true);rig.skeleton.update();
 }
 return {root,applyPose,get ready(){return !!rig;}};
}
