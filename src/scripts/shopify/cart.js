/**
 * Shopify Cart AJAX client.
 *
 * This is the only place the storefront talks to commerce. Every mutation goes
 * through here, and every mutation broadcasts `nova:cart:updated` with the
 * fresh cart, so the header count, the drawer and the cart page all stay in
 * sync without knowing about each other.
 *
 * Endpoints are read from `window.NOVA.routes` (populated by Liquid) rather
 * than hardcoded, because on a store with a locale or market prefix the cart
 * URLs are /en-in/cart/add.js, not /cart/add.js.
 */

const routes = () =>
  window.NOVA?.routes || {
    cart_url: '/cart',
    cart_add_url: '/cart/add',
    cart_change_url: '/cart/change',
    cart_update_url: '/cart/update',
    cart_clear_url: '/cart/clear',
  };

let cartState = null;
const listeners = new Set();

export function getCart() {
  return cartState;
}

export function onCartUpdate(fn) {
  listeners.add(fn);
  if (cartState) fn(cartState);
  return () => listeners.delete(fn);
}

function publish(cart, meta = {}) {
  cartState = cart;
  listeners.forEach((fn) => fn(cart, meta));
  document.dispatchEvent(new CustomEvent('nova:cart:updated', { detail: { cart, ...meta } }));
}

async function request(url, body) {
  const response = await fetch(`${url}.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Shopify returns a structured error for out-of-stock / limit reached.
    const error = new Error(data.description || data.message || 'Cart request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/** GET the current cart without mutating it. */
export async function fetchCart() {
  const response = await fetch(`${routes().cart_url}.js`, {
    headers: { Accept: 'application/json' },
  });
  const cart = await response.json();
  publish(cart, { reason: 'fetch' });
  return cart;
}

/**
 * Add a variant. Returns the added line item.
 * @param {number|string} id variant id
 */
export async function addItem(id, quantity = 1, properties = null) {
  const payload = { items: [{ id: Number(id), quantity, ...(properties ? { properties } : {}) }] };
  const result = await request(routes().cart_add_url, payload);

  // /cart/add.js returns the added items, not the whole cart, so re-read it.
  const cart = await refreshQuietly();
  const added = result.items?.[0] || result;
  publish(cart, { reason: 'add', added });
  return added;
}

/** Change a line's quantity. `key` is the line item key (preferred) or id. */
export async function changeItem(key, quantity) {
  const cart = await request(routes().cart_change_url, { id: key, quantity });
  publish(cart, { reason: 'change', key, quantity });
  return cart;
}

export async function removeItem(key) {
  return changeItem(key, 0);
}

export async function updateNote(note) {
  const cart = await request(routes().cart_update_url, { note });
  publish(cart, { reason: 'note' });
  return cart;
}

export async function clearCart() {
  const cart = await request(routes().cart_clear_url, {});
  publish(cart, { reason: 'clear' });
  return cart;
}

async function refreshQuietly() {
  const response = await fetch(`${routes().cart_url}.js`, { headers: { Accept: 'application/json' } });
  return response.json();
}

/**
 * Free-shipping progress for the drawer meter.
 * Threshold comes from theme settings so merchandising can change it in admin.
 */
export function shippingProgress(cart) {
  const threshold = Number(window.NOVA?.freeShippingThreshold || 0);
  if (!threshold || !cart) return { threshold: 0, remaining: 0, progress: 0, qualified: false };

  const total = Number(cart.total_price || 0);
  const remaining = Math.max(0, threshold - total);
  return {
    threshold,
    remaining,
    progress: Math.min(1, total / threshold),
    qualified: remaining === 0,
  };
}
