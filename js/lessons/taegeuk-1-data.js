/* Taegeuk Il Jang (태극 1장) lesson data.
   Pose coordinates are the original animation (420×460 logical canvas).
   `official` lists the Kukkiwon movement number(s) each pose belongs to:
   the form is counted as 18 movements; the animation uses 20 poses because
   it adds the ready (Junbi) and return (Baro) positions and shows each
   front kick and its following punch as separate poses.
   The 18-count, the movement mapping and the Korean terms are a DRAFT
   mapping with no authoritative source attached yet.
   REVIEW STATUS: not yet approved by a qualified instructor — see
   LESSON.review.openQuestions. Do not mark it reviewed without a named
   reviewer and date. */

const CX = 210;

const RAW = [
  // 0: Junbi
  { name:'Junbi — Ready Stance', korean:'준비', icon:'🙏', kihap:false, dir:'↕',
    desc:'Parallel stance, feet shoulder-width. Arms cross at waist in ready guard. Face forward.',
    p:{ head:[CX,72], neck:[CX,97], ls:[CX-30,110], rs:[CX+30,110],
        le:[CX-36,155], re:[CX+36,155], lh:[CX-8,192], rh:[CX+8,192],
        lhi:[CX-20,205], rhi:[CX+20,205], lk:[CX-22,278], rk:[CX+22,278],
        lf:[CX-24,350], rf:[CX+24,350] } },
  // 1: Turn left 90°, walking stance, left foot forward, left low block
  { name:'Left Low Block', korean:'좌 아래막기 (1)', icon:'🛡️', kihap:false, dir:'←',
    desc:'Turn left 90°. Walking stance, left foot forward. Left arm sweeps down and across to block the low section.',
    p:{ head:[CX+5,72], neck:[CX+4,97], ls:[CX-22,108], rs:[CX+38,111],
        le:[CX-58,148], re:[CX+44,150], lh:[CX-64,200], rh:[CX+52,158],
        lhi:[CX-2,205], rhi:[CX+18,207], lk:[CX-28,268], rk:[CX+30,282],
        lf:[CX-44,344], rf:[CX+40,350] } },
  // 2: Step forward, walking stance, right foot forward, right middle punch
  { name:'Right Middle Punch', korean:'오른 몸통지르기 (2)', icon:'👊', kihap:false, dir:'←',
    desc:'Step forward with right foot. Walking stance. Right fist punches to the middle section.',
    p:{ head:[CX+5,72], neck:[CX+4,97], ls:[CX-22,108], rs:[CX+38,111],
        le:[CX-32,154], re:[CX-8,144], lh:[CX-38,168], rh:[CX-64,153],
        lhi:[CX-2,205], rhi:[CX+18,207], lk:[CX+20,282], rk:[CX-40,265],
        lf:[CX+16,350], rf:[CX-58,342] } },
  // 3: Turn right 180°, walking stance, right foot forward, right low block
  { name:'Right Low Block', korean:'우 아래막기 (3)', icon:'🛡️', kihap:false, dir:'→',
    desc:'Turn right 180°. Walking stance, right foot forward. Right arm sweeps down to block the low section.',
    p:{ head:[CX-5,72], neck:[CX-4,97], ls:[CX-38,111], rs:[CX+22,108],
        le:[CX-44,150], re:[CX+58,148], lh:[CX-52,158], rh:[CX+64,200],
        lhi:[CX-18,207], rhi:[CX+2,205], lk:[CX-30,282], rk:[CX+28,268],
        lf:[CX-40,350], rf:[CX+44,344] } },
  // 4: Step forward, walking stance, left foot forward, left middle punch
  { name:'Left Middle Punch', korean:'왼 몸통지르기 (4)', icon:'👊', kihap:false, dir:'→',
    desc:'Step forward with left foot. Walking stance. Left fist punches to the middle section.',
    p:{ head:[CX-5,72], neck:[CX-4,97], ls:[CX-38,111], rs:[CX+22,108],
        le:[CX+8,144], re:[CX+32,154], lh:[CX+64,153], rh:[CX+38,168],
        lhi:[CX-18,207], rhi:[CX+2,205], lk:[CX+40,265], rk:[CX-20,282],
        lf:[CX+58,342], rf:[CX-16,350] } },
  // 5: Turn left 90°, front stance, left foot forward, low block → right middle punch
  { name:'Low Block + Middle Punch', korean:'아래막기+지르기 (5)', icon:'⚡', kihap:false, dir:'↑',
    desc:'Turn left 90°. Deep front stance, left foot forward. First do left low block, then right middle punch. Hold the punch.',
    p:{ head:[CX,72], neck:[CX,97], ls:[CX-30,108], rs:[CX+30,108],
        le:[CX-52,155], re:[CX+5,144], lh:[CX-56,170], rh:[CX+66,148],
        lhi:[CX-18,205], rhi:[CX+18,205], lk:[CX-8,258], rk:[CX+32,290],
        lf:[CX-12,338], rf:[CX+50,360] } },
  // 6: Turn right 90°, walking stance, right foot forward, left inside block
  { name:'Left Inside Block', korean:'왼 안막기 (6)', icon:'🛡️', kihap:false, dir:'→',
    desc:'Turn right 90°. Walking stance, right foot forward. Left forearm sweeps inward across the body.',
    p:{ head:[CX-5,72], neck:[CX-4,97], ls:[CX-38,111], rs:[CX+22,108],
        le:[CX-5,132], re:[CX+38,152], lh:[CX-12,96], rh:[CX+44,165],
        lhi:[CX-18,207], rhi:[CX+2,205], lk:[CX-24,282], rk:[CX+28,268],
        lf:[CX-30,350], rf:[CX+44,344] } },
  // 7: Step forward, walking stance, left foot forward, right middle punch
  { name:'Right Middle Punch', korean:'오른 몸통지르기 (7)', icon:'👊', kihap:false, dir:'→',
    desc:'Step forward with left foot. Walking stance. Right fist punches to the middle section.',
    p:{ head:[CX-5,72], neck:[CX-4,97], ls:[CX-38,111], rs:[CX+22,108],
        le:[CX-32,154], re:[CX+55,144], lh:[CX-38,168], rh:[CX+70,150],
        lhi:[CX-18,207], rhi:[CX+2,205], lk:[CX+40,265], rk:[CX-16,282],
        lf:[CX+58,342], rf:[CX-14,350] } },
  // 8: Turn left 180°, walking stance, left foot forward, right inside block
  { name:'Right Inside Block', korean:'오른 안막기 (8)', icon:'🛡️', kihap:false, dir:'←',
    desc:'Turn left 180°. Walking stance, left foot forward. Right forearm sweeps inward — inside block.',
    p:{ head:[CX+5,72], neck:[CX+4,97], ls:[CX-22,108], rs:[CX+38,111],
        le:[CX-38,152], re:[CX+5,132], lh:[CX-44,165], rh:[CX+12,96],
        lhi:[CX-2,205], rhi:[CX+18,207], lk:[CX-28,268], rk:[CX+24,282],
        lf:[CX-44,344], rf:[CX+30,350] } },
  // 9: Step forward, walking stance, right foot forward, left middle punch — KIHAP
  { name:'Left Middle Punch — KIHAP!', korean:'왼 몸통지르기 기합! (9)', icon:'⚡', kihap:true, dir:'←',
    desc:'Step forward with right foot. Walking stance. Left fist punches to middle section. KIHAP!',
    p:{ head:[CX+5,72], neck:[CX+4,97], ls:[CX-22,108], rs:[CX+38,111],
        le:[CX-55,144], re:[CX+32,154], lh:[CX-65,150], rh:[CX+38,168],
        lhi:[CX-2,205], rhi:[CX+18,207], lk:[CX+16,282], rk:[CX-40,265],
        lf:[CX+14,350], rf:[CX-56,342] } },
  // 10: Turn right 90°, front stance, right foot forward, right low block → left middle punch
  { name:'Low Block + Middle Punch', korean:'아래막기+지르기 (10)', icon:'⚡', kihap:false, dir:'↑',
    desc:'Turn right 90°. Deep front stance, right foot forward. First right low block, then left middle punch.',
    p:{ head:[CX,72], neck:[CX,97], ls:[CX-30,108], rs:[CX+30,108],
        le:[CX+5,144], re:[CX+52,155], lh:[CX+66,148], rh:[CX+56,170],
        lhi:[CX-18,205], rhi:[CX+18,205], lk:[CX-32,290], rk:[CX+8,258],
        lf:[CX-50,360], rf:[CX+12,338] } },
  // 11: Turn left 90°, walking stance, left foot forward, left high block
  { name:'Left High Block', korean:'왼 얼굴막기 (11)', icon:'🛡️', kihap:false, dir:'←',
    desc:'Turn left 90°. Walking stance, left foot forward. Left arm rises above the head — high block.',
    p:{ head:[CX+5,72], neck:[CX+4,97], ls:[CX-22,108], rs:[CX+38,111],
        le:[CX-28,88], re:[CX+44,150], lh:[CX-52,72], rh:[CX+52,162],
        lhi:[CX-2,205], rhi:[CX+18,207], lk:[CX-28,268], rk:[CX+30,282],
        lf:[CX-44,344], rf:[CX+40,350] } },
  // 12a: Right front kick (facing left)
  { name:'Right Front Kick', korean:'오른 앞차기 (12)', icon:'🦵', kihap:false, dir:'←',
    desc:'Chamber right knee high then snap the foot forward — front kick. Standing on left leg.',
    p:{ head:[CX+5,68], neck:[CX+4,93], ls:[CX-22,106], rs:[CX+38,108],
        le:[CX-50,148], re:[CX+48,148], lh:[CX-56,162], rh:[CX+54,162],
        lhi:[CX-2,200], rhi:[CX+14,200], lk:[CX-24,274], rk:[CX-14,226],
        lf:[CX-26,352], rf:[CX-40,212] } },
  // 12b: Land walking stance, right foot forward, right middle punch
  { name:'Right Middle Punch', korean:'오른 몸통지르기 (12→)', icon:'👊', kihap:false, dir:'←',
    desc:'Land right foot forward into walking stance. Right fist punches to the middle section.',
    p:{ head:[CX+5,72], neck:[CX+4,97], ls:[CX-22,108], rs:[CX+38,111],
        le:[CX-32,154], re:[CX-8,144], lh:[CX-38,168], rh:[CX-64,153],
        lhi:[CX-2,205], rhi:[CX+18,207], lk:[CX+20,282], rk:[CX-40,265],
        lf:[CX+16,350], rf:[CX-58,342] } },
  // 13: Turn right 180°, walking stance, right foot forward, right high block
  { name:'Right High Block', korean:'오른 얼굴막기 (13)', icon:'🛡️', kihap:false, dir:'→',
    desc:'Turn right 180°. Walking stance, right foot forward. Right arm rises above the head — high block.',
    p:{ head:[CX-5,72], neck:[CX-4,97], ls:[CX-38,111], rs:[CX+22,108],
        le:[CX-44,150], re:[CX+28,88], lh:[CX-52,162], rh:[CX+52,72],
        lhi:[CX-18,207], rhi:[CX+2,205], lk:[CX-30,282], rk:[CX+28,268],
        lf:[CX-40,350], rf:[CX+44,344] } },
  // 14a: Left front kick (facing right)
  { name:'Left Front Kick', korean:'왼 앞차기 (14)', icon:'🦵', kihap:false, dir:'→',
    desc:'Chamber left knee high then snap the foot forward — front kick. Standing on right leg.',
    p:{ head:[CX-5,68], neck:[CX-4,93], ls:[CX-38,108], rs:[CX+22,106],
        le:[CX-48,148], re:[CX+50,148], lh:[CX-54,162], rh:[CX+56,162],
        lhi:[CX-14,200], rhi:[CX+2,200], lk:[CX+14,226], rk:[CX+24,274],
        lf:[CX+40,212], rf:[CX+26,352] } },
  // 14b: Land walking stance, left foot forward, left middle punch
  { name:'Left Middle Punch', korean:'왼 몸통지르기 (14→)', icon:'👊', kihap:false, dir:'→',
    desc:'Land left foot forward into walking stance. Left fist punches to the middle section.',
    p:{ head:[CX-5,72], neck:[CX-4,97], ls:[CX-38,111], rs:[CX+22,108],
        le:[CX+8,144], re:[CX+32,154], lh:[CX+64,153], rh:[CX+38,168],
        lhi:[CX-18,207], rhi:[CX+2,205], lk:[CX+40,265], rk:[CX-20,282],
        lf:[CX+58,342], rf:[CX-16,350] } },
  // 15: Turn right 90°, front stance, left foot forward, left low block
  { name:'Left Low Block', korean:'좌 아래막기 (15)', icon:'🛡️', kihap:false, dir:'↓',
    desc:'Turn right 90°. Deep front stance, left foot forward. Left arm sweeps down to low block. Facing back toward start.',
    p:{ head:[CX,72], neck:[CX,97], ls:[CX-30,108], rs:[CX+30,108],
        le:[CX-68,148], re:[CX+44,150], lh:[CX-72,202], rh:[CX+50,158],
        lhi:[CX-18,205], rhi:[CX+18,205], lk:[CX-8,258], rk:[CX+32,290],
        lf:[CX-12,338], rf:[CX+50,360] } },
  // 16: Step forward, front stance, right foot forward, right middle punch — KIHAP
  { name:'Right Punch — KIHAP!', korean:'오른 몸통지르기 기합! (16)', icon:'⚡', kihap:true, dir:'↓',
    desc:'Step forward into front stance, right foot forward. Right middle punch. Final KIHAP!',
    p:{ head:[CX,72], neck:[CX,97], ls:[CX-30,108], rs:[CX+30,108],
        le:[CX-50,155], re:[CX+5,144], lh:[CX-54,168], rh:[CX+66,148],
        lhi:[CX-18,205], rhi:[CX+18,205], lk:[CX-32,290], rk:[CX+8,258],
        lf:[CX-50,360], rf:[CX+12,338] } },
  // 17: Baro — Return to Ready
  { name:'Baro — Return to Ready', korean:'바로 · 경례', icon:'🙏', kihap:false, dir:'↕',
    desc:'Return to starting position. Bow (인사 — Insa). End of Taegeuk Il Jang. 감사합니다!',
    p:{ head:[CX,72], neck:[CX,97], ls:[CX-30,110], rs:[CX+30,110],
        le:[CX-36,155], re:[CX+36,155], lh:[CX-8,192], rh:[CX+8,192],
        lhi:[CX-20,205], rhi:[CX+20,205], lk:[CX-22,278], rk:[CX+22,278],
        lf:[CX-24,350], rf:[CX+24,350] } },
];

