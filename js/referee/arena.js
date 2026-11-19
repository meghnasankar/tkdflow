/* The referee practice arena: an octagonal contest area with its boundary line, two fighters (the lesson character)
   in blue (Chung) and red (Hong) trunk and head protectors, an orbit camera, and deterministic playback with
   slow motion and a contact marker. Everything is drawn from js/referee/scenarios.js. */
import * as THREE from '../../vendor/three/three.module.js';
import {createAvatar} from '../animation/avatar.js';
import {createLights} from '../animation/stage.js';
import {attachCameraInput} from '../animation/camera-input.js';
import {ARENA} from './scenarios.js';
import {solveFighter, stateAt, strikePoint, trunkShellPoint, HEAD, pastBoundary} from './fighter.js';
import {HOME, PRESETS, ZOOM, FOV, framing, cameraFor} from './framing.js';

export const COLOURS = Object.freeze({blue: 0x1d4fd8, red: 0xc8102e});

function octagon(apothem) {
  const r = apothem / Math.cos(Math.PI / 8), pts = [];
  for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; pts.push(new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r)); }
  return pts;
}
function arenaFloor() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({color: 0xd9dee3, roughness: .95}));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const outer = new THREE.Shape(octagon(ARENA.apothem + .9)), inner = new THREE.Shape(octagon(ARENA.apothem));
  const ring = new THREE.Mesh(new THREE.ShapeGeometry(outer), new THREE.MeshStandardMaterial({color: 0x9aa6b2, roughness: .9}));
  const field = new THREE.Mesh(new THREE.ShapeGeometry(inner), new THREE.MeshStandardMaterial({color: 0x2f5f9e, roughness: .9}));
  for (const [m, y] of [[ring, .002], [field, .004]]) { m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; g.add(m); }
  // The boundary line: a white band just outside the contest area (crossing it is what counts).
  const lineShape = new THREE.Shape(octagon(ARENA.apothem + .05)); lineShape.holes.push(new THREE.Path(octagon(ARENA.apothem)));
  const lineMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .6});
  const line = new THREE.Mesh(new THREE.ShapeGeometry(lineShape), lineMat); line.rotation.x = -Math.PI / 2; line.position.y = .006; g.add(line);
  g.userData.lineMaterial = lineMat;
  return g;
}

/* The trunk protector (hogu): the moulded shell from fighter.js (the same surface that scores contact) with dark
   binding along its top and bottom edges. Built in the body frame; placed each frame at the pelvis, turned by the
   chest yaw and lean exactly as the scoring geometry is. */
export const SHELL_SEGMENTS = Object.freeze({around: 72, up: 14});
export function trunkProtector(colour) {
  const {around: U, up: V} = SHELL_SEGMENTS, pos = [], index = [];
  for (let j = 0; j <= V; j++) for (let i = 0; i < U; i++) pos.push(...trunkShellPoint(i / U * Math.PI * 2, j / V));
  for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) { const a = j * U + i, b = j * U + (i + 1) % U, c = a + U, d = b + U; index.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(index); geo.computeVertexNormals();
  const group = new THREE.Group(); group.name = 'trunk-protector'; group.rotation.order = 'YXZ';
  const shell = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: colour, roughness: .5, side: THREE.DoubleSide}));
  shell.name = 'trunk-protector-shell'; shell.castShadow = true; group.add(shell);
  const trim = new THREE.MeshStandardMaterial({color: 0x1b1f24, roughness: .7});
  for (const v of [0, 1]) {
    const pts = []; for (let i = 0; i < U; i++) pts.push(new THREE.Vector3(...trunkShellPoint(i / U * Math.PI * 2, v, .002)));
    const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), U, .009, 8, true), trim);
    edge.name = v ? 'trunk-protector-top-binding' : 'trunk-protector-bottom-binding'; edge.castShadow = true; group.add(edge);
  }
  return group;
}
export function placeProtector(group, pose) {
  group.position.set(...pose.pelvis); group.rotation.set((pose.lean || 0) * Math.PI / 180, (pose.chestYaw ?? pose.yaw) * Math.PI / 180, 0);
}

/* The head protector, attached to the head bone (placed from the rest pose). */
function addHeadGear(root, colour) {
  root.updateMatrixWorld(true);
  const chest = root.getObjectByName('chest'), head = root.getObjectByName('head') || root.getObjectByName('neck');
  if (!chest || !head) return null;
  const chestPos = chest.getWorldPosition(new THREE.Vector3());          // the pelvis point the scoring areas hang from
  const hg = new THREE.Mesh(new THREE.SphereGeometry(HEAD.radius, 36, 20, Math.PI / 2 + .62, Math.PI * 2 - 1.24, 0, Math.PI * .62), new THREE.MeshStandardMaterial({color: colour, roughness: .5, side: THREE.DoubleSide}));
  hg.name = 'head-protector'; hg.castShadow = true;
  const local = new THREE.Vector3(chestPos.x + HEAD.centre[0], chestPos.y + HEAD.centre[1], chestPos.z + HEAD.centre[2]).applyMatrix4(new THREE.Matrix4().copy(head.matrixWorld).invert());
  hg.position.copy(local); hg.quaternion.copy(head.getWorldQuaternion(new THREE.Quaternion()).invert()); head.add(hg);
  return hg;
}

