/* Video gallery: filters (forms or sparring, and one tradition) kept in the address so they can be shared, reloaded
   and stepped with Back/Forward, and thumbnails that fail quietly. Without this script every card is shown, and a
   missing thumbnail leaves the frame's play panel; the watch link always works. */
export const matches = (card, state) => (state.kind === 'all' || card.kind === state.kind) && (state.tradition === 'all' || card.tradition === state.tradition);

/* Shareable filters: ?kind=form|sparring and ?tradition=wt|itf|ata. Only these fixed values are read; an unknown,
   empty or differently cased value means "all". A repeated parameter uses its first value (URLSearchParams.get), and
   the address is then rewritten with that one value, dropping the repeats. Other parameters in the address are kept. */
export const OPTIONS = Object.freeze({kind: Object.freeze(['all', 'form', 'sparring']), tradition: Object.freeze(['all', 'wt', 'itf', 'ata'])});
export function filtersFromSearch(search) {
  const params = new URLSearchParams(search), state = {};
  for (const key of Object.keys(OPTIONS)) { const v = params.get(key); state[key] = OPTIONS[key].includes(v) && v !== 'all' ? v : 'all'; }
  return state;
}
export function searchWithFilters(search, state) {
  const params = new URLSearchParams(search);
  for (const key of Object.keys(OPTIONS)) { params.delete(key); if (OPTIONS[key].includes(state[key]) && state[key] !== 'all') params.set(key, state[key]); }
  const q = params.toString(); return q ? `?${q}` : '';
}
export function countText(shown, total) {
  if (shown === total) return `Showing all ${total} videos.`;
  return `Showing ${shown} of ${total} videos.`;
}

/* A thumbnail counts as failed if it didn't load, or if YouTube served its small grey placeholder instead. */
export const thumbFailed = img => img.complete && (img.naturalWidth === 0 || img.naturalWidth < 320);
function watchThumbs() {
  for (const img of document.querySelectorAll('.vg-img')) {
    const check = () => { if (thumbFailed(img)) { img.hidden = true; img.closest('.vg-thumb')?.classList.add('is-missing'); } };
    img.addEventListener('error', check); img.addEventListener('load', check); check();
  }
}

function init() {
  watchThumbs();
  const box = document.getElementById('vg-filters'), cards = [...document.querySelectorAll('.vg-card')];
  if (!box || !cards.length) return;
  const state = filtersFromSearch(location.search), chips = [...box.querySelectorAll('.vg-chip')];
  const empty = document.getElementById('vg-empty'), count = document.getElementById('vg-count');
  // Each change is a history entry, so Back and Forward step through filter choices; reloading keeps them.
  const go = (replace = false) => {
    const search = searchWithFilters(location.search, state);
    if (search === location.search) return;
    history[replace ? 'replaceState' : 'pushState']({vg: {...state}}, '', location.pathname + search + location.hash);
  };
  function render() {
    let shown = 0;
    for (const c of cards) { const show = matches({kind: c.dataset.kind, tradition: c.dataset.tradition}, state); c.hidden = !show; if (show) shown++; }
    for (const b of chips) b.setAttribute('aria-pressed', String(state[b.dataset.filter] === b.dataset.value));
    count.textContent = countText(shown, cards.length);
    empty.hidden = shown > 0;
  }
  for (const b of chips) b.addEventListener('click', () => { state[b.dataset.filter] = b.dataset.value; render(); go(); });
  document.getElementById('vg-reset')?.addEventListener('click', () => { state.kind = state.tradition = 'all'; render(); go(); box.querySelector('.vg-chip')?.focus(); });
  addEventListener('popstate', () => { Object.assign(state, filtersFromSearch(location.search)); render(); });
  box.hidden = false; render(); go(true);   // a link with an unknown value is tidied to what is shown, without a new entry
}
if (typeof document !== 'undefined') init();
