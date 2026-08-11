/**
 * Fullscreen search with Shopify predictive search.
 *
 * Hits /search/suggest.json — the same endpoint a real store exposes — and
 * renders product cards from the JSON. Requests are debounced and the previous
 * one is aborted, so fast typing never lands results out of order.
 */
import { gsap } from '../animation/gsap.js';
import { createOverlay } from './overlay.js';
import { $, $$, on, formatMoney } from '../core/dom.js';
import { allowMotion } from '../core/env.js';

const DEBOUNCE = 220;

export function search(root) {
  const sheet = $('.search__sheet', root);
  const input = $('[data-search-input]', root);
  const results = $('[data-search-results]', root);
  const status = $('[data-search-status]', root);
  const defaults = $('[data-search-default]', root);
  const triggers = $$('[data-search-open]');
  const closers = $$('[data-search-close]', root);
  const cleanups = [];

  const endpoint = window.NOVA?.routes?.predictive_search_url || '/search/suggest';

  let controller = null;
  let timer = null;
  let timeline = null;

  const overlay = createOverlay(root, {
    initialFocus: () => input,
    onOpen() {
      triggers.forEach((t) => t.setAttribute('aria-expanded', 'true'));
      timeline?.kill();

      if (!allowMotion()) {
        gsap.set(sheet, { clipPath: 'inset(0 0 0% 0)' });
        return;
      }

      timeline = gsap.fromTo(
        sheet,
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'power4.out' }
      );
    },
    onClose(finish) {
      triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
      controller?.abort();
      clearTimeout(timer);
      timeline?.kill();

      if (!allowMotion()) {
        finish();
        return false;
      }

      timeline = gsap.to(sheet, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.5,
        ease: 'power3.inOut',
        onComplete: finish,
      });

      return false;
    },
  });

  triggers.forEach((trigger) => {
    trigger.setAttribute('aria-expanded', 'false');
    cleanups.push(
      on(trigger, 'click', (event) => {
        event.preventDefault();
        overlay.show();
      })
    );
  });

  closers.forEach((el) => cleanups.push(on(el, 'click', () => overlay.hide())));

  /* ---------------------------- querying ---------------------------- */

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  function showDefaults() {
    if (results) results.innerHTML = '';
    defaults?.removeAttribute('hidden');
    setStatus('');
  }

  async function run(term) {
    controller?.abort();
    controller = new AbortController();

    const url = `${endpoint}?q=${encodeURIComponent(term)}&resources[type]=product,collection&resources[limit]=8`;

    try {
      setStatus('Searching');
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);

      const data = await response.json();
      render(data?.resources?.results || {}, term);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('[nova] search failed', error);
      setStatus('Search unavailable');
    }
  }

  function render(payload, term) {
    const products = payload.products || [];
    const collections = payload.collections || [];

    defaults?.setAttribute('hidden', '');

    if (!products.length && !collections.length) {
      results.innerHTML = `<p class="search__empty">No pieces match “${escapeHTML(term)}”. Try a category — hoodie, cargo, shirt.</p>`;
      setStatus('0 results');
      return;
    }

    const cards = products
      .map(
        (product) => `
        <a class="pcard pcard--single" href="${product.url}" data-cursor="view">
          <span class="pcard__media">
            <img class="pcard__img pcard__img--main" src="${product.featured_image?.url || ''}"
                 alt="${escapeHTML(product.title)}" loading="lazy" width="1000" height="1250">
          </span>
          <span class="pcard__body">
            <span class="pcard__title">${escapeHTML(product.title)}</span>
            <span class="pcard__price">${formatMoney(product.price)}</span>
          </span>
        </a>`
      )
      .join('');

    const collectionRow = collections.length
      ? `<div class="search__collections">
           <p class="search__group-title">Collections</p>
           <div class="search__terms">
             ${collections.map((c) => `<a class="search__term" href="${c.url}">${escapeHTML(c.title)}</a>`).join('')}
           </div>
         </div>`
      : '';

    results.innerHTML = `${collectionRow}<div class="search__hits">${cards}</div>`;
    setStatus(`${products.length} result${products.length === 1 ? '' : 's'}`);

    if (allowMotion()) {
      gsap.fromTo(
        results.querySelectorAll('.pcard'),
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'power3.out' }
      );
    }
  }

  if (input) {
    cleanups.push(
      on(input, 'input', () => {
        const term = input.value.trim();
        clearTimeout(timer);

        if (term.length < 2) {
          controller?.abort();
          showDefaults();
          return;
        }

        timer = setTimeout(() => run(term), DEBOUNCE);
      })
    );
  }

  return () => {
    clearTimeout(timer);
    controller?.abort();
    timeline?.kill();
    cleanups.forEach((fn) => fn());
    overlay.destroy();
  };
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}
