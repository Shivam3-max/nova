/**
 * Add-to-bag: form submission + the animated confirmation.
 *
 * Bound globally with delegation so it covers the product form, the quick-add
 * sheet, and the one-tap size buttons on product cards without each of them
 * re-implementing the submit/error/toast cycle.
 */
import { gsap } from '../animation/gsap.js';
import { $, delegate, on, formatMoney } from '../core/dom.js';
import { allowMotion } from '../core/env.js';
import { addItem } from '../shopify/cart.js';

let toastEl = null;
let toastTween = null;
let hideTimer = null;

function ensureToast() {
  if (toastEl) return toastEl;

  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  toastEl.innerHTML = `
    <img class="toast__thumb" alt="" width="120" height="150">
    <div class="toast__text">
      <span class="toast__label">Added to bag</span>
      <span class="toast__title"></span>
    </div>
    <button class="toast__cta" type="button" data-cart-open>View bag</button>
  `;
  document.body.appendChild(toastEl);
  return toastEl;
}

export function showToast({ title, image, label = 'Added to bag' }) {
  const el = ensureToast();
  const thumb = $('.toast__thumb', el);

  $('.toast__label', el).textContent = label;
  $('.toast__title', el).textContent = title || '';

  if (image) {
    thumb.src = image;
    thumb.removeAttribute('hidden');
  } else {
    thumb.setAttribute('hidden', '');
  }

  clearTimeout(hideTimer);
  toastTween?.kill();
  el.classList.add('is-open');

  if (allowMotion()) {
    toastTween = gsap.fromTo(
      el,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }
    );
  } else {
    gsap.set(el, { y: 0, opacity: 1 });
  }

  hideTimer = setTimeout(hideToast, 4200);
}

export function hideToast() {
  if (!toastEl) return;
  toastTween?.kill();
  toastTween = gsap.to(toastEl, {
    y: 16,
    opacity: 0,
    duration: allowMotion() ? 0.35 : 0.001,
    ease: 'power2.in',
    onComplete: () => toastEl.classList.remove('is-open'),
  });
}

/** Brief success state on the button itself, so the click feels acknowledged. */
async function flashButton(button, text = 'Added') {
  if (!button) return;
  const label = $('[data-add-label]', button) || button;
  const original = label.textContent;
  button.classList.add('is-success');
  label.textContent = text;
  await new Promise((resolve) => setTimeout(resolve, 1400));
  label.textContent = original;
  button.classList.remove('is-success');
}

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

export function initAddToCart() {
  const cleanups = [];

  /* Product / quick-add forms.
     Matched by action rather than a data attribute: Shopify's {% form %} tag
     builds the <form> itself and does not accept hyphenated attribute kwargs,
     and the action stays correct under locale/market URL prefixes
     (/en-in/cart/add). Without this the form falls through to a native POST
     and the customer gets a full page reload instead of the drawer. */
  const ADD_FORM = 'form[action*="/cart/add"], form[data-add-form]';

  cleanups.push(
    delegate(document, 'submit', ADD_FORM, async (event, form) => {
      event.preventDefault();

      const button = $('[data-add-button]', form);
      const id = $('[data-variant-id]', form)?.value;
      const quantity = Number($('[data-quantity-input]', form)?.value || 1);

      if (!id) return;

      setBusy(button, true);
      try {
        const item = await addItem(id, quantity);
        showToast({
          title: item.product_title || item.title,
          image: item.featured_image?.url || item.image,
        });
        await flashButton(button);
        form.dispatchEvent(new CustomEvent('nova:added', { bubbles: true, detail: { item } }));
      } catch (error) {
        console.error('[nova] add to cart failed', error);
        showToast({ title: error.message || 'Could not add to bag', label: 'Something went wrong' });
      } finally {
        setBusy(button, false);
      }
    })
  );

  /* One-tap size buttons on product cards */
  cleanups.push(
    delegate(document, 'click', '[data-quick-size]', async (event, button) => {
      event.preventDefault();
      if (button.disabled) return;

      const id = button.dataset.variantId;
      if (!id) return;

      setBusy(button, true);
      try {
        const item = await addItem(id, 1);
        showToast({
          title: item.product_title || item.title,
          image: item.featured_image?.url || item.image,
        });
      } catch (error) {
        console.error('[nova] quick size add failed', error);
        showToast({ title: 'That size just sold out', label: 'Unavailable' });
      } finally {
        setBusy(button, false);
      }
    })
  );

  /* Buy it now — add, then hand off to Shopify checkout. */
  cleanups.push(
    delegate(document, 'click', '[data-buy-now]', async (event, button) => {
      event.preventDefault();
      const form = button.closest('form');
      const id = $('[data-variant-id]', form)?.value;
      const quantity = Number($('[data-quantity-input]', form)?.value || 1);
      if (!id) return;

      setBusy(button, true);
      try {
        await addItem(id, quantity);
        window.location.href = '/checkout';
      } catch (error) {
        console.error('[nova] buy now failed', error);
        setBusy(button, false);
      }
    })
  );

  cleanups.push(on(document, 'nova:panel', (event) => event.detail.open && hideToast()));

  return () => {
    clearTimeout(hideTimer);
    cleanups.forEach((fn) => fn());
  };
}
