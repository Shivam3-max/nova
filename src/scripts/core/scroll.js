/**
 * Smooth scrolling.
 *
 * This intentionally does NOT transform a wrapper element (the usual approach
 * in Lenis/ScrollSmoother). The storefront leans on `position: sticky` for the
 * product page, the story section and the collection toolbar, and transformed
 * ancestors break sticky. Instead we damp the *real* scroll position: wheel
 * events are captured, a target is integrated, and window.scrollTo eases toward
 * it each frame. Sticky, ScrollTrigger, anchor links and the scrollbar all keep
 * working because the document really is scrolling.
 *
 * Touch devices keep native momentum scrolling — it is better than anything
 * synthesised here, and it costs no main-thread work.
 */
import { env, allowMotion } from './env.js';
import { clamp, lerp } from './dom.js';

const state = {
  enabled: false,
  target: 0,
  current: 0,
  running: false,
  frame: 0,
  listeners: new Set(),
  velocity: 0,
};

const maxScroll = () =>
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

function tick() {
  if (!state.enabled) {
    state.running = false;
    return;
  }

  const previous = state.current;
  state.current = lerp(state.current, state.target, 0.12);
  state.velocity = state.current - previous;

  if (Math.abs(state.target - state.current) < 0.35) {
    state.current = state.target;
    state.velocity = 0;
    window.scrollTo(0, state.current);
    state.running = false;
    notify();
    return;
  }

  window.scrollTo(0, state.current);
  notify();
  state.frame = requestAnimationFrame(tick);
}

function notify() {
  state.listeners.forEach((fn) => fn(state.current, state.velocity));
}

function start() {
  if (state.running) return;
  state.running = true;
  state.frame = requestAnimationFrame(tick);
}

function onWheel(event) {
  if (!state.enabled) return;
  // Let scrollable panels (cart drawer, search results, mega menu) scroll
  // themselves rather than driving the page behind them.
  if (event.target.closest('[data-scroll-native]')) return;
  if (event.ctrlKey) return; // pinch-zoom

  event.preventDefault();
  const delta = normalizeWheel(event);
  state.target = clamp(state.target + delta, 0, maxScroll());
  start();
}

function normalizeWheel(event) {
  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 18; // lines
  else if (event.deltaMode === 2) delta *= window.innerHeight; // pages
  return delta * 1.05;
}

/** Keep the target honest when something else scrolls the page. */
function onNativeScroll() {
  if (!state.running) {
    state.current = window.scrollY;
    state.target = window.scrollY;
  }
}

function onResize() {
  state.target = clamp(state.target, 0, maxScroll());
}

export function initSmoothScroll() {
  // Native scrolling on touch, reduced motion, and low-power devices.
  if (env.coarsePointer || !allowMotion() || env.lowPower) {
    state.enabled = false;
    return () => {};
  }

  state.enabled = true;
  state.current = window.scrollY;
  state.target = window.scrollY;

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', onNativeScroll, { passive: true });
  window.addEventListener('resize', onResize);

  return () => {
    state.enabled = false;
    cancelAnimationFrame(state.frame);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('scroll', onNativeScroll);
    window.removeEventListener('resize', onResize);
  };
}

/** Smoothly scroll to an element or absolute offset. */
export function scrollToTarget(target, offset = 0) {
  const node = typeof target === 'string' ? document.querySelector(target) : target;
  const y =
    typeof target === 'number'
      ? target
      : node
        ? window.scrollY + node.getBoundingClientRect().top + offset
        : null;

  if (y == null) return;

  if (!state.enabled) {
    window.scrollTo({ top: y, behavior: allowMotion() ? 'smooth' : 'auto' });
    return;
  }

  state.target = clamp(y, 0, maxScroll());
  start();
}

/** Pause damping while a modal owns the viewport. */
export function pauseSmoothScroll() {
  state.enabled = false;
}

export function resumeSmoothScroll() {
  if (env.coarsePointer || !allowMotion() || env.lowPower) return;
  state.current = window.scrollY;
  state.target = window.scrollY;
  state.enabled = true;
}

export function onScrollFrame(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

export const scrollVelocity = () => state.velocity;
