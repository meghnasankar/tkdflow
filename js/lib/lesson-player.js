/* Lesson playback controller. Holds the single source of truth for which
   pose is selected and whether playback is running. Every action notifies
   subscribers with the full state, so canvas, text, Korean label, selected
   row, progress and play button are always rendered from the same index.
   Timing is injected (setTimeout by default) so it can be tested in Node. */

export class LessonPlayer {
  constructor(count, { holdMs = 1300, transitionMs = 420, schedule = (fn, ms) => setTimeout(fn, ms), cancel = (id) => clearTimeout(id) } = {}) {
    if (!Number.isInteger(count) || count < 1) throw new Error('LessonPlayer needs at least one pose');
    this.count = count;
    this.index = 0;
    this.playing = false;
    this.holdMs = holdMs;
    this.transitionMs = transitionMs;
    this._schedule = schedule;
    this._cancel = cancel;
    this._timer = null;
    this._listeners = new Set();
  }

  get atEnd() { return this.index === this.count - 1; }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(from, cause) {
    const snapshot = { index: this.index, from, playing: this.playing, cause, count: this.count };
    for (const fn of this._listeners) fn(snapshot);
  }

  _clearTimer() {
    if (this._timer !== null) this._cancel(this._timer);
    this._timer = null;
  }

  _queueAdvance() {
    this._clearTimer();
    this._timer = this._schedule(() => {
      this._timer = null;
      if (!this.playing) return;
      if (this.atEnd) { this.playing = false; this._emit(this.index, 'ended'); return; }
      const from = this.index;
      this.index += 1;
      this._emit(from, 'advance');
      this._queueAdvance();
    }, this.holdMs + this.transitionMs);
  }

  /** Jump to a pose. Manual navigation always pauses playback. */
  select(i, cause = 'select') {
    const target = Math.max(0, Math.min(this.count - 1, Math.trunc(Number(i)) || 0));
    const from = this.index;
    const wasPlaying = this.playing;
    this.playing = false;
    this._clearTimer();
    this.index = target;
    if (target !== from || wasPlaying) this._emit(from, cause);
    else this._emit(from, cause); // still notify: UI re-syncs (e.g. after replay)
  }

  next() { this.select(this.index + 1, 'next'); }
  prev() { this.select(this.index - 1, 'prev'); }
  first() { this.select(0, 'first'); }
  last() { this.select(this.count - 1, 'last'); }

  play() {
    if (this.playing) return;
    const from = this.index;
    if (this.atEnd) this.index = 0; // replay from the start
    this.playing = true;
    this._emit(from, 'play');
    this._queueAdvance();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this._clearTimer();
    this._emit(this.index, 'pause');
  }

  toggle() { (this.playing ? this.pause : this.play).call(this); }

  setHold(ms) {
    this.holdMs = ms;
    if (this.playing) this._queueAdvance();
  }

  destroy() {
    this._clearTimer();
    this._listeners.clear();
  }
}
