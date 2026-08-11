/**
 * GSAP setup and a scoped scene helper.
 *
 * Everything animated on scroll goes through `createScene`, which returns a
 * gsap.Context. Calling the returned teardown reverts every tween and kills
 * every ScrollTrigger created inside it — this is what keeps the theme editor
 * and the WebGL scenes from leaking.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { allowMotion } from '../core/env.js';

gsap.registerPlugin(ScrollTrigger);

gsap.defaults({
  ease: 'power3.out',
  duration: 0.8,
});

/* Reduced motion: collapse every tween to an instant state change. GSAP's
   matchMedia would also work, but this is global and cannot be forgotten. */
if (!allowMotion()) {
  gsap.globalTimeline.timeScale(1000);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

ScrollTrigger.config({
  // The custom smooth scroller writes real scroll positions, so ScrollTrigger
  // needs no scrollerProxy — but resize churn on mobile URL-bar show/hide
  // should not re-run every calculation.
  ignoreMobileResize: true,
});

export { gsap, ScrollTrigger };

/**
 * Create an animation scope bound to a root element.
 * @param {Element} root
 * @param {(ctx: { self: gsap.Context, root: Element }) => void} build
 * @returns {() => void} teardown
 */
export function createScene(root, build) {
  if (!root) return () => {};

  const ctx = gsap.context((self) => {
    build({ self, root });
  }, root);

  return () => ctx.revert();
}

/** Refresh triggers after layout-affecting work (images decoding, font swap). */
export function refreshTriggers() {
  ScrollTrigger.refresh();
}

let refreshQueued = false;

export function queueRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    ScrollTrigger.refresh();
  });
}
