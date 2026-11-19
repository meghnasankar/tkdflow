/* Video gallery: filters (forms or sparring, and one tradition) and thumbnails that fail quietly. Without this
   script every card is shown, and a missing thumbnail leaves the frame's play panel; the watch link always works. */
export const matches = (card, state) => (state.kind === 'all' || card.kind === state.kind) && (state.tradition === 'all' || card.tradition === state.tradition);
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
  const state = {kind: 'all', tradition: 'all'}, chips = [...box.querySelectorAll('.vg-chip')];
  const empty = document.getElementById('vg-empty'), count = document.getElementById('vg-count');
  function render() {
    let shown = 0;
    for (const c of cards) { const show = matches({kind: c.dataset.kind, tradition: c.dataset.tradition}, state); c.hidden = !show; if (show) shown++; }
    for (const b of chips) b.setAttribute('aria-pressed', String(state[b.dataset.filter] === b.dataset.value));
    count.textContent = countText(shown, cards.length);
    empty.hidden = shown > 0;
  }
  for (const b of chips) b.addEventListener('click', () => { state[b.dataset.filter] = b.dataset.value; render(); });
  document.getElementById('vg-reset')?.addEventListener('click', () => { state.kind = state.tradition = 'all'; render(); box.querySelector('.vg-chip')?.focus(); });
  box.hidden = false; render();
}
if (typeof document !== 'undefined') init();
