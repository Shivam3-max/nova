/**
 * Scroll reveals.
 *
 * A single IntersectionObserver for the whole document rather than a
 * ScrollTrigger per element — reveals are the most numerous animation on the
 * page and they do not need scrub, only a one-shot state change.
 */
import { allowMotion } from '../core/env.js';
import { gsap } from './gsap.js';
import { splitLines } from './split.js';

let observer = null;

const REVEAL_SELECTOR = '[data-reveal]:not(.is-revealed)';

function revealElement(el) {
  el.classList.add('is-revealed');

  const delay = parseFloat(el.dataset.revealDelay || 0);
  const stagger = parseFloat(el.dataset.revealStagger || 0.06);

  // Headline treatment: split into lines and roll them up.
  // Empty target lists are checked before every tween — GSAP only warns and
  // carries on, which turns a real markup problem into console noise.
  if (el.dataset.reveal === 'lines') {
    const { lines } = splitLines(el);
    if (lines.length) {
      gsap.fromTo(
        lines,
        { yPercent: 108 },
        { yPercent: 0, duration: 1.05, ease: 'power4.out', stagger, delay }
      );
    }
    return;
  }

  // Children stagger: the element is a container, its children animate.
  if (el.dataset.revealChildren) {
    const children = el.querySelectorAll(el.dataset.revealChildren);
    if (children.length) {
      gsap.fromTo(
        children,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, stagger, delay, ease: 'power3.out' }
      );
    }
  }
}

function ensureObserver() {
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        revealElement(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );

  return observer;
}

/** Observe every unrevealed element inside `root`. */
export function initReveals(root = document) {
  const targets = root.querySelectorAll(REVEAL_SELECTOR);

  if (!allowMotion()) {
    // Reduced motion: show everything immediately, no observer at all.
    targets.forEach((el) => el.classList.add('is-revealed'));
    return () => {};
  }

  const io = ensureObserver();
  targets.forEach((el) => io.observe(el));

  return () => targets.forEach((el) => io.unobserve(el));
}

/**
 * Reveal anything already above the fold without waiting for a scroll event —
 * avoids a flash of invisible hero content on load.
 */
export function revealAboveFold() {
  document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      if (!allowMotion()) el.classList.add('is-revealed');
      else revealElement(el);
      observer?.unobserve(el);
    }
  });
}
