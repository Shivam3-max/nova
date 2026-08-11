/**
 * Capability detection. Every animation decision in the theme routes through
 * here rather than sniffing inside components, so there is exactly one place
 * that decides "should this device get the expensive version?".
 */

const mq = (q) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null);

const reducedMotionQuery = mq('(prefers-reduced-motion: reduce)');
const coarseQuery = mq('(hover: none), (pointer: coarse)');
const smallQuery = mq('(max-width: 60rem)');

export const env = {
  get reducedMotion() {
    return Boolean(reducedMotionQuery && reducedMotionQuery.matches);
  },
  get coarsePointer() {
    return Boolean(coarseQuery && coarseQuery.matches);
  },
  get small() {
    return Boolean(smallQuery && smallQuery.matches);
  },
  /** Respect the browser's data-saver signal — no WebGL, no heavy scenes. */
  get saveData() {
    const c = navigator.connection;
    return Boolean(c && (c.saveData || /2g/.test(c.effectiveType || '')));
  },
  get lowPower() {
    return (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  },
  /** Debug escape hatches: ?motion=off disables animation, ?webgl=off the GPU layer. */
  get params() {
    return new URLSearchParams(location.search);
  },
};

let webglResult = null;

/** One-time, cached WebGL probe. Never called during first paint. */
export function supportsWebGL() {
  if (webglResult !== null) return webglResult;
  if (env.params.get('webgl') === 'off') return (webglResult = false);
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    webglResult = Boolean(gl && typeof gl.getParameter === 'function');
    if (gl && gl.getExtension) gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglResult = false;
  }
  return webglResult;
}

/**
 * The single gate for cinematic motion. Animation code should ask this, not
 * `prefers-reduced-motion` directly, so the debug flag and data-saver are
 * honoured everywhere.
 */
export function allowMotion() {
  return !env.reducedMotion && env.params.get('motion') !== 'off';
}

/**
 * Should this page run a GPU scene? Phones, low-power devices, data-saver and
 * reduced-motion users all fall back to the static plate instead.
 */
export function allowWebGL() {
  return allowMotion() && !env.saveData && !env.coarsePointer && !env.lowPower && supportsWebGL();
}

export function onBreakpointChange(handler) {
  if (!smallQuery) return () => {};
  const fn = () => handler(smallQuery.matches);
  smallQuery.addEventListener('change', fn);
  return () => smallQuery.removeEventListener('change', fn);
}

export function onMotionPreferenceChange(handler) {
  if (!reducedMotionQuery) return () => {};
  const fn = () => handler(reducedMotionQuery.matches);
  reducedMotionQuery.addEventListener('change', fn);
  return () => reducedMotionQuery.removeEventListener('change', fn);
}
