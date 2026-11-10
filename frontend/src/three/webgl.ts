let cached: boolean | null = null;
/** Returns true if the browser can create a WebGL (2 or 1) context. */
export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return (cached = false);
    const forced = new URLSearchParams(window.location.search).get('no3d');
    if (forced === '1') return (cached = false);
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cached = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
