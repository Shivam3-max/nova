/**
 * Draggable horizontal product rail.
 *
 * Pointer drag with inertia on desktop; on touch the CSS hands scrolling back
 * to the platform (see .rail__viewport in product-card.css) and this module
 * only maintains the progress bar. A drag past a small threshold suppresses the
 * click so dragging never accidentally opens a product.
 */
import { gsap } from '../animation/gsap.js';
import { $, on, clamp } from '../core/dom.js';
import { allowMotion, env } from '../core/env.js';

export function rail(root) {
  const viewport = $('.rail__viewport', root);
  const track = $('.rail__track', root);
  const bar = $('.rail__bar', root);
  if (!viewport || !track) return () => {};

  const cleanups = [];

  /* ---- Touch: native scrolling, JS only tracks progress ---- */
  if (env.coarsePointer || !allowMotion()) {
    const update = () => {
      const max = viewport.scrollWidth - viewport.clientWidth;
      const ratio = max > 0 ? viewport.scrollLeft / max : 0;
      if (bar) bar.style.transform = `scaleX(${Math.max(0.12, ratio || 0.12)})`;
    };
    cleanups.push(on(viewport, 'scroll', update, { passive: true }));
    update();
    return () => cleanups.forEach((fn) => fn());
  }

  /* ---- Pointer drag with inertia ---- */
  let maxScroll = 0;
  let position = 0;
  let target = 0;
  let dragging = false;
  let startX = 0;
  let startPos = 0;
  let moved = 0;
  let velocity = 0;
  let frame = 0;

  function measure() {
    maxScroll = Math.max(0, track.scrollWidth - viewport.clientWidth);
    target = clamp(target, -maxScroll, 0);
    position = clamp(position, -maxScroll, 0);
    apply();
  }

  function apply() {
    track.style.transform = `translate3d(${position}px, 0, 0)`;
    if (bar) {
      const ratio = maxScroll > 0 ? -position / maxScroll : 0;
      bar.style.transform = `scaleX(${Math.max(0.12, ratio)})`;
    }
  }

  function render() {
    position += (target - position) * 0.11;
    apply();
    if (Math.abs(target - position) > 0.2 || dragging) {
      frame = requestAnimationFrame(render);
    } else {
      frame = 0;
    }
  }

  function kick() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function onDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    dragging = true;
    moved = 0;
    velocity = 0;
    startX = event.clientX;
    startPos = target;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture?.(event.pointerId);
    kick();
  }

  function onMove(event) {
    if (!dragging) return;
    const delta = event.clientX - startX;
    moved = Math.abs(delta);
    velocity = delta - (target - startPos);
    target = clamp(startPos + delta, -maxScroll, 0);
    kick();
  }

  function onUp(event) {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    viewport.releasePointerCapture?.(event.pointerId);
    // Fling: carry the last pointer velocity a short distance.
    target = clamp(target + velocity * 7, -maxScroll, 0);
    kick();
  }

  // A real drag must not trigger the link underneath it.
  function onClickCapture(event) {
    if (moved > 8) {
      event.preventDefault();
      event.stopPropagation();
      moved = 0;
    }
  }

  // Trackpad horizontal scroll should drive the rail too.
  function onWheel(event) {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    target = clamp(target - event.deltaX, -maxScroll, 0);
    kick();
  }

  cleanups.push(on(viewport, 'pointerdown', onDown));
  cleanups.push(on(window, 'pointermove', onMove));
  cleanups.push(on(window, 'pointerup', onUp));
  cleanups.push(on(window, 'pointercancel', onUp));
  cleanups.push(on(viewport, 'click', onClickCapture, true));
  cleanups.push(on(viewport, 'wheel', onWheel, { passive: false }));
  cleanups.push(on(window, 'resize', measure));

  // Keyboard: arrow keys step the rail one card at a time.
  cleanups.push(
    on(viewport, 'keydown', (event) => {
      const step = viewport.clientWidth * 0.6;
      if (event.key === 'ArrowRight') target = clamp(target - step, -maxScroll, 0);
      else if (event.key === 'ArrowLeft') target = clamp(target + step, -maxScroll, 0);
      else return;
      event.preventDefault();
      kick();
    })
  );

  viewport.setAttribute('tabindex', '0');
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', root.dataset.railLabel || 'Product carousel — drag or use arrow keys');

  // Images decode asynchronously; re-measure once they land.
  const images = track.querySelectorAll('img');
  let pending = images.length;
  if (pending) {
    images.forEach((img) => {
      if (img.complete) {
        if (--pending === 0) measure();
      } else {
        cleanups.push(on(img, 'load', () => --pending === 0 && measure()));
      }
    });
  }

  measure();

  return () => {
    cancelAnimationFrame(frame);
    gsap.killTweensOf(track);
    cleanups.forEach((fn) => fn());
  };
}
