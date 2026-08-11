/**
 * Custom cursor — desktop pointer devices only.
 *
 * States are declared in markup with `data-cursor="view|add|drag|enter"`, so
 * components never talk to the cursor directly. One rAF loop, one element.
 */
import { allowMotion, env } from '../core/env.js';
import { lerp } from '../core/dom.js';

const LABELS = {
  view: 'View',
  shop: 'Shop',
  add: 'Add',
  drag: 'Drag',
  enter: 'Enter',
  explore: 'Explore',
};

export function initCursor() {
  if (env.coarsePointer || !allowMotion()) return () => {};

  const root = document.createElement('div');
  root.className = 'cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="cursor__dot"></div>
    <div class="cursor__ring"><span class="cursor__label"></span></div>
  `;
  document.body.appendChild(root);
  document.documentElement.classList.add('has-custom-cursor');

  const label = root.querySelector('.cursor__label');

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const target = { ...pos };
  let visible = false;
  let frame = 0;

  const render = () => {
    // Slight lag on the ring is what makes it feel like a physical object
    // rather than a cursor replacement.
    pos.x = lerp(pos.x, target.x, 0.19);
    pos.y = lerp(pos.y, target.y, 0.19);
    root.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    frame = requestAnimationFrame(render);
  };

  const onMove = (event) => {
    target.x = event.clientX;
    target.y = event.clientY;
    if (!visible) {
      visible = true;
      root.style.opacity = '1';
      pos.x = target.x;
      pos.y = target.y;
    }

    const hit = event.target.closest('[data-cursor]');
    const state = hit?.dataset.cursor;

    if (state && LABELS[state]) {
      label.textContent = hit.dataset.cursorLabel || LABELS[state];
      root.classList.add('is-active');
      root.classList.toggle('is-drag', state === 'drag');
    } else {
      root.classList.remove('is-active', 'is-drag');
    }
  };

  const onLeave = () => {
    visible = false;
    root.style.opacity = '0';
  };

  const onDown = () => root.classList.add('is-down');
  const onUp = () => root.classList.remove('is-down');

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  document.addEventListener('pointerleave', onLeave);
  frame = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointerleave', onLeave);
    document.documentElement.classList.remove('has-custom-cursor');
    root.remove();
  };
}
