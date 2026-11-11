/** Lightweight list of anatomy models (no three.js import) for links and counts. Kept in sync by tests. */
export const ANATOMY_CATALOG = [
  { id: 'shock-absorber', name: 'Shock absorber twin-tube' },
  { id: 'strut-mount', name: 'Strut mount dengan bearing' },
  { id: 'ball-joint', name: 'Ball joint / tie rod end' },
  { id: 'control-arm-bushing', name: 'Bushing lengan (karet-logam)' },
  { id: 'wheel-bearing', name: 'Hub bearing (Gen 2/3)' },
  { id: 'stabilizer-link', name: 'Stabilizer link' },
  { id: 'rack-pinion', name: 'Rack & pinion dengan rack guide' },
  { id: 'eps-column', name: 'EPS column-assist' },
] as const;

export const hasAnatomy = (id?: string) => !!id && ANATOMY_CATALOG.some((a) => a.id === id);
