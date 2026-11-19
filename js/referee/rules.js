/* Referee practice: three dated rule profiles and the decisions they give for a described exchange.
   Each profile names its official source; every decision cites the article and printed page it comes from.
   This is practice material, not an official interpretation or a certification. */

export const PROFILES = Object.freeze({
  'wt-2026': {
    id: 'wt-2026', name: 'World Taekwondo, rules in force from 1 November 2026', short: 'WT 2026',
    source: {title: 'WT Competition Rules and Interpretation, in force as of November 1, 2026', url: 'https://www.taekwondobond.nl/wp-content/uploads/WT-Competition-Rules-and-Interpretation-November-1-2026.pdf', publisherNote: 'hosted by the Dutch national federation; WT’s rules directory: https://www.worldtaekwondo.org/inside/documents/rar/list'},
    headContact: 'scoring', turningHeadBonus: true
  },
  'aau-youth': {
    id: 'aau-youth', name: 'AAU Taekwondo Olympic-style sparring, youth safety rules (all belts 5–11, colour belts 12–17), effective 1 November 2026', short: 'AAU youth',
    source: {title: 'AAU Taekwondo Competition Rules & Regulations Handbook, effective 11-01-2026', url: 'https://drive.google.com/file/d/1POLryUPZUwdIX03Texak8eYgY9vKfxx2/view?usp=sharing', publisherNote: 'linked from AAU Taekwondo’s Rules menu: https://aausports.org/taekwondo/'},
    headContact: 'light', turningHeadBonus: false
  },
  'aau-grassroot': {
    id: 'aau-grassroot', name: 'AAU Taekwondo Grassroot Olympic-style sparring (no head contact), effective 1 November 2026', short: 'AAU Grassroot',
    source: {title: 'AAU Taekwondo Competition Rules & Regulations Handbook, effective 11-01-2026', url: 'https://drive.google.com/file/d/1POLryUPZUwdIX03Texak8eYgY9vKfxx2/view?usp=sharing', publisherNote: 'linked from AAU Taekwondo’s Rules menu: https://aausports.org/taekwondo/'},
    headContact: 'none', turningHeadBonus: false
  }
});

