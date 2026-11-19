/* Referee practice: the decisions match an independent table written from the rule texts; the 3D exchanges show
   what the decision rests on (contact lands on the scoring area at the stated time, a miss misses, a foot crosses the
   boundary, a fighter falls); every scenario is deterministic and answerable from its text alone. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROFILES, CITES, decide, countAfter} from '../js/referee/rules.js';
import {SCENARIOS, ARENA} from '../js/referee/scenarios.js';
import {solveFighter, stateAt, strikePoint, distanceToTarget, pastBoundary, trunkShellPoint, trunkRadius, trunkTop, toBody, TRUNK} from '../js/referee/fighter.js';
import {trunkProtector, placeProtector} from '../js/referee/arena.js';
import {framing, cameraFor, project, legacyCamera, PRESETS, HOME, ZOOM} from '../js/referee/framing.js';
import {BODY, len, sub} from '../js/animation/motion-math.js';

/* Written from WT Art. 12–14 (Nov 2026) and AAU Art. 9, 11, 22, 23 (eff. 11-01-2026), independently of rules.js. */
const EXPECTED = {
  'wt-trunk-kick': {blue: 2, red: 0}, 'wt-head-kick': {blue: 3, red: 0}, 'wt-punch': {blue: 1, red: 0},
  'wt-turning-trunk': {blue: 4, red: 0}, 'wt-turning-head': {blue: 6, red: 0}, 'wt-no-pss': {blue: 0, red: 0},
  'wt-hand-head': {blue: 1, red: 0}, 'wt-hand-head-last10': {blue: 1, red: 0}, 'wt-below-waist': {blue: 1, red: 0},
  'wt-boundary': {blue: 1, red: 0}, 'wt-boundary-last10': {blue: 2, red: 0}, 'wt-pushed-out': {blue: 0, red: 1},
  'wt-turning-then-fall': {blue: 4, red: 0}, 'aau-grassroot-head-touch': {blue: 0, red: 1},
  'aau-grassroot-head-miss': {blue: 0, red: 0}, 'aau-youth-turning-head': {blue: 3, red: 0}
};
const pose = (s, who, t) => solveFighter(stateAt(s.keys[who], t));

test('16 scenarios across the three dated profiles, each with exactly one correct answer from the rules', () => {
  assert.equal(SCENARIOS.length, 16);
  assert.deepEqual(new Set(SCENARIOS.map(s => s.profile)), new Set(Object.keys(PROFILES)));
  assert.deepEqual(SCENARIOS.map(s => s.id).sort(), Object.keys(EXPECTED).sort());
  for (const s of SCENARIOS) {
    const d = decide(s.profile, s.facts);
    assert.deepEqual({blue: d.blue, red: d.red}, EXPECTED[s.id], s.id);
    assert.equal(s.options.filter(o => o.outcome.blue === d.blue && o.outcome.red === d.red).length, 1, `${s.id}: one correct option`);
    assert.ok(s.options.length >= 3, s.id);
    for (const a of d.awards) assert.match(a.cite, /Art\. [\d.–]+.*printed pp?\. \d+/, `${s.id}: cites article and printed page`);
  }
});

