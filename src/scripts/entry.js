/**
 * NØVA entry point.
 *
 * Boots the core systems, registers every component, and mounts whatever the
 * current template put on the page. Three.js is never imported here — the hero
 * and the 3D viewer pull it in on demand, so a customer who lands on a
 * collection page downloads none of it.
 */
import { register, mountAll, bindThemeEditor } from './core/registry.js';
import { initSmoothScroll, scrollToTarget } from './core/scroll.js';
import { allowMotion } from './core/env.js';
import { initReveals, revealAboveFold } from './animation/reveal.js';
import { initMagnetic } from './animation/magnetic.js';
import { initCursor } from './animation/cursor.js';
import { queueRefresh } from './animation/gsap.js';

import { header } from './components/header.js';
import { megaMenu } from './components/mega-menu.js';
import { search } from './components/search.js';
import { cartDrawer } from './components/cart-drawer.js';
import { quickAdd } from './components/quick-add.js';
import { variantPicker } from './components/variant-picker.js';
import { productViewer } from './components/product-viewer.js';
import { accordion } from './components/accordion.js';
import { rail } from './components/rail.js';
import { worlds } from './components/worlds.js';
import { countdown } from './components/countdown.js';
import { story } from './components/story.js';
import { hero } from './components/hero.js';
import { finale } from './components/finale.js';
import { initAddToCart } from './components/add-to-cart.js';
import {
  initWishlist,
  quantity,
  newsletter,
  collectionTools,
  parallax,
  initAnchors,
} from './components/misc.js';

/* ------------------------------------------------------------------ */
/* Component registry                                                  */
/* ------------------------------------------------------------------ */

register('header', header);
register('mega-menu', megaMenu);
register('search', search);
register('cart-drawer', cartDrawer);
register('quick-add', quickAdd);
register('variant-picker', variantPicker);
register('product-viewer', productViewer);
register('accordion', accordion);
register('rail', rail);
register('worlds', worlds);
register('countdown', countdown);
register('story', story);
register('hero', hero);
register('finale', finale);
register('quantity', quantity);
register('newsletter', newsletter);
register('collection-tools', collectionTools);
register('parallax', parallax);

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

const teardowns = [];

function boot() {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  teardowns.push(initSmoothScroll());
  teardowns.push(initCursor());
  teardowns.push(initAddToCart());
  teardowns.push(initWishlist());
  teardowns.push(initMagnetic());
  teardowns.push(initReveals());
  teardowns.push(initAnchors(scrollToTarget));

  mountAll(document);
  bindThemeEditor();

  revealAboveFold();

  // Layout settles after images decode and the font swaps; ScrollTrigger needs
  // to know about it or every start/end position is measured against the wrong
  // page height.
  if (document.fonts?.ready) document.fonts.ready.then(queueRefresh);
  window.addEventListener('load', queueRefresh, { once: true });

  document.dispatchEvent(new CustomEvent('nova:mounted'));

  if (!allowMotion()) {
    document.documentElement.classList.add('reduced-motion');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

/* Clean up on navigation so a bfcache restore does not double-bind. */
window.addEventListener('pagehide', () => {
  teardowns.forEach((fn) => {
    try {
      fn?.();
    } catch {
      /* teardown must never throw during unload */
    }
  });
});