/* Citations: article, clause and printed page in each profile's source. */
export const CITES = Object.freeze({
  'wt-2026': {
    punch: 'WT Art. 12.3.1 and 13.2 (printed pp. 33, 35): one point for a valid punch to the trunk protector; with sensing gloves, the PSS detects the impact and the corner judges validate the technique.',
    trunkKick: 'WT Art. 12.3.2 and 12.2.3 (printed p. 33): two points for a valid kick to the trunk protector; the PSS decides validity and impact.',
    headKick: 'WT Art. 12.3.3 (printed p. 33): three points for a valid kick to the head.',
    turning: 'WT Art. 12.3.4 and 13.1 (printed pp. 33, 35): a valid turning kick doubles the points, four to the trunk and six to the head; the PSS scores the kick and the judges add the turning points.',
    noPss: 'WT Art. 12.2.3 and 13.4 (printed pp. 33, 35): the PSS decides whether a kick has a proper level of impact; a turning bonus is invalid if the PSS did not score the kick.',
    gamjeom: 'WT Art. 12.3.5 and 14.3 (printed pp. 33, 37): the referee declares Gam-jeom, and each counts as one point for the opponent.',
    last10: 'WT Art. 12.3.5.1 (printed p. 33): in the last ten seconds of a round, Gam-jeom for crossing the boundary line, falling down, or running away/avoiding gives two points to the opponent. Other prohibited acts are not doubled.',
    boundary: 'WT Art. 14.4.1.1 and Explanation i (printed pp. 37, 39): Gam-jeom if any part of a foot crosses the boundary line; none if the crossing was caused by the opponent’s prohibited act.',
    push: 'WT Art. 14.4.1.4 and Explanation iv (printed pp. 37, 40): one quick push followed by disengaging is permitted; pushing with prolonged contact or out of the boundary line is penalised.',
    fallAfterTurning: 'WT Art. 14, Explanation ii (printed p. 39): no penalty when a contestant who scored with a turning kick falls down.',
    count: 'WT Art. 17–18 and Art. 18 Explanation #2 (printed pp. 50–53): after a knock-down from a legitimate technique the referee counts, and counting to eight is compulsory.',
    handToHead: 'WT Art. 14.4.1.8 and Explanation viii (printed pp. 37, 40): hitting the opponent’s head with the hand is a prohibited act.',
    belowWaist: 'WT Art. 14.4.1.6 and Explanation vi (printed pp. 37, 40): attacking below the waist is a prohibited act.'
  },
  'aau-youth': {
    trunkKick: 'AAU Art. 9.3.2 (printed p. 42): two points for a valid kick to the trunk protector.',
    turning: 'AAU Art. 9.3.4 (printed p. 42): a valid turning kick to the trunk scores four points (2 from the PSS, 2 from the technical judge).',
    headLight: 'AAU Art. 22.3 and 22.4.1–22.4.2 (printed pp. 59–60): for all belts aged 5–11 and colour belts aged 12–17, head contact must be light and controlled; a light-contact kick to the head scores three points, with no extra points for a turning kick to the head.',
    fallAfterTurningHead: 'AAU Art. 22.4.3–22.4.4 (printed p. 60): in youth safety divisions, turning kicks to the head are not considered when deciding penalties related to falling; Gam-jeom for falling is given after a turning kick to the head.',
    headCount: 'AAU Art. 22.3.7 (printed p. 60): there are no 8-counts for any head kick, even a legal one; a head kick powerful enough to warrant an 8-count is excessive.',
    trunkCount: 'AAU Art. 22.3.9 (printed p. 60): strong kicks to the trunk follow the standard knock-down procedure.',
    gamjeom: 'AAU Art. 11.1–11.2 (printed pp. 42–43): the referee declares Gam-jeom, and each counts as one point for the opponent.',
    last10: 'AAU Art. 11.2 and 11.4 (printed p. 43): in the last ten seconds, Gam-jeom for crossing the boundary line, falling down, running away or avoiding, or a rejected technical card gives two points to the opponent.'
  },
  'aau-grassroot': {
    trunkKick: 'AAU Art. 9.3.2 (printed p. 42): two points for a valid kick to the trunk protector; Art. 23.1.2 (printed p. 61) applies the other Olympic-style rules to Grassroot divisions.',
    headTouch: 'AAU Art. 23.1.1 and 23.3.1 (printed p. 61): no head contact at any age or rank in Grassroot divisions; any kick that touches the head is a penalty for misconduct to the kicker.',
    headMiss: 'AAU Art. 23.3.2 (printed p. 61): a technique directed at the head that does not make contact may receive a verbal warning.',
    gamjeom: 'AAU Art. 11.1–11.2 (printed pp. 42–43): the referee declares Gam-jeom, and each counts as one point for the opponent.',
    last10: 'AAU Art. 11.2 and 11.4 (printed p. 43): in the last ten seconds, Gam-jeom for crossing the boundary line, falling down, running away or avoiding, or a rejected technical card gives two points to the opponent.'
  }
});

const other = c => (c === 'blue' ? 'red' : 'blue');
const LAST10_ACTS = new Set(['boundary', 'fall', 'avoiding']);

/* What the officials award for one exchange. `facts`:
     attacker ('blue' | 'red'), technique ('punch' | 'kick' | 'turning-kick' | 'hand-to-head' | 'below-waist' | null),
     target ('trunk' | 'head' | null), contact (true/false), pss (true if the PSS registered a valid hit),
     judges (true if the judges validated the punch or the turning technique),
     clock (seconds left in the round), penalties: [{on, act, causedBy?}] for referee decisions,
     fall: {by, afterScoringTurningKick, target, why?}: a contestant falls; whether it is penalised depends on the profile.
   Returns {blue, red, awards:[{to, points, by, why, cite}], warnings:[...]}. */
