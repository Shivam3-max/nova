/**
 * CHOOSE YOUR WORLD — expanding collection cards.
 *
 * Sets a --grow flex factor per card; CSS owns the easing. Pointer only: on
 * touch the CSS turns the row into a grid and this module does nothing, which
 * is the correct behaviour rather than a tap-to-expand pattern nobody expects.
 */
import { $$, on } from '../core/dom.js';
import { env, allowMotion } from '../core/env.js';

const GROW_ACTIVE = 2.35;
const GROW_IDLE = 0.78;

export function worlds(root) {
  if (env.coarsePointer || !allowMotion()) return () => {};

  const cards = $$('.world', root);
  if (!cards.length) return () => {};

  const cleanups = [];

  function setActive(active) {
    cards.forEach((card) => {
      const isActive = card === active;
      card.classList.toggle('is-active', isActive);
      card.style.setProperty('--grow', active ? (isActive ? GROW_ACTIVE : GROW_IDLE) : 1);
    });
  }

  cards.forEach((card) => {
    cleanups.push(on(card, 'pointerenter', () => setActive(card)));
    // Keyboard users get the same expansion when the card link is focused.
    const link = card.querySelector('a');
    if (link) {
      cleanups.push(on(link, 'focus', () => setActive(card)));
      cleanups.push(on(link, 'blur', () => setActive(null)));
    }
  });

  cleanups.push(on(root, 'pointerleave', () => setActive(null)));

  setActive(null);

  return () => {
    cleanups.forEach((fn) => fn());
    cards.forEach((card) => card.style.removeProperty('--grow'));
  };
}
