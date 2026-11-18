import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  applyState, facetCounts, stateFromParams, stateToParams, DEFAULT_STATE, matchesQuery, destinationFor, formRecordProblem, normalize, matchRank,
} from '../js/lib/catalog.js';

const forms = JSON.parse(readFileSync(new URL('../data/forms.json', import.meta.url), 'utf8'));
const S = (over) => ({ ...DEFAULT_STATE, ...over });
const names = (list) => list.map((f) => f.name);

test('every catalogue record is valid and every lesson link exists', () => {
  for (const f of forms) assert.equal(formRecordProblem(f), null);
  for (const f of forms.filter((x) => x.lessonUrl)) assert.ok(existsSync(new URL(`../${f.lessonUrl}`, import.meta.url)), f.lessonUrl);
  assert.equal(new Set(forms.map((f) => f.id)).size, forms.length, 'ids are unique');
});

test('no catalogue record claims review without a named reviewer, date and source', () => {
  assert.ok(forms.every((f) => f.review.status === 'pending'));
  const approvedNoSource = { ...forms[0], review: { status: 'approved', reviewer: 'X', reviewedOn: '2026-11-15' } };
  assert.match(formRecordProblem(approvedNoSource), /source/);
});

test('search "Koryo" returns Koryo only', () => {
  assert.deepEqual(names(applyState(forms, S({ q: 'Koryo' }))), ['Koryo']);
});

test('search matches Korean names, ids and ignores case/hyphens/spacing', () => {
  assert.deepEqual(names(applyState(forms, S({ q: '고려' }))), ['Koryo']);
  assert.deepEqual(names(applyState(forms, S({ q: 'taegeuk 1' }))), ['Taegeuk Il Jang']);
  assert.deepEqual(names(applyState(forms, S({ q: 'chonji' }))), ['Chon-Ji']);
  assert.deepEqual(names(applyState(forms, S({ q: 'DO SAN' }))), ['Do-San']);
  assert.equal(applyState(forms, S({ q: 'zzzz' })).length, 0);
  assert.equal(matchesQuery(forms[0], '   '), true);
});

test('sorting changes the order', () => {
  const byName = names(applyState(forms, S({ sort: 'name' })));
  assert.deepEqual(byName, [...byName].sort((a, b) => a.localeCompare(b)));
  const hard = applyState(forms, S({ sort: 'difficulty-desc' }));
  assert.ok(hard[0].difficulty >= hard.at(-1).difficulty);
  const moves = applyState(forms, S({ sort: 'moves-asc' }));
  assert.ok(moves[0].moves <= moves.at(-1).moves);
  assert.notDeepEqual(names(applyState(forms, S())), byName);
});

test('combined style + belt + difficulty + lesson filters intersect', () => {
  const r = applyState(forms, S({ org: 'wt', belt: 'yellow', level: '1' }));
  assert.ok(r.length > 0);
  for (const f of r) assert.ok(f.category === 'wt' && f.belt === 'yellow' && f.difficulty === 1);
  assert.equal(applyState(forms, S({ lesson: true })).length, 23);
  assert.equal(applyState(forms, S({ org: 'itf', lesson: true })).length, 6);
});

test('facet counts reflect the other active filters and add up', () => {
  const all = facetCounts(forms, S(), 'org');
  assert.equal(all.all, forms.length);
  assert.equal((all.wt || 0) + (all.itf || 0) + (all.ata || 0), forms.length);
  const black = facetCounts(forms, S({ belt: 'black' }), 'org');
  assert.equal(black.itf || 0, 0);
  assert.equal(black.wt, forms.filter((f) => f.belt === 'black' && f.category === 'wt').length);
});

test('URL state round-trips and rejects unknown values', () => {
  const state = S({ q: 'koryo', org: 'wt', belt: 'black', level: '4', lesson: true, sort: 'name' });
  assert.deepEqual(stateFromParams(stateToParams(state)), state);
  assert.equal(stateToParams(DEFAULT_STATE).toString(), '');
  assert.deepEqual(stateFromParams('org=gtf&belt=purple&sort=<script>'), DEFAULT_STATE);
});

test('named forms route to their lesson or their library search', () => {
  const t1 = forms.find((f) => f.id === 'taegeuk-1');
  const koryo = forms.find((f) => f.id === 'koryo');
  assert.equal(destinationFor(t1), 'taegeuk-1.html');
  assert.equal(destinationFor(koryo), 'koryo.html');
  assert.equal(destinationFor({...koryo,lessonUrl:null}), 'forms.html?q=Koryo');
});

test('an empty catalogue yields zero results and zero counts (no crash)', () => {
  assert.deepEqual(applyState([], S({ q: 'koryo' })), []);
  assert.deepEqual(facetCounts([], S(), 'org'), { all: 0 });
  assert.deepEqual(facetCounts([], S(), 'belt'), { all: 0 });
});


test('search includes visible belt, difficulty and technique descriptions',()=>{
 const yellow=applyState(forms,S({q:'yellow belt'}));
 assert.ok(yellow.length>0);assert.ok(yellow.every(f=>f.belt==='yellow'));
 assert.ok(applyState(forms,S({q:'intermediate'})).length>0);
 assert.ok(applyState(forms,S({q:'scissor block'})).some(f=>f.id==='taegeuk-7'));
 assert.deepEqual(names(applyState(forms,S({q:'belt yellow'}))),names(yellow));
});

