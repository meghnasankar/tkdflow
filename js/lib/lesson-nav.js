/* Lesson practice helpers: pose deep links, scoped keyboard controls,
   pause-on-hide and copy-to-clipboard. Everything here is pure or takes its
   browser objects as arguments, so it can be tested in Node.

   Pose numbers are 1-based positions in the animation (Pose 1 … Pose N).
   They are NOT the draft official movement numbers, which live on each
   pose as `official` and are labelled separately. */

export const POSE_PARAM = 'pose';
export const PLAYER_HASH = '#player';
export const LESSON_PATH = '/taegeuk-1.html';

const POSE_VALUE_RE = /^[1-9][0-9]{0,2}$/; // 1–999, digits only, no leading zero/sign/space

/**
 * Read the `pose` query value strictly.
 * @returns {{ index: number|null, problem: null|'malformed'|'out-of-range'|'duplicate' }}
 *   index is 0-based; null means "no valid pose requested" (caller shows pose 1).
 */
export function parsePoseParam(search, count) {
  let params;
  try { params = new URLSearchParams(typeof search === 'string' ? search : ''); } catch { return { index: null, problem: 'malformed' }; }
  const values = params.getAll(POSE_PARAM);
  if (values.length === 0) return { index: null, problem: null };
  if (values.length > 1) return { index: null, problem: 'duplicate' };
  const raw = values[0];
  if (!POSE_VALUE_RE.test(raw)) return { index: null, problem: 'malformed' };
  const n = Number(raw);
  if (!Number.isInteger(count) || n < 1 || n > count) return { index: null, problem: 'out-of-range' };
  return { index: n - 1, problem: null };
}

/** Message shown when a link could not be used. Never echoes the raw value. */
export function poseLinkProblemText(problem, count) {
  if (!problem) return '';
  const why = {
    malformed: 'was not a pose number',
    'out-of-range': `is outside poses 1–${count}`,
    duplicate: 'named more than one pose',
  }[problem] ?? 'could not be read';
  return `The pose in this link ${why}, so the lesson starts at pose 1.`;
}

/**
 * Build a link to a pose. Uses the page's own origin (so preview and local
 * links stay on the same host) and a fixed path; nothing from the current
 * URL other than the origin is copied. Non-http(s) origins get a relative link.
 */
export function poseUrl(origin, index, path = LESSON_PATH) {
  const safePath = /^\/[a-z0-9-]+\.html$/.test(path) ? path : LESSON_PATH;
  const query = `?${POSE_PARAM}=${Math.trunc(index) + 1}${PLAYER_HASH}`;
  let base;
  try { base = new URL(String(origin)); } catch { base = null; }
  if (!base || (base.protocol !== 'http:' && base.protocol !== 'https:')) return `${safePath}${query}`;
  return `${base.origin}${safePath}${query}`;
}

/**
 * Keep the selected pose in step with browser history.
 * - start(): applies the current URL once and adds ONE popstate listener
 *   (calling start() again does nothing).
 * - Fragment-only navigation (skip link, "Jump to the player") leaves the pose alone.
 * - Every applied link selects its pose PAUSED (player.select always pauses).
 * - push(index): selects the pose paused and records its link without reloading.
 */
export function createPoseHistory({ win, player, count, path = LESSON_PATH, onProblem = () => {} }) {
  let started = false;
  let lastSearch = null;
  const apply = () => {
    const search = win.location.search;
    if (search === lastSearch) return; // hash-only change
    lastSearch = search;
    const { index, problem } = parsePoseParam(search, count);
    onProblem(problem);
    if (index !== null) player.select(index, 'link');
    else if (problem || player.index !== 0) player.select(0, 'link');
  };
  const onPop = () => apply();
  return {
    start() {
      if (started) return;
      started = true;
      apply();
      win.addEventListener('popstate', onPop);
    },
    push(index) {
      player.select(index, 'link');
      const url = poseUrl(win.location.origin, player.index, path);
      const target = new URL(url, win.location.href);
      if (target.search + target.hash !== win.location.search + win.location.hash) {
        win.history.pushState(null, '', url);
      }
      lastSearch = win.location.search;
      onProblem(null);
      return url;
    },
    destroy() {
      if (!started) return;
      started = false;
      win.removeEventListener('popstate', onPop);
    },
  };
}