export function decide(profileId, facts) {
  const P = PROFILES[profileId], C = CITES[profileId], awards = [], warnings = [];
  if (!P) throw new Error('unknown profile ' + profileId);
  const add = (to, points, by, why, cite) => { if (points) awards.push({to, points, by, why, cite}); };
  const {attacker, technique, target, contact, pss, judges, clock = 60} = facts;
  const gamjeom = (on, act, why, cite) => {
    const double = clock <= 10 && LAST10_ACTS.has(act);
    add(other(on), double ? 2 : 1, 'referee', `Gam-jeom to ${on} (${why})${double ? ' in the last ten seconds' : ''}`, double ? `${cite || C.gamjeom} ${C.last10}` : (cite || C.gamjeom));
  };
  // Techniques that score.
  if (technique === 'punch' && target === 'trunk' && contact) {
    if (pss && judges) add(attacker, 1, 'PSS + judges', 'valid punch to the trunk protector', C.punch);
  }
  if ((technique === 'kick' || technique === 'turning-kick') && target === 'trunk' && contact) {
    if (pss) {
      add(attacker, 2, 'PSS', 'valid kick to the trunk protector', C.trunkKick);
      if (technique === 'turning-kick' && judges) add(attacker, 2, 'judges', 'turning kick: the points are doubled', C.turning);
    } else warnings.push({by: 'PSS', why: 'the trunk PSS did not register a valid hit, so no points (and no turning bonus)', cite: C.noPss || C.trunkKick});
  }
  if ((technique === 'kick' || technique === 'turning-kick') && target === 'head') {
    if (P.headContact === 'none') {
      if (contact) gamjeom(attacker, 'misconduct', 'a kick touched the head in a Grassroot division', C.headTouch);
      else warnings.push({by: 'referee', why: 'a head kick without contact: the referee may give a verbal warning; no points', cite: C.headMiss});
    } else if (contact && (P.headContact === 'light' || pss)) {
      if (P.headContact === 'light') add(attacker, 3, 'judges', 'light-contact kick to the head', C.headLight);
      else {
        add(attacker, 3, 'PSS', 'valid kick to the head', C.headKick);
        if (technique === 'turning-kick' && judges && P.turningHeadBonus) add(attacker, 3, 'judges', 'turning kick: the points are doubled', C.turning);
      }
    }
  }
  // Prohibited acts, declared by the referee.
  if (technique === 'hand-to-head' && contact) gamjeom(attacker, 'hand-to-head', 'hitting the head with the hand', C.handToHead);
  if (technique === 'below-waist' && contact) gamjeom(attacker, 'below-waist', 'attacking below the waist', C.belowWaist);
  for (const pen of facts.penalties || []) gamjeom(pen.on, pen.act, pen.why || pen.act, pen.cite ? C[pen.cite] : undefined);
  // A fall: WT clears a fall after a scoring turning kick (to the trunk or head); AAU youth safety divisions do not
  // clear one after a turning kick to the head. Cases a profile's source doesn't settle here are refused, not guessed.
  if (facts.fall) {
    const {by, afterScoringTurningKick, target: ft, why} = facts.fall;
    if (!afterScoringTurningKick) gamjeom(by, 'fall', why || 'falling down');
    else if (profileId === 'wt-2026') warnings.push({by: 'referee', label: 'No penalty', why: why || 'the contestant fell after scoring with a turning kick, so the fall is not penalised', cite: C.fallAfterTurning});
    else if (profileId === 'aau-youth' && ft === 'head') gamjeom(by, 'fall', why || 'falling after a turning kick to the head, which youth safety rules do not exempt', C.fallAfterTurningHead);
    else throw new Error(`a fall after a turning kick to the ${ft} is not modelled for ${profileId}`);
  }
  // Acts that look like prohibited acts but are not penalised under the rule's own exceptions.
  for (const c of facts.cleared || []) warnings.push({by: 'referee', label: 'No penalty', why: c.why, cite: C[c.cite]});
  const total = c => awards.filter(a => a.to === c).reduce((s, a) => s + a.points, 0);
  return {blue: total('blue'), red: total('red'), awards, warnings};
}

/* Whether the referee counts after a knock-down from a kick to `target`, and the rule that says so. AAU youth safety
   divisions have no count for head kicks (a kick that would need one is excessive); trunk kicks keep the standard
   procedure. Grassroot divisions are not answered here. */
export function countAfter(profileId, target) {
  if (profileId === 'wt-2026') return {count: true, cite: CITES['wt-2026'].count};
  if (profileId === 'aau-youth') return target === 'head' ? {count: false, excessive: true, cite: CITES['aau-youth'].headCount} : {count: true, cite: CITES['aau-youth'].trunkCount};
  throw new Error(`no count rule for a ${target} kick in ${profileId}`);
}
