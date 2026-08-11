/** Minimal DOM helpers. Deliberately tiny — no framework, no jQuery. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Adds a listener and returns its own removal function. */
export function on(target, type, handler, options) {
  if (!target) return () => {};
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

/** Delegated listener — survives DOM that is replaced by section rendering. */
export function delegate(root, type, selector, handler, options) {
  return on(
    root,
    type,
    (event) => {
      const match = event.target.closest(selector);
      if (match && root.contains(match)) handler(event, match);
    },
    options
  );
}

export function focusTrap(container) {
  const SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  return on(container, 'keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = $$(SELECTOR, container).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

/**
 * Scroll locking that does not shift layout when the scrollbar disappears.
 * Reference-counted so a drawer opened over a menu does not unlock early.
 */
let lockCount = 0;
let lockedScroll = 0;

export function lockScroll() {
  if (++lockCount > 1) return;
  lockedScroll = window.scrollY;
  const barWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = barWidth > 0 ? `${barWidth}px` : '';
  document.body.classList.add('is-locked');
}

export function unlockScroll() {
  if (lockCount === 0) return;
  if (--lockCount > 0) return;
  document.body.classList.remove('is-locked');
  document.body.style.paddingRight = '';
  return lockedScroll;
}

export const raf = (fn) => requestAnimationFrame(fn);

export function nextFrame(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
export const lerp = (a, b, t) => a + (b - a) * t;

export function prefersHTML(str) {
  const tpl = document.createElement('template');
  tpl.innerHTML = str.trim();
  return tpl.content.firstElementChild;
}

/** Formats paise/cents with the shop's INR format. */
export function formatMoney(cents) {
  const value = (Number(cents) || 0) / 100;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
}