const NATIVE_KEY_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

/**
 * Map a keydown inside the player region to a player action, or null to
 * leave the key to the browser. Native controls keep their own keys:
 * range/select/text fields keep arrows/Home/End/typing, buttons and links
 * keep Space/Enter. Modified keys and IME composition are never taken.
 */
export function playerKeyAction(e, region) {
  if (!e || e.defaultPrevented || e.isComposing) return null;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return null;
  const t = e.target;
  if (t && (NATIVE_KEY_TAGS.has(t.tagName) || t.isContentEditable)) return null;
  switch (e.key) {
    case 'ArrowLeft': return 'prev';
    case 'ArrowRight': return 'next';
    case 'Home': return 'first';
    case 'End': return 'last';
    case 'k': return 'toggle';
    case ' ':
    case 'Spacebar':
      return t === region ? 'toggle' : null; // Space on a button/link activates it natively
    default: return null;
  }
}

/** Handle a scoped player key, consuming repeats without toggling repeatedly. */
export function handlePlayerKey(e, region, player) {
  const action = playerKeyAction(e, region);
  if (!action) return false;
  e.preventDefault();
  if (action !== 'toggle' || !e.repeat) player[action]();
  return true;
}

/**
 * Pause playback when the page is hidden or being left; never resume.
 * `onHide` lets the page settle any in-flight canvas animation.
 */
export function createLifecyclePause({ doc, win, player, onHide = () => {} }) {
  let started = false;
  const hide = () => { player.pause(); onHide(); };
  const onVisibility = () => { if (doc.visibilityState === 'hidden') hide(); };
  return {
    start() {
      if (started) return;
      started = true;
      doc.addEventListener('visibilitychange', onVisibility);
      win.addEventListener('pagehide', hide);
    },
    destroy() {
      if (!started) return;
      started = false;
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('pagehide', hide);
    },
  };
}

/**
 * Copy text with the async Clipboard API, bounded so a hanging permission
 * prompt cannot leave the UI waiting. Always resolves.
 * @returns {Promise<{ok: boolean, reason?: 'unavailable'|'denied'|'timeout'}>}
 */
export async function copyText(text, { clipboard, timeoutMs = 3000, schedule = setTimeout, cancel = clearTimeout } = {}) {
  if (!clipboard || typeof clipboard.writeText !== 'function') return { ok: false, reason: 'unavailable' };
  let timer;
  const deadline = new Promise((resolve) => { timer = schedule(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs); });
  const attempt = (async () => {
    try { await clipboard.writeText(text); return { ok: true }; } catch { return { ok: false, reason: 'denied' }; }
  })();
  try { return await Promise.race([attempt, deadline]); } finally { cancel(timer); }
}

export function copyStatusText(result, poseNumber) {
  if (result.ok) return `Link to pose ${poseNumber} copied.`;
  return `Could not copy automatically. The link to pose ${poseNumber} is selected below; copy it with your keyboard or menu.`;
}

/** Draft movement label for a pose, e.g. "Movement 4" or "Movements 2–3 (kick)". */
export function officialLabel(pose) {
  if (!pose.official) return null;
  const nums = pose.official;
  const base = nums.length > 1 ? `Movements ${nums[0]}–${nums.at(-1)}` : `Movement ${nums[0]}`;
  return pose.subpose ? `${base} (${pose.subpose})` : base;
}

/** Accessible description for the canvas: identifies the selected pose. */
export function poseDescription(pose, index, count) {
  const label = officialLabel(pose);
  return `3D character, pose ${index + 1} of ${count}: ${pose.name}${pose.kihap ? ', kihap' : ''}`
    + (label ? `. ${label}, draft numbering.` : '.');
}