test('official and common spellings find the one intended form, and punctuation is ignored', () => {
  const only = (q) => applyState(forms, S({ q })).map((f) => f.id);
  // Kukkiwon's own spelling, ATA's sheet title, Revised Romanization and a common Taegeuk spelling.
  for (const [q, id] of [['Shipjin', 'sipjin'], ['Songahm #1', 'songahm-1'], ['Cheon-Ji', 'chon-ji'], ['Koryeo', 'koryo'],
    ['Geumgang', 'keumgang'], ['Jung-Geun', 'joong-gun'], ['Taeguk 1', 'taegeuk-1'], ['Taegeuk Ee Jang', 'taegeuk-2']]) {
    assert.deepEqual(only(q), [id], `“${q}” finds ${id} only`);
  }
  assert.equal(normalize('Songahm #1'), normalize('songahm 1'));
  assert.equal(normalize('태극 1장'), '태극1장', 'Hangul survives normalization');
  assert.deepEqual(only('DO SAN'), ['do-san'], 'short words do not match every form');
});

test('a style’s own word for forms finds that whole style and nothing else', () => {
  const ids = (q) => applyState(forms, S({ q })).map((f) => f.id).sort();
  const of = (org) => forms.filter((f) => f.category === org).map((f) => f.id).sort();
  assert.deepEqual(ids('poomsae'), of('wt'), 'Kukkiwon colour-belt Taegeuk forms are poomsae too');
  assert.deepEqual(ids('tul'), of('itf'));
  assert.deepEqual(ids('songahm'), of('ata'));
});

test('form aliases are validated as short spellings', () => {
  const base = forms.find((f) => f.id === 'sipjin');
  assert.equal(formRecordProblem(base), null);
  assert.match(formRecordProblem({ ...base, aliases: 'Shipjin' }), /aliases/);
  assert.match(formRecordProblem({ ...base, aliases: [''] }), /aliases/);
  assert.match(formRecordProblem({ ...base, aliases: ['x'.repeat(41)] }), /aliases/);
});

test('typing a whole form name shows that form, and the facet counts agree with the results', () => {
  for (const [q, id] of [['Taegeuk Il Jang', 'taegeuk-1'], ['taegeuk il jang', 'taegeuk-1'], ['Taegeuk Ee Jang', 'taegeuk-2'], ['태극 2장', 'taegeuk-2']]) {
    assert.deepEqual(applyState(forms, S({ q })).map((f) => f.id), [id], q);
    assert.equal(facetCounts(forms, S({ q }), 'org').all, 1, `${q}: style counts match the single result`);
  }
  // Partial words still search broadly.
  assert.ok(applyState(forms, S({ q: 'Il Jang' })).length > 1);
  assert.ok(applyState(forms, S({ q: 'taegeuk' })).length === 8);
});

test('partial names put the closest name match first, without changing what matches', () => {
  const ids = (list) => list.map((f) => f.id);
  for (const [q, first] of [['won', 'won-hyo'], ['do', 'do-san'], ['Il Jang', 'taegeuk-1'], ['chil', 'taegeuk-7'], ['song 2', 'songahm-2'], ['sa', 'taegeuk-4'], ['geu', 'keumgang']]) {
    const ranked = applyState(forms, S({ q }));
    assert.equal(ranked[0].id, first, `${q}: closest name first (got ${ranked[0].id})`);
    // Same forms as plain matching; only the order differs.
    assert.deepEqual(new Set(ids(ranked)), new Set(ids(forms.filter((f) => matchesQuery(f, q)))), `${q}: same matches`);
    assert.equal(facetCounts(forms, S({ q }), 'belt').all, ranked.length, `${q}: counts agree`);
  }
  // A whole word beats a word start ("sa": Sa Jang before Sam Jang); a word start beats
  // letters inside a name ("geu": Geumgang before every Taegeuk).
  // "il jang" must not rank Chil Jang (…ch-il jang) with Il Jang.
  const ilJang = applyState(forms, S({ q: 'Il Jang' })).map((f) => f.id);
  assert.ok(ilJang.indexOf('taegeuk-1') < ilJang.indexOf('taegeuk-7'));
  assert.ok(matchRank(forms.find((f) => f.id === 'taegeuk-7'), 'il jang') > matchRank(forms.find((f) => f.id === 'taegeuk-1'), 'il jang'));
  // Equal matches keep curriculum order.
  assert.deepEqual(ids(applyState(forms, S({ q: 'jang' }))), ids(forms.filter((f) => matchesQuery(f, 'jang'))));
});

test('a chosen sort, filters, exact names and the URL are unchanged by search ranking', () => {
  const byName = applyState(forms, S({ q: 'won', sort: 'name' })).map((f) => f.name);
  assert.deepEqual(byName, [...byName].sort((a, b) => a.localeCompare(b)), 'name sort still wins over ranking');
  assert.deepEqual(applyState(forms, S({ q: 'do', org: 'itf' })).map((f) => f.category), applyState(forms, S({ q: 'do', org: 'itf' })).map(() => 'itf'));
  assert.equal(applyState(forms, S({ q: 'do', org: 'itf' }))[0].id, 'do-san');
  assert.deepEqual(applyState(forms, S({ q: 'Taegeuk Il Jang' })).map((f) => f.id), ['taegeuk-1']);
  assert.equal(stateToParams(S({ q: 'won' })).toString(), 'q=won', 'no new URL parameter');
  assert.deepEqual(applyState(forms, S()).map((f) => f.id), forms.map((f) => f.id), 'no search keeps curriculum order');
});

test('the belt filter says colours are typical, not a school rule, and links to the school list', () => {
  const html = readFileSync(new URL('../forms.html', import.meta.url), 'utf8');
  const group = html.slice(html.indexOf('<legend>Belt colour</legend>') - 80, html.indexOf('id="level-options"'));
  assert.match(group, /<fieldset class="filter-group" aria-describedby="belt-note">/);
  assert.match(group, /<p class="filter-note" id="belt-note">[^<]*not a rule[^<]*<a href="\/school-forms\.html">/);
});