test('point values, who decides, and the penalty rules are the dated rulebooks’, not guesses', () => {
  const W = f => decide('wt-2026', {attacker: 'blue', contact: true, clock: 30, ...f});
  assert.equal(W({technique: 'punch', target: 'trunk', pss: true, judges: true}).blue, 1);
  assert.equal(W({technique: 'punch', target: 'trunk', pss: true, judges: false}).blue, 0, 'a punch needs the judges too');
  assert.equal(W({technique: 'kick', target: 'trunk', pss: true}).blue, 2);
  assert.equal(W({technique: 'kick', target: 'head', pss: true}).blue, 3);
  assert.equal(W({technique: 'turning-kick', target: 'trunk', pss: true, judges: true}).blue, 4);
  assert.equal(W({technique: 'turning-kick', target: 'head', pss: true, judges: true}).blue, 6);
  assert.equal(W({technique: 'turning-kick', target: 'trunk', pss: false, judges: true}).blue, 0, 'no turning bonus without a PSS score');
  const t = W({technique: 'turning-kick', target: 'head', pss: true, judges: true});
  assert.deepEqual(t.awards.map(a => [a.by, a.points]), [['PSS', 3], ['judges', 3]], 'PSS scores the kick; judges add the turning points');
  // Gam-jeom: one point to the opponent; two only for boundary, falling or avoiding in the last ten seconds.
  const pen = (act, clock) => decide('wt-2026', {clock, penalties: [{on: 'red', act}]});
  assert.equal(pen('boundary', 40).blue, 1); assert.equal(pen('boundary', 10).blue, 2); assert.equal(pen('boundary', 11).blue, 1);
  assert.equal(pen('fall', 5).blue, 2); assert.equal(pen('avoiding', 9).blue, 2);
  for (const act of ['push', 'below-waist', 'hand-to-head', 'misconduct']) assert.equal(pen(act, 3).blue, 1, `${act} is not doubled in the last ten seconds`);
  assert.equal(pen('boundary', 30).awards[0].by, 'referee');
  // AAU youth: light head kick 3, no turning bonus to the head; turning trunk still 4.
  const Y = f => decide('aau-youth', {attacker: 'blue', contact: true, pss: true, judges: true, clock: 30, ...f});
  assert.equal(Y({technique: 'turning-kick', target: 'head'}).blue, 3);
  assert.equal(Y({technique: 'turning-kick', target: 'trunk'}).blue, 4);
  // AAU Grassroot: any head touch is misconduct (opponent +1); a miss is a possible verbal warning only.
  const G = f => decide('aau-grassroot', {attacker: 'blue', pss: true, clock: 30, ...f});
  assert.deepEqual([G({technique: 'kick', target: 'head', contact: true}).blue, G({technique: 'kick', target: 'head', contact: true}).red], [0, 1]);
  const miss = G({technique: 'kick', target: 'head', contact: false});
  assert.deepEqual([miss.blue, miss.red], [0, 0]); assert.match(miss.warnings[0].why, /verbal warning/);
  for (const p of Object.values(PROFILES)) { assert.match(p.name, /2026/); assert.match(p.source.url, /^https:\/\//); }
  assert.match(CITES['wt-2026'].last10, /Other prohibited acts are not doubled/);
  // Exceptions are explained, not silently skipped: the fall after a scoring turning kick and the pushed-out contestant.
  for (const id of ['wt-turning-then-fall', 'wt-pushed-out']) { const s = SCENARIOS.find(x => x.id === id), d = decide(s.profile, s.facts); assert.ok(d.warnings.some(w => w.label === 'No penalty' && /printed pp?\. [0-9, ]*39/.test(w.cite)), id); }
});

test('each exchange shows what the decision rests on: contact on the scoring area at the stated moment', () => {
  for (const s of SCENARIOS.filter(s => s.contact)) {
    const c = s.contact, at = t => distanceToTarget(pose(s, c.on, t), c.region, strikePoint(pose(s, c.by, t), c.limb));
    const d = at(s.tc);
    assert.ok(d <= .005 && d > -.04, `${s.id}: strike ${(d * 100).toFixed(1)} cm from ${c.region} at ${s.tc} s`);
    assert.ok(at(s.tc - .25) > .08, `${s.id}: clearly apart a quarter second before`);
    // Nothing reaches the target earlier than the stated moment (it is the first contact).
    for (let t = 0; t < s.tc - .05; t += 1 / 60) assert.ok(at(t) > .005, `${s.id}: earlier contact at ${t.toFixed(2)} s`);
    // The defender's protector is the right colour side of the exchange: the attacker is the other fighter.
    assert.notEqual(c.by, c.on);
  }
  for (const s of SCENARIOS.filter(s => s.miss)) {
    let closest = 9; for (let t = 0; t <= s.duration; t += 1 / 60) closest = Math.min(closest, distanceToTarget(pose(s, s.miss.on, t), s.miss.region, strikePoint(pose(s, s.miss.by, t), s.miss.limb)));
    assert.ok(closest >= s.miss.clearance, `${s.id}: the head kick passes ${(closest * 100).toFixed(1)} cm away`);
  }
});

test('boundary, push and fall scenarios happen when the text says, and only the right fighter crosses', () => {
  for (const s of SCENARIOS.filter(s => s.boundary)) {
    let first = null; for (let t = 0; t <= s.duration; t += 1 / 120) if (first === null && pastBoundary(pose(s, s.boundary.fighter, t).legs[s.boundary.side], ARENA.apothem) > 0) first = t;
    assert.ok(first !== null && Math.abs(first - s.tc) < .05, `${s.id}: foot crosses at ${first?.toFixed(2)} s (stated ${s.tc})`);
    const otherSide = s.boundary.fighter === 'red' ? 'blue' : 'red';
    for (let t = 0; t <= s.duration; t += 1 / 30) for (const side of ['left', 'right']) assert.ok(pastBoundary(pose(s, otherSide, t).legs[side], ARENA.apothem) < 0, `${s.id}: ${otherSide} stays inside`);
  }
  const pushed = SCENARIOS.find(s => s.push);
  for (let t = pushed.push.from + .05; t < pushed.push.to; t += .1) {   // both hands stay on the trunk protector for the whole second
    const b = pose(pushed, 'blue', t), r = pose(pushed, 'red', t);
    for (const side of ['left', 'right']) assert.ok(distanceToTarget(r, 'trunk', strikePoint(b, `fist:${side}`)) < .06, `push contact at ${t.toFixed(2)} s`);
  }
  assert.ok(pushed.push.to - pushed.push.from >= .99, 'a prolonged push, not one quick push');
  const fall = SCENARIOS.find(s => s.fall);
  assert.ok(pose(fall, fall.fall.fighter, fall.fall.by).pelvis[1] < .5, 'the fall puts the fighter down');
  assert.ok(pose(fall, fall.fall.fighter, fall.tc).pelvis[1] > .85, 'still up at the kick');
});

test('the fighters are physically consistent: bone lengths, feet on or above the floor, no overlapping bodies', () => {
  for (const s of SCENARIOS) for (let t = 0; t <= s.duration; t += 1 / 30) {
    const b = pose(s, 'blue', t), r = pose(s, 'red', t);
    assert.ok(len(sub([b.pelvis[0], 0, b.pelvis[2]], [r.pelvis[0], 0, r.pelvis[2]])) > .4, `${s.id} t=${t.toFixed(2)}: bodies overlap`);
    for (const p of [b, r]) for (const side of ['left', 'right']) {
      const l = p.legs[side], a = p.arms[side];
      assert.ok(Math.abs(len(sub(l.knee, l.hip)) - BODY.thigh) < 1e-6 && Math.abs(len(sub(l.ankle, l.knee)) - BODY.shin) < 1e-6, `${s.id} leg lengths`);
      assert.ok(Math.abs(len(sub(a.elbow, a.shoulder)) - BODY.upperArm) < 1e-6, `${s.id} arm length`);
      assert.ok(l.ankle[1] >= BODY.ankleHeight - .002, `${s.id} t=${t.toFixed(2)}: a foot below the floor`);
      assert.ok([...l.hip, ...l.knee, ...l.ankle, ...a.wrist].every(Number.isFinite));
    }
  }
});

test('replays are deterministic: the same time always gives the same pose, in any order', () => {
  for (const s of SCENARIOS) {
    const times = Array.from({length: 40}, (_, i) => i * s.duration / 39), first = times.map(t => JSON.stringify(pose(s, 'blue', t)) + JSON.stringify(pose(s, 'red', t)));
    const shuffled = [...times.keys()].sort((a, b) => Math.sin(a * 77) - Math.sin(b * 77));
    for (const i of shuffled) assert.equal(JSON.stringify(pose(s, 'blue', times[i])) + JSON.stringify(pose(s, 'red', times[i])), first[i]);
  }
});

test('every scenario can be answered from its text alone, with the clock and evidence stated', () => {
  for (const s of SCENARIOS) {
    assert.ok(s.steps.length >= 2 && s.steps.every(x => x.length > 20), s.id);
    assert.ok(Number.isFinite(s.clock) && s.clock > 0 && s.clock < 120, s.id);
    assert.ok(s.evidence.pss && s.evidence.judges, s.id);
    if (s.clock <= 10) assert.match(s.steps.join(' ') + s.title, /\b(6|8) seconds\b/, `${s.id} says it is in the last ten seconds`);
    if (s.facts.pss === false && s.facts.contact && s.facts.technique === 'kick') assert.match(s.evidence.pss, /no valid hit/i, `${s.id} states the sensor result`);
  }
});

test('the page: text alternative, controls, rule sources, real course links and no certification claim', () => {
  const html = readFileSync(new URL('../referee.html', import.meta.url), 'utf8'), main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  for (const id of ['rf-canvas', 'rf-steps', 'rf-evidence-title', 'rf-options', 'rf-feedback', 'rf-play', 'rf-replay', 'rf-speed', 'rf-scrub']) assert.match(main, new RegExp(`id="${id}"`));
  assert.match(main, /<option value="0.25" selected>0.25×<\/option>/, 'slow motion by default');
  assert.match(main, /aria-live="polite"/);
  assert.match(main, /Practice only\.<\/strong> This is not referee certification or an official interpretation/);
  assert.match(main, /not affiliated with World Taekwondo or AAU Taekwondo/);
  for (const url of ['https://www.usatkd.org/usatkd-university-kyorugi-referee-courses', 'https://aausports.org/taekwondo/', 'https://www.worldtaekwondo.org/inside/documents/rar/list', PROFILES['wt-2026'].source.url, PROFILES['aau-youth'].source.url]) assert.ok(main.includes(url), url);
  assert.doesNotMatch(main, /\b(certif(y|ied|ication) (you|program)|earn (a|your) (licen[cs]e|qualification)|official WT|endorsed)\b/i);
  assert.doesNotMatch(main, /<script(?! type="module" src=)/);
  const pages = JSON.parse(readFileSync(new URL('../layout/pages.json', import.meta.url), 'utf8')).pages;
  assert.ok(pages.some(p => p.file === 'referee.html' && p.sitemap));
});

test('the referee guide covers the officiating basics with article and page references, and links into practice', () => {
  const html = readFileSync(new URL('../referee-guide.html', import.meta.url), 'utf8'), main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  for (const id of ['rg-officials', 'rg-sequence', 'rg-scoring', 'rg-penalties', 'rg-commands', 'rg-stoppages', 'rg-aau', 'rg-training']) {
    const sec = main.slice(main.indexOf(`id="${id}"`), main.indexOf('</section>', main.indexOf(`id="${id}"`)));
    assert.ok(sec.length > 200, id); assert.match(sec, /(WT|AAU) Arts?\. [\d.–]+.*?p\. \d+/, `${id} cites article and page`);
  }
  // The scoring table is the dated rule: 1, 2, 3, 4, 6; and the last-ten-seconds doubling is limited.
  const table = main.slice(main.indexOf('<caption>Valid points'), main.indexOf('</table>', main.indexOf('<caption>Valid points')));
  assert.deepEqual([...table.matchAll(/<td>(\d)<\/td>/g)].map(m => m[1]), ['1', '2', '3', '4', '6']);
  assert.match(main, /only these give the opponent two points: crossing the boundary line, falling down, and running away or avoiding/);
  assert.match(main, /Every other penalty stays at one/);
  // Each practice link opens a real scenario.
  const ids = new Set(SCENARIOS.map(s => s.id)), links = [...main.matchAll(/href="\/referee\.html\?scenario=([a-z0-9-]+)"/g)].map(m => m[1]);
  assert.ok(links.length >= 12); for (const id of links) assert.ok(ids.has(id), id);
  // No medical or return-to-play instructions of its own, and no certification claim.
  assert.doesNotMatch(main, /\b\d+\s*days\b|SCAT|concussion assessment|return to (play|training) (after|in)/i);
  assert.match(main, /This guide gives no medical or return-to-play advice/);
  assert.match(main, /isn’t referee certification/);
  for (const url of [PROFILES['wt-2026'].source.url, PROFILES['aau-youth'].source.url, 'https://www.usatkd.org/usatkd-university-kyorugi-referee-courses']) assert.ok(main.includes(url), url);
});

test('the guide and the practice arena are easy to find: footer, tournament guide, resources and each other', () => {
  const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  assert.match(read('layout/footer.html'), /href="\/referee-guide\.html">Referee guide<\/a>[\s\S]*href="\/referee\.html">Referee practice<\/a>/);
  assert.match(read('first-tournament.html'), /href="\/referee-guide\.html">referee guide<\/a>[\s\S]*href="\/referee\.html">3D referee practice<\/a>/);
  assert.match(read('referee.html'), /href="\/referee-guide\.html"/); assert.match(read('referee-guide.html'), /href="\/referee\.html"/);
  const posts = JSON.parse(read('data/community.json')).posts;
  for (const url of ['referee-guide.html', 'referee.html']) assert.ok(posts.some(p => p.url === url && p.category === 'Competitions'), url);
  const pages = JSON.parse(read('layout/pages.json')).pages;
  for (const file of ['referee.html', 'referee-guide.html']) assert.ok(pages.some(p => p.file === file && p.sitemap), file);
});

test('AAU youth divisions don’t inherit WT’s count or its fall exception for turning kicks to the head', () => {
  const f = {attacker: 'blue', technique: 'turning-kick', target: 'head', contact: true, pss: true, judges: true, clock: 30, fall: {by: 'blue', afterScoringTurningKick: true, target: 'head'}};
  const wt = decide('wt-2026', f), youth = decide('aau-youth', f);
  assert.deepEqual([wt.blue, wt.red], [6, 0], 'WT: 6 points, and the fall after a scoring turning kick is not penalised');
  assert.ok(wt.warnings.some(w => w.label === 'No penalty' && /Explanation ii \(printed p\. 39\)/.test(w.cite)));
  assert.deepEqual([youth.blue, youth.red], [3, 1], 'AAU youth: 3 points, and Gam-jeom for the fall');
  assert.match(youth.awards.find(a => a.to === 'red').cite, /AAU Art\. 22\.4\.3–22\.4\.4 \(printed p\. 60\).*Gam-jeom for falling is given after a turning kick to the head/);
  assert.ok(!youth.warnings.some(w => w.label === 'No penalty'), 'no WT exception carried over');
  const late = decide('aau-youth', {...f, clock: 6});
  assert.equal(late.red, 2, 'a fall is one of the acts that gives two points in the last ten seconds');
  // A fall that is not after a scoring turning kick is a Gam-jeom everywhere; unsettled cases are refused, not guessed.
  assert.equal(decide('wt-2026', {clock: 30, fall: {by: 'red', afterScoringTurningKick: false}}).blue, 1);
  assert.throws(() => decide('aau-youth', {clock: 30, fall: {by: 'blue', afterScoringTurningKick: true, target: 'trunk'}}), /not modelled/);
  // Counts: WT counts after any knock-down; AAU youth has none for head kicks (that kick is excessive) and keeps trunk counts.
  assert.equal(countAfter('wt-2026', 'head').count, true);
  const head = countAfter('aau-youth', 'head'), trunk = countAfter('aau-youth', 'trunk');
  assert.deepEqual([head.count, head.excessive], [false, true]); assert.match(head.cite, /AAU Art\. 22\.3\.7 \(printed p\. 60\): there are no 8-counts for any head kick, even a legal one/);
  assert.equal(trunk.count, true); assert.match(trunk.cite, /AAU Art\. 22\.3\.9 \(printed p\. 60\)/);
  // The existing WT scenario still clears its fall through the profile, not by hand.
  const fall = SCENARIOS.find(s => s.id === 'wt-turning-then-fall');
  assert.ok(fall.facts.fall && !fall.facts.cleared, 'the fall is decided by the rules, not pre-cleared in the scenario');
  // The guide spells out both distinctions next to the AAU table and points to them from the WT fall and count rules.
  const html = readFileSync(new URL('../referee-guide.html', import.meta.url), 'utf8'), main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const youthNote = main.slice(main.indexOf('id="rg-aau-youth"'), main.indexOf('</ul>', main.indexOf('id="rg-aau-youth"')));
  assert.match(youthNote, /no 8-count for any kick to the head, even a legal one; a head kick strong enough to need an 8-count is excessive contact/);
  assert.match(youthNote, /Strong kicks to the trunk still follow the standard knock-down procedure\. <span class="rg-ref">AAU Art\. 22\.3\.7 and 22\.3\.9, p\. 60<\/span>/);
  assert.match(youthNote, /falls after a turning kick to the head gets a Gam-jeom for falling[\s\S]*AAU Art\. 22\.4\.3–22\.4\.4, p\. 60/);
  assert.match(main, /falls after scoring with a turning kick \(not after a turning kick to the head in AAU youth divisions: <a href="#rg-aau-youth">/);
  assert.match(main, /WT Art\. 18\.1, p\. 51; Explanation #2, p\. 53<\/span> AAU youth safety divisions have no count for head kicks: <a href="#rg-aau-youth">/);
});

test('the trunk protector is one continuous shell over the jacket, and the shell drawn is the surface that scores', async () => {
  // Proportions of a youth/adult hogu, not an oversized sphere: about 41–44 cm across, 32 cm tall at the front,
  // cut lower at the sides for the arms, with a flat front panel.
  const width = 2 * Math.max(...TRUNK.rows.map(r => r[1]));
  assert.ok(width > .38 && width < .46, `width ${width}`);
  assert.ok(trunkTop(0) - TRUNK.bottom > .29 && trunkTop(0) - TRUNK.bottom < .34, 'front height');
  assert.ok(trunkTop(Math.PI / 2) < trunkTop(0) - .1, 'armholes at the sides');
  for (const y of [.1, .2, .3]) assert.ok(Math.abs(trunkRadius(y, .3) * Math.cos(.3) - trunkRadius(y, 0)) < .006, `flat front at ${y}`);
  // The drawn shell (every vertex, placed exactly as the arena places it) lies on the scoring surface, in every scenario pose.
  const group = trunkProtector(0xc8102e), shell = group.children.find(c => c.name === 'trunk-protector-shell');
  assert.equal(group.children.filter(c => /binding/.test(c.name)).length, 2, 'bound top and bottom edges');
  const P = shell.geometry.attributes.position, {Vector3} = await import('../vendor/three/three.module.js'), v = new Vector3();
  for (const s of SCENARIOS) for (const who of ['blue', 'red']) for (const t of [0, s.tc, s.duration]) {
    const p = pose(s, who, t); placeProtector(group, p); group.updateMatrixWorld(true);
    let worst = 0; for (let i = 0; i < P.count; i += 7) { v.fromBufferAttribute(P, i).applyMatrix4(shell.matrixWorld); worst = Math.max(worst, Math.abs(distanceToTarget(p, 'trunk', [v.x, v.y, v.z]))); }
    assert.ok(worst < .002, `${s.id} ${who} t=${t}: drawn shell ${(worst * 100).toFixed(2)} cm off the scoring surface`);
  }
  // The real jacket (the shipped avatar, skinned on the CPU) stays inside the shell through every exchange, and the
  // front panel stands about 2 cm proud of it, so the protector reads as one piece outside the dobok.
  const {av, apply, meshes, meta, THREE} = await import('./helpers/detailed-avatar.mjs');
  const cloth = meshes.cloth, g = cloth.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, limb = /^(upper|fore|hand|elbow|shoulder|index|middle|ring|pinky|thumb|thigh|shin|foot)/;
  const torso = []; for (let i = 0; i < si.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (limb.test(meta.bones[si.getComponent(i, k)].name)) w += sw.getComponent(i, k); if (w < .3) torso.push(i); }
  const q = new THREE.Vector3(); let poked = 0, worst = -1, where = '', front = [];
  for (const s of SCENARIOS) for (const who of ['blue', 'red']) for (let t = 0; t <= s.duration + 1e-9; t += .1) {
    const p = pose(s, who, t); apply(p); av.root.updateMatrixWorld(true);
    for (const i of torso) {
      cloth.getVertexPosition(i, q).applyMatrix4(cloth.matrixWorld);
      const b = toBody(p, [q.x, q.y, q.z]), a = Math.atan2(b[0], b[2] - TRUNK.axisZ);
      if (b[1] < TRUNK.bottom + .01 || b[1] > trunkTop(a) - .01) continue;
      const sd = distanceToTarget(p, 'trunk', [q.x, q.y, q.z]);
      if (sd > .002) poked++; if (sd > worst) { worst = sd; where = `${s.id} ${who} t=${t.toFixed(1)}`; }
      if (t === 0 && Math.abs(b[0]) < .03 && b[2] > TRUNK.axisZ) front.push(sd);
    }
  }
  assert.equal(poked, 0, `jacket through the protector: worst ${(worst * 100).toFixed(1)} cm at ${where}`);
  const gap = -Math.max(...front);
  assert.ok(gap > .012 && gap < .035, `front panel ${(gap * 100).toFixed(1)} cm over the jacket`);
});

test('the arena can be inspected without pinching, and Next scenario takes focus to the new heading', () => {
  const html = readFileSync(new URL('../referee.html', import.meta.url), 'utf8'), js = readFileSync(new URL('../js/pages/referee.js', import.meta.url), 'utf8');
  const arena = readFileSync(new URL('../js/referee/arena.js', import.meta.url), 'utf8'), css = readFileSync(new URL('../css/referee.css', import.meta.url), 'utf8');
  for (const [z, label] of [['in', 'Zoom in'], ['out', 'Zoom out'], ['reset', 'Reset view']]) assert.match(html, new RegExp(`<button type="button" class="btn btn-ghost btn-sm" data-zoom="${z}">${label}</button>`));
  assert.match(html, /role="group" aria-label="Zoom"/);
  assert.match(arena, /zoom\(factor\) \{ setZoom\(view\.zoom \* factor\); \}/); assert.match(arena, /resetView\(\) \{ Object\.assign\(view, HOME\)/);
  assert.match(html, /<div class="rf-head" id="rf-head">[\s\S]*?<h2 id="rf-title" tabindex="-1">/, 'the heading can take focus');
  assert.match(js, /h\.focus\(\{preventScroll: true\}\); \$\('rf-head'\)\.scrollIntoView\(\{block: 'start'/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.rf-head \{[^}]*scroll-margin-top: 84px/, 'clears the sticky header');
  const first = SCENARIOS[0];
  assert.equal(first.id, 'wt-trunk-kick'); assert.match(first.steps.join(' '), /lands on Hong’s red trunk protector at 1\.50 s/);
  assert.doesNotMatch(JSON.stringify(SCENARIOS), /blue-and-red/);
});

test('the camera keeps both whole fighters in the picture: default, Reset view, every preset and plain orbiting', async () => {
  const aspect = 16 / 9, LIMIT = .97;    // the canvas is always 16:9
  // 1. Landmarks (soles, ankles, knees, hands, head and trunk protectors) of both fighters at every 1/30 s, for the
  //    default view, every preset and an orbit sweep at zoom 1.
  const views = [HOME, ...Object.values(PRESETS).map(p => ({...p, zoom: 1}))];
  for (let az = 0; az < 360; az += 30) for (const el of [2, 16, 40, 70]) views.push({azimuth: az, elevation: el, zoom: 1});
  for (const s of SCENARIOS) {
    const frame = framing(s);
    for (const v of views) {
      const cam = cameraFor(frame, v, aspect);
      for (const p of frame.points) { const [x, y, z] = project(p, cam.position, cam.target, aspect); assert.ok(z > .3 && Math.abs(x) <= .9 && Math.abs(y) <= .9, `${s.id} az ${v.azimuth} el ${v.elevation}: landmark at ${x.toFixed(2)}, ${y.toFixed(2)}`); }
    }
  }
  // 2. Independently, the real meshes: the shipped avatar skinned on the CPU (skin, dobok, belt, hair) for each
  //    fighter, plus the drawn trunk protector and the head protector, through every exchange, from the views a viewer
  //    gets without zooming in. The old camera (4.6 m from the pelvises' midpoint) fails this check.
  const {av, apply, meshes, THREE} = await import('./helpers/detailed-avatar.mjs');
  const parts = ['skin', 'cloth', 'black', 'hair'].map(n => meshes[n]), v3 = new THREE.Vector3(), group = trunkProtector(0x1d4fd8);
  const shell = group.children[0], SP = shell.geometry.attributes.position;
  const bodyPoints = p => {
    apply(p); av.root.updateMatrixWorld(true); placeProtector(group, p); group.updateMatrixWorld(true);
    const out = [];
    for (const m of parts) for (let i = 0; i < m.geometry.attributes.position.count; i += 3) { m.getVertexPosition(i, v3).applyMatrix4(m.matrixWorld); out.push([v3.x, v3.y, v3.z]); }
    for (let i = 0; i < SP.count; i += 5) { v3.fromBufferAttribute(SP, i).applyMatrix4(shell.matrixWorld); out.push([v3.x, v3.y, v3.z]); }
    return out;
  };
  const presetViews = [HOME, PRESETS.side, PRESETS.referee, PRESETS.above].map(v => ({zoom: 1, ...v}));
  let legacyWorst = 0, legacyAt = '', checked = 0;
  for (const s of SCENARIOS) {
    const frame = framing(s), times = [];
    for (let t = 0; t < s.duration; t += .4) times.push(t);
    times.push(s.tc, s.duration); if (s.fall) times.push(s.fall.by);
    for (const t of times) {
      const poses = {blue: pose(s, 'blue', t), red: pose(s, 'red', t)};
      const pts = [...bodyPoints(poses.blue), ...bodyPoints(poses.red)];
      for (const v of presetViews) {
        const cam = cameraFor(frame, v, aspect);
        let worst = 0; for (const p of pts) { const [x, y] = project(p, cam.position, cam.target, aspect); worst = Math.max(worst, Math.abs(x), Math.abs(y)); checked++; }
        assert.ok(worst <= LIMIT, `${s.id} t=${t.toFixed(2)} az ${v.azimuth} el ${v.elevation}: body reaches ${worst.toFixed(3)} of the picture edge`);
        const old = legacyCamera(poses, v);
        for (const p of pts) { const [x, y] = project(p, old.position, old.target, aspect), m = Math.max(Math.abs(x), Math.abs(y)); if (m > legacyWorst) { legacyWorst = m; legacyAt = `${s.id} t=${t.toFixed(2)} az ${v.azimuth}`; } }
      }
    }
  }
  assert.ok(checked > 1e6, 'the meshes were really checked');
  assert.ok(legacyWorst > 1.05, `the old camera cropped a fighter (worst ${legacyWorst.toFixed(3)} at ${legacyAt}); this check must catch it`);
  // 3. The arena uses exactly this framing: presets and Reset view return to zoom 1; only zooming in on purpose can crop.
  const arena = readFileSync(new URL('../js/referee/arena.js', import.meta.url), 'utf8');
  assert.match(arena, /const cam = cameraFor\(frameFit, view, camera\.aspect\);/);
  assert.match(arena, /load\(s\) \{ scenario = s; frameFit = framing\(s\);/);
  assert.match(arena, /setView\(name\) \{ if \(PRESETS\[name\]\) Object\.assign\(view, PRESETS\[name\], \{zoom: 1\}\)/);
  assert.match(arena, /resetView\(\) \{ Object\.assign\(view, HOME\)/);
  assert.equal(HOME.zoom, 1); assert.ok(ZOOM.min < 1 && ZOOM.max > 1);
  const zoomedOut = cameraFor(framing(SCENARIOS[0]), {...HOME, zoom: ZOOM.min}, aspect);
  assert.ok(zoomedOut.distance < 9.5, 'zooming out stays inside the fog');
});
