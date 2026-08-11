/**
 * Quick add sheet.
 *
 * Fetches `?section_id=quick-add` for the product — the standard Shopify
 * Section Rendering API — so the sheet is rendered by Liquid with real variant
 * data instead of being reconstructed in JavaScript. Responses are cached for
 * the session, so opening the same product twice is instant.
 */
import { gsap } from '../animation/gsap.js';
import { createOverlay } from './overlay.js';
import { $, delegate, on } from '../core/dom.js';
import { allowMotion } from '../core/env.js';
import { variantPicker } from './variant-picker.js';

const cache = new Map();

export function quickAdd(root) {
  const panel = $('.quick__panel', root);
  const scrim = $('.quick__scrim', root);
  const body = $('[data-quick-body]', root);
  const cleanups = [];

  let timeline = null;
  let disposePicker = null;

  const overlay = createOverlay(root, {
    initialFocus: () => $('.quick__close', root),
    onOpen() {
      timeline?.kill();
      if (!allowMotion()) {
        gsap.set([panel, scrim], { opacity: 1, y: 0 });
        return;
      }
      timeline = gsap
        .timeline()
        .to(scrim, { opacity: 1, duration: 0.35 }, 0)
        .fromTo(panel, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' }, 0.05);
    },
    onClose(finish) {
      timeline?.kill();
      const done = () => {
        disposePicker?.();
        disposePicker = null;
        finish();
      };
      if (!allowMotion()) {
        done();
        return false;
      }
      timeline = gsap
        .timeline({ onComplete: done })
        .to(panel, { y: 16, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
        .to(scrim, { opacity: 0, duration: 0.3 }, 0);
      return false;
    },
  });

  async function load(handle) {
    if (cache.has(handle)) return cache.get(handle);

    const url = `${window.NOVA?.routes?.root_url || '/'}products/${handle}?section_id=quick-add`.replace(
      '//products',
      '/products'
    );
    const response = await fetch(url, { headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error(`Quick add failed: ${response.status}`);

    const html = await response.text();
    cache.set(handle, html);
    return html;
  }

  cleanups.push(
    delegate(document, 'click', '[data-quick-add]', async (event, trigger) => {
      event.preventDefault();
      const handle = trigger.dataset.quickAdd;
      if (!handle) return;

      trigger.setAttribute('aria-busy', 'true');
      body.innerHTML = '<p class="search__status">Loading</p>';
      overlay.show();

      try {
        const html = await load(handle);
        body.innerHTML = html;
        disposePicker?.();
        const form = $('[data-component="variant-picker"]', body);
        if (form) disposePicker = variantPicker(form);
      } catch (error) {
        console.error('[nova] quick add failed', error);
        body.innerHTML = `<p class="search__empty">Could not load this piece. <a href="/products/${handle}">Open the full page</a>.</p>`;
      } finally {
        trigger.removeAttribute('aria-busy');
      }
    })
  );

  // Close after a successful add — the cart drawer takes over from here.
  cleanups.push(on(root, 'nova:added', () => overlay.hide()));

  $('[data-quick-close]', root) && cleanups.push(on($('[data-quick-close]', root), 'click', () => overlay.hide()));
  if (scrim) cleanups.push(on(scrim, 'click', () => overlay.hide()));

  return () => {
    timeline?.kill();
    disposePicker?.();
    cleanups.forEach((fn) => fn());
    overlay.destroy();
  };
}
