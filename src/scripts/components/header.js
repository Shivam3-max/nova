/**
 * Floating header.
 *
 * Three behaviours, all driven by one scroll listener:
 *   - transparent over the hero, solid once past it
 *   - compact height after a threshold
 *   - hide on scroll-down, reveal on scroll-up (never while a panel is open)
 */
import { on } from '../core/dom.js';
import { onCartUpdate } from '../shopify/cart.js';
import { allowMotion } from '../core/env.js';

export function header(root) {
  const hero = document.querySelector('[data-hero-sentinel]');
  const counts = root.querySelectorAll('[data-bag-count]');

  let lastY = window.scrollY;
  let ticking = false;
  let panelOpen = false;

  const COMPACT_AT = 120;

  const update = () => {
    const y = window.scrollY;
    const heroHeight = hero ? hero.offsetHeight - 80 : 0;

    root.classList.toggle('is-over-hero', Boolean(hero) && y < heroHeight);
    root.classList.toggle('is-pinned', y > (hero ? heroHeight : 8));
    root.classList.toggle('is-compact', y > COMPACT_AT);

    // Only hide once well past the fold, and never while a panel is open.
    const goingDown = y > lastY && y > 240;
    root.classList.toggle('is-hidden', goingDown && !panelOpen && allowMotion());

    lastY = y;
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  const offScroll = on(window, 'scroll', onScroll, { passive: true });
  const offResize = on(window, 'resize', update);

  // Any open overlay pins the header in place.
  const offPanel = on(document, 'nova:panel', (event) => {
    panelOpen = event.detail.open;
    if (panelOpen) root.classList.remove('is-hidden');
  });

  // Bag counter — bumps when the cart changes, not on first paint.
  let seeded = false;
  const offCart = onCartUpdate((cart) => {
    const value = String(cart?.item_count ?? 0);
    counts.forEach((node) => {
      const changed = node.textContent.trim() !== value;
      node.textContent = value;
      if (seeded && changed && allowMotion()) {
        node.classList.remove('is-bumped');
        void node.offsetWidth; // restart the animation
        node.classList.add('is-bumped');
      }
    });
    seeded = true;
  });

  update();

  return () => {
    offScroll();
    offResize();
    offPanel();
    offCart();
  };
}
