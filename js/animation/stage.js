/* Shared 3D training mat and lighting for the illustrated character rig. */
import * as THREE from '../../vendor/three/three.module.js';

/** Training mat and floor. The floor never moves. */
export function createStage({size=3.2}={}) {
  const group = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: 0xe2e7eb, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  group.add(floor);
  const border = new THREE.Mesh(new THREE.PlaneGeometry(size+.08, size+.08), new THREE.MeshStandardMaterial({ color: 0x9d3448, roughness: 0.9 }));
  border.rotation.x = -Math.PI / 2; border.position.set(0.15, 0.002, -0.05); border.receiveShadow = true;
  group.add(border);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x3d5870, roughness: 0.95 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(0.15, 0.004, -0.05); mat.receiveShadow = true;
  group.add(mat);
  const lines=[];
  for(let v=-size/2+.8;v<size/2;v+=.8)lines.push(v+.15,.005,-size/2-.05,v+.15,.005,size/2-.05,-size/2+.15,.005,v-.05,size/2+.15,.005,v-.05);
  const seams=new THREE.BufferGeometry();seams.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  group.add(new THREE.LineSegments(seams,new THREE.LineBasicMaterial({color:0xb4c6d5,transparent:true,opacity:.11})));
  return group;
}

export function createLights(scene) {
  scene.add(new THREE.HemisphereLight(0xf5f8ff, 0x6f8190, 1.7));
  const key = new THREE.DirectionalLight(0xfff2e5, 1.9);
  key.position.set(-1.5, 7, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2; key.shadow.camera.right = 2;
  key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -1;
  key.shadow.camera.near = 1; key.shadow.camera.far = 12;
  key.shadow.bias = -0.0002; key.shadow.normalBias = 0.005; key.shadow.radius = 6; key.shadow.blurSamples=8;
  key.target.position.set(0.15, 0.8, -0.05);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xd8e6ff, 0.8);
  rim.position.set(-3, 3.2, -3.5);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffeee6, 0.75);
  fill.position.set(-3, 1.5, 2.5);
  scene.add(fill);
}

export function createContactShadows(){
  const root=new THREE.Group(),c=document.createElement('canvas');c.width=c.height=64;
  const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(10,21,32,.5)');gradient.addColorStop(.45,'rgba(10,21,32,.22)');gradient.addColorStop(1,'rgba(10,21,32,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const map=new THREE.CanvasTexture(c);
  const feet={};
  for(const side of ['left','right']){
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:.6}));
    shadow.rotation.x=-Math.PI/2;root.add(shadow);feet[side]=shadow;
  }
  return {root,update(pose){
    for(const side of ['left','right']){
      const leg=pose.legs[side],s=feet[side],yaw=leg.yaw*Math.PI/180,h=Math.max(0,leg.ankle[1]-.07);
      s.position.set(leg.ankle[0]+Math.sin(yaw)*.055,.007,leg.ankle[2]+Math.cos(yaw)*.055);
      s.rotation.z=yaw;s.scale.set(.20+h,.33+h,1);s.material.opacity=.65/(1+15*h);
    }
  }};
}
