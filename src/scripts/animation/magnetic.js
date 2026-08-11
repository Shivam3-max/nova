/**
 * Magnetic hover for buttons and nav actions.
 *
 * Pointer position is written to CSS custom properties and the easing lives in
 * CSS, so nothing here runs a per-frame tween. Only elements currently under
 * the pointer do any work.
 */
import { allowMotion, env } from '../core/env.js';
import { clamp } from '../core/dom.js';

export function initMagnetic(root = document) {
  if (!allowMotion() || env.coarsePointer) return () => {};

  const targets = Array.from(root.querySelectorAll('[data-magnetic]'));
  const cleanups = [];

  for (const el of targets) {
    const strength = parseFloat(el.dataset.magnetic) || 0.32;
    const radius = parseFloat(el.dataset.magneticRadius) || 90;
    let frame = 0;

    const move = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (event.clientX - cx) * strength;
        const dy = (event.clientY - cy) * strength;
        el.style.setProperty('--mx', `${clamp(dx, -radius, radius)}px`);
        el.style.setProperty('--my', `${clamp(dy, -radius, radius)}px`);
      });
    };

    const enter = () => el.classList.add('is-magnet-active');

    const leave = () => {
      cancelAnimationFrame(frame);
      el.classList.remove('is-magnet-active');
      el.style.setProperty('--mx', '0px');
      el.style.setProperty('--my', '0px');
    };

    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('blur', leave);

    cleanups.push(() => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('blur', leave);
      leave();
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
