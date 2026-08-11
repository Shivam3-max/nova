/**
 * Small behaviours that do not warrant a module each: wishlist, newsletter,
 * quantity steppers, collection sort, and parallax on campaign plates.
 */
import { gsap, ScrollTrigger, createScene } from '../animation/gsap.js';
import { $, $$, on, delegate, clamp } from '../core/dom.js';
import { allowMotion } from '../core/env.js';

/* --------------------------------------------------------------------------
   Wishlist — localStorage only.
   A real store would persist this to a customer metafield or an app; this is
   deliberately a thin client-side stub with a single storage key so it is easy
   to swap for the real thing.
   -------------------------------------------------------------------------- */

const WISHLIST_KEY = 'nova:wishlist';

function readWishlist() {
  try {
    return new Set(JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeWishlist(set) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify([...set]));
  } catch {
    /* private mode — wishlist simply does not persist */
  }
}

export function initWishlist() {
  const sync = () => {
    const saved = readWishlist();
    $$('[data-wishlist]').forEach((button) => {
      const on = saved.has(button.dataset.wishlist);
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Save to wishlist');
    });
  };

  const off = delegate(document, 'click', '[data-wishlist]', (event, button) => {
    event.preventDefault();
    event.stopPropagation();

    const saved = readWishlist();
    const id = button.dataset.wishlist;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    writeWishlist(saved);
    sync();

    if (allowMotion()) {
      gsap.fromTo(button, { scale: 0.72 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
    }
  });

  sync();
  document.addEventListener('nova:mounted', sync);

  return () => off();
}

/* --------------------------------------------------------------------------
   Quantity steppers (outside the cart drawer, which has its own)
   -------------------------------------------------------------------------- */

export function quantity(root) {
  const input = $('[data-quantity-input]', root);
  if (!input) return () => {};

  const step = (delta) => {
    const min = Number(input.min || 1);
    const next = clamp(Number(input.value || 1) + delta, min, 99);
    input.value = String(next);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const cleanups = [
    on($('[data-quantity-minus]', root), 'click', () => step(-1)),
    on($('[data-quantity-plus]', root), 'click', () => step(1)),
  ];

  return () => cleanups.forEach((fn) => fn());
}

/* --------------------------------------------------------------------------
   Newsletter — Shopify customer form with inline success/error handling.
   -------------------------------------------------------------------------- */

export function newsletter(root) {
  const form = root.tagName === 'FORM' ? root : $('form', root);
  const note = $('[data-news-note]', root);
  if (!form) return () => {};

  const off = on(form, 'submit', () => {
    // Shopify handles the POST; this only animates the acknowledgement so the
    // interaction does not feel like a full page reload with no feedback.
    if (note && allowMotion()) {
      gsap.fromTo(note, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
    }
  });

  return () => off();
}

/* --------------------------------------------------------------------------
   Collection sort — submit on change, no Apply button.
   -------------------------------------------------------------------------- */

export function collectionTools(root) {
  const select = $('[data-sort]', root);
  if (!select) return () => {};

  const off = on(select, 'change', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('sort_by', select.value);
    url.searchParams.delete('page');
    window.location.assign(url.toString());
  });

  return () => off();
}

/* --------------------------------------------------------------------------
   Depth parallax on full-bleed campaign plates.
   -------------------------------------------------------------------------- */

export function parallax(root) {
  if (!allowMotion()) return () => {};

  const layers = $$('[data-parallax]', root);
  if (!layers.length) return () => {};

  return createScene(root, () => {
    layers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.parallax) || 0.15;
      gsap.fromTo(
        layer,
        { yPercent: -depth * 50 },
        {
          yPercent: depth * 50,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    });
  });
}

/* --------------------------------------------------------------------------
   Anchor links routed through the smooth scroller.
   -------------------------------------------------------------------------- */

export function initAnchors(scrollTo) {
  return delegate(document, 'click', 'a[href^="#"]:not([href="#"])', (event, link) => {
    const id = link.getAttribute('href');
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    scrollTo(target, -80);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}

export { ScrollTrigger };
