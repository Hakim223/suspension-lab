/**
 * Mutable simulation clock shared by the render loop and the timeline UI.
 * Kept outside React state so 60 fps updates never trigger React re-renders.
 */
export const simClock = {
  t: 0,
  duration: 5,
  wheelAngle: 0,
  explode: 0,
  /** Set by the timeline scrubber; consumed by the render loop. */
  seekTo: null as number | null,
  listeners: new Set<() => void>(),
  reset() {
    this.t = 0;
    this.wheelAngle = 0;
    this.seekTo = null;
    this.emit();
  },
  emit() {
    this.listeners.forEach((l) => l());
  },
};