/* Display metadata per pose (same order as RAW). */
const META = [
  { official: null, name: 'Junbi — Ready stance', korean: '준비', desc: 'Ready stance (naranhi seogi): feet shoulder-width apart, fists held in front of the lower abdomen. Face forward.' },
  { official: [1], korean: '왼 아래막기' },
  { official: [2], korean: '오른 몸통 반대지르기' },
  { official: [3], korean: '오른 아래막기' },
  { official: [4], korean: '왼 몸통 반대지르기' },
  { official: [5, 6], korean: '왼 아래막기 · 오른 몸통 바로지르기' },
  { official: [7], korean: '왼 몸통 안막기' },
  { official: [8], korean: '오른 몸통 바로지르기' },
  { official: [9], korean: '오른 몸통 안막기' },
  { official: [10], korean: '왼 몸통 바로지르기', name: 'Left Middle Punch' },
  { official: [11, 12], korean: '오른 아래막기 · 왼 몸통 바로지르기' },
  { official: [13], korean: '왼 얼굴막기' },
  { official: [14], korean: '오른 앞차기', subpose: 'kick' },
  { official: [14], korean: '오른 몸통 반대지르기', subpose: 'punch' },
  { official: [15], korean: '오른 얼굴막기' },
  { official: [16], korean: '왼 앞차기', subpose: 'kick' },
  { official: [16], korean: '왼 몸통 반대지르기', subpose: 'punch' },
  { official: [17], korean: '왼 아래막기' },
  { official: [18], korean: '오른 몸통 반대지르기', name: 'Right Middle Punch' },
  { official: null, name: 'Baro — Return to ready', korean: '바로 · 경례', desc: 'Return to the starting position and bow (경례, kyeongnye).' },
];

export const POSES = RAW.map((pose, i) => ({ ...pose, ...META[i] }));

export const LESSON = Object.freeze({
  id: 'taegeuk-1',
  officialMovements: 18,          // commonly cited count — DRAFT until reviewed
  mappingStatus: 'draft',        // movement numbers, Korean terms and kihap cues are a draft mapping
  poseCount: 20,
  // Kihap placement as authored in the original animation (movements 10 and 18).
  kihapMovements: [10, 18],
  review: Object.freeze({
    status: 'pending',
    reviewer: null,
    reviewedOn: null,
    openQuestions: Object.freeze([
      'Kihap placement: the animation marks movements 10 and 18; many schools teach a single kihap on movement 18.',
      'Korean technique names (e.g. 반대지르기 / 바로지르기) and the pose-to-movement mapping are a draft and need checking against an authoritative source.',
      'Movement numbering follows the 18-count Kukkiwon convention; confirm against the reference text used by the school.',
      'Belt level at which the form is taught varies by school and organisation.',
      'Stance depth and arm paths in the stick figure are approximate.',
    ]),
  }),
});