export function createArena(canvas, {onReady = () => {}, onError = () => {}, onFrame = () => {}} = {}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe8edf1); scene.fog = new THREE.Fog(0xe8edf1, 10, 22);
  const camera = new THREE.PerspectiveCamera(FOV, 1, .05, 60), floor = arenaFloor(); scene.add(floor); createLights(scene);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(.045, 20, 12), new THREE.MeshBasicMaterial({color: 0xffc83d, transparent: true, opacity: .9}));
  marker.visible = false; scene.add(marker);
  const fighters = {}, hogu = {}; let loaded = 0, scenario = null, time = 0, playing = false, rate = 1, last = 0, frame = 0;
  for (const side of ['blue', 'red']) {
    const actor = createAvatar({onReady() { addHeadGear(actor.root, COLOURS[side]); hogu[side].visible = true; if (++loaded === 2) { onReady(); request(); } }, onError});
    actor.root.name = side + '-fighter'; scene.add(actor.root); fighters[side] = actor;
    hogu[side] = trunkProtector(COLOURS[side]); hogu[side].name = side + '-trunk-protector'; hogu[side].visible = false; scene.add(hogu[side]);
  }
  // Orbit camera around the pair, framed for the whole exchange (js/referee/framing.js): drag to turn; pinch, the
  // wheel or the zoom buttons to look closer. At zoom 1 (the default, every preset and Reset view) both fighters stay
  // whole in the picture at any angle, from the first frame to the last.
  const view = {...HOME};
  let frameFit = null;
  const input = attachCameraInput(canvas, {onDrag(dAz, dEl) { view.azimuth += dAz; view.elevation = Math.max(2, Math.min(70, view.elevation + dEl)); request(); }, onPinch(f) { setZoom(view.zoom * f); }});
  function setZoom(z) { view.zoom = Math.max(ZOOM.min, Math.min(ZOOM.max, z)); request(); }
  function poses(t) { return {blue: solveFighter(stateAt(scenario.keys.blue, t)), red: solveFighter(stateAt(scenario.keys.red, t))}; }
  function draw() {
    frame = 0; if (!scenario) return;
    const p = poses(time);
    for (const side of ['blue', 'red']) { fighters[side].applyPose(p[side]); placeProtector(hogu[side], p[side]); }
    const cam = cameraFor(frameFit, view, camera.aspect);
    camera.position.set(...cam.position); camera.lookAt(...cam.target);
    // Contact marker: shown from the contact for 0.6 s; the boundary line turns red once a foot is over it.
    const c = scenario.contact;
    if (c && time >= scenario.tc && time <= scenario.tc + .6) { marker.position.set(...strikePoint(poses(scenario.tc)[c.by], c.limb)); marker.visible = true; marker.scale.setScalar(1 + 1.5 * (time - scenario.tc)); marker.material.opacity = .9 * (1 - (time - scenario.tc) / .6); }
    else marker.visible = false;
    const over = scenario.boundary && pastBoundary(p[scenario.boundary.fighter].legs[scenario.boundary.side], scenario.boundary.line) > 0;
    floor.userData.lineMaterial.color.set(over ? 0xff3b3b : 0xffffff);
    renderer.render(scene, camera);
    onFrame({time, playing, scenario});
  }
  function request() { if (!frame) frame = requestAnimationFrame(tick); }
  function tick(now) {
    frame = 0;
    if (playing) { const dt = last ? Math.min(.05, (now - last) / 1000) : 0; time = Math.min(scenario.duration, time + dt * rate); if (time >= scenario.duration) playing = false; }
    last = playing ? now : 0; draw(); if (playing) request();
  }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); request(); }
  const sizer = new ResizeObserver(resize); sizer.observe(canvas); resize();
  return {
    load(s) { scenario = s; frameFit = framing(s); time = 0; playing = false; request(); },
    play() { if (!scenario) return; if (time >= scenario.duration) time = 0; playing = true; last = 0; request(); },
    pause() { playing = false; request(); },
    replay() { time = 0; this.play(); },
    seek(t) { time = Math.max(0, Math.min(scenario?.duration || 0, t)); playing = false; request(); },
    setRate(r) { rate = r; },
    zoom(factor) { setZoom(view.zoom * factor); },
    resetView() { Object.assign(view, HOME); request(); },
    setView(name) { if (PRESETS[name]) Object.assign(view, PRESETS[name], {zoom: 1}); request(); },
    get state() { return {time, playing, rate, duration: scenario?.duration || 0, view: {...view}}; },
    get ready() { return loaded === 2; },
    destroy() { input.detach(); sizer.disconnect(); renderer.dispose(); }
  };
}
