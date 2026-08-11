/**
 * Cart drawer.
 *
 * Renders from the live Shopify cart object (/cart.js) rather than from server
 * HTML, so it stays correct after quick-add, PDP add, and quantity edits
 * without a section re-render round trip.
 */
import { gsap } from '../animation/gsap.js';
import { createOverlay } from './overlay.js';
import { $, $$, on, delegate, formatMoney } from '../core/dom.js';
import { allowMotion } from '../core/env.js';
import { onCartUpdate, fetchCart, changeItem, removeItem, shippingProgress } from '../shopify/cart.js';

export function cartDrawer(root) {
  const panel = $('.drawer__panel', root);
  const scrim = $('.drawer__scrim', root);
  const list = $('[data-cart-lines]', root);
  const empty = $('[data-cart-empty]', root);
  const foot = $('[data-cart-foot]', root);
  const totalNode = $('[data-cart-total]', root);
  const countNode = $('[data-cart-count]', root);
  const ship = $('[data-ship]', root);
  const shipLabel = $('[data-ship-label]', root);
  const shipFill = $('[data-ship-fill]', root);
  const cleanups = [];

  let timeline = null;

  const overlay = createOverlay(root, {
    initialFocus: () => $('.drawer__close', root),
    onOpen() {
      timeline?.kill();
      if (!allowMotion()) {
        gsap.set(panel, { xPercent: 0 });
        gsap.set(scrim, { opacity: 1 });
        return;
      }
      timeline = gsap
        .timeline()
        .to(scrim, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
        .fromTo(
          panel,
          { xPercent: 100 },
          { xPercent: 0, duration: 0.7, ease: 'expo.out' },
          0
        )
        .fromTo(
          $$('.line, .drawer__foot > *', root),
          { x: 26, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.045, ease: 'power3.out' },
          0.16
        );
    },
    onClose(finish) {
      timeline?.kill();
      if (!allowMotion()) {
        finish();
        return false;
      }
      timeline = gsap
        .timeline({ onComplete: finish })
        .to(panel, { xPercent: 100, duration: 0.5, ease: 'power3.inOut' }, 0)
        .to(scrim, { opacity: 0, duration: 0.4 }, 0);
      return false;
    },
  });

  // Openers live anywhere on the page (header bag, toast, empty-state links).
  cleanups.push(
    delegate(document, 'click', '[data-cart-open]', (event) => {
      event.preventDefault();
      overlay.show();
    })
  );

  $$('[data-cart-close]', root).forEach((el) => cleanups.push(on(el, 'click', () => overlay.hide())));
  if (scrim) cleanups.push(on(scrim, 'click', () => overlay.hide()));

  // Open automatically whenever something is added to the bag.
  cleanups.push(
    on(document, 'nova:cart:updated', (event) => {
      if (event.detail.reason === 'add' && !overlay.isOpen) overlay.show();
    })
  );

  /* ---------------------------- rendering ---------------------------- */

  function render(cart) {
    if (!cart) return;

    const count = cart.item_count || 0;
    if (countNode) countNode.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

    const isEmpty = count === 0;
    empty?.toggleAttribute('hidden', !isEmpty);
    list?.toggleAttribute('hidden', isEmpty);
    foot?.toggleAttribute('hidden', isEmpty);
    ship?.toggleAttribute('hidden', isEmpty);

    if (!isEmpty && list) {
      list.innerHTML = cart.items.map(lineHTML).join('');
    }

    if (totalNode) totalNode.textContent = formatMoney(cart.total_price);

    // Free shipping meter
    const progress = shippingProgress(cart);
    if (ship && progress.threshold) {
      shipFill?.style.setProperty('--progress', String(progress.progress));
      ship.classList.toggle('is-complete', progress.qualified);
      if (shipLabel) {
        shipLabel.innerHTML = progress.qualified
          ? 'You have unlocked <strong>free shipping</strong>'
          : `<strong>${formatMoney(progress.remaining)}</strong> away from free shipping`;
      }
    }
  }

  function lineHTML(item) {
    const variant = item.options_with_values
      ?.filter((o) => o.value && o.value !== 'Default Title')
      .map((o) => o.value)
      .join(' / ');

    return `
      <li class="line" data-line-key="${item.key}">
        <a class="line__media" href="${item.url}" tabindex="-1" aria-hidden="true">
          <img src="${item.featured_image?.url || item.image || ''}" alt=""
               width="200" height="250" loading="lazy">
        </a>
        <div class="line__body">
          <div class="line__top">
            <a class="line__title" href="${item.url}">${item.product_title}</a>
            <span class="line__price">${formatMoney(item.final_line_price)}</span>
          </div>
          ${variant ? `<p class="line__variant">${variant}</p>` : ''}
          <div class="line__foot">
            <div class="qty">
              <button class="qty__btn" type="button" data-line-minus aria-label="Decrease quantity">−</button>
              <input class="qty__input" type="number" min="0" value="${item.quantity}"
                     data-line-qty aria-label="Quantity for ${item.product_title}">
              <button class="qty__btn" type="button" data-line-plus aria-label="Increase quantity">+</button>
            </div>
            <button class="line__remove" type="button" data-line-remove>Remove</button>
          </div>
        </div>
      </li>`;
  }

  /* ---------------------------- mutations ---------------------------- */

  async function mutate(lineEl, quantity) {
    const key = lineEl.dataset.lineKey;
    lineEl.classList.add('is-removing');
    try {
      if (quantity <= 0) {
        if (allowMotion()) {
          await gsap.to(lineEl, { height: 0, opacity: 0, marginBottom: 0, duration: 0.35, ease: 'power2.in' });
        }
        await removeItem(key);
      } else {
        await changeItem(key, quantity);
      }
    } catch (error) {
      console.error('[nova] cart update failed', error);
      lineEl.classList.remove('is-removing');
      // Re-sync from the server so the UI never lies about what is in the bag.
      fetchCart();
    }
  }

  if (list) {
    cleanups.push(
      delegate(list, 'click', '[data-line-remove]', (event, el) => {
        mutate(el.closest('.line'), 0);
      })
    );

    cleanups.push(
      delegate(list, 'click', '[data-line-minus]', (event, el) => {
        const line = el.closest('.line');
        const input = $('[data-line-qty]', line);
        mutate(line, Math.max(0, Number(input.value) - 1));
      })
    );

    cleanups.push(
      delegate(list, 'click', '[data-line-plus]', (event, el) => {
        const line = el.closest('.line');
        const input = $('[data-line-qty]', line);
        mutate(line, Number(input.value) + 1);
      })
    );

    cleanups.push(
      delegate(list, 'change', '[data-line-qty]', (event, el) => {
        mutate(el.closest('.line'), Math.max(0, Number(el.value)));
      })
    );
  }

  const offCart = onCartUpdate(render);

  // Seed from the server so a page load with an existing cart is correct.
  fetchCart().catch((error) => console.warn('[nova] could not read cart', error));

  return () => {
    timeline?.kill();
    offCart();
    cleanups.forEach((fn) => fn());
    overlay.destroy();
  };
}
