import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  applyState, facetCounts, stateFromParams, stateToParams, DEFAULT_STATE, matchesQuery, destinationFor, formRecordProblem,
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
  assert.deepEqual(names(applyState(forms, S({ lesson: true }))), ['Taegeuk Il Jang']);
  assert.equal(applyState(forms, S({ org: 'itf', lesson: true })).length, 0);
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
  assert.equal(destinationFor(koryo), 'forms.html?q=Koryo');
});

test('an empty catalogue yields zero results and zero counts (no crash)', () => {
  assert.deepEqual(applyState([], S({ q: 'koryo' })), []);
  assert.deepEqual(facetCounts([], S(), 'org'), { all: 0 });
  assert.deepEqual(facetCounts([], S(), 'belt'), { all: 0 });
});
