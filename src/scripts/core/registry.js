/**
 * Component registry.
 *
 * Components are declared in Liquid with `data-component="name"` and mounted
 * here. Each factory may return a teardown function; the registry keeps them so
 * everything can be destroyed when a section is re-rendered by the Shopify
 * theme editor (`shopify:section:load`/`unload`), which is where leaked
 * ScrollTriggers and orphaned WebGL contexts normally come from.
 */

const factories = new Map();
const instances = new WeakMap();

export function register(name, factory) {
  factories.set(name, factory);
}

function mountElement(el) {
  if (instances.has(el)) return;
  const name = el.dataset.component;
  const factory = factories.get(name);
  if (!factory) return;

  try {
    const teardown = factory(el);
    instances.set(el, typeof teardown === 'function' ? teardown : () => {});
  } catch (error) {
    // One broken component must never take the rest of the page with it.
    console.error(`[nova] component "${name}" failed to mount`, error);
    instances.set(el, () => {});
  }
}

function unmountElement(el) {
  const teardown = instances.get(el);
  if (!teardown) return;
  try {
    teardown();
  } catch (error) {
    console.error('[nova] component teardown failed', error);
  }
  instances.delete(el);
}

export function mountAll(root = document) {
  const scope = root instanceof Element && root.dataset?.component ? [root] : [];
  scope.push(...root.querySelectorAll('[data-component]'));
  scope.forEach(mountElement);
}

export function unmountAll(root = document) {
  const scope = root instanceof Element && root.dataset?.component ? [root] : [];
  scope.push(...root.querySelectorAll('[data-component]'));
  scope.forEach(unmountElement);
}

/**
 * Theme-editor lifecycle. Without this, editing a section in Shopify admin
 * stacks a second copy of every listener and scroll trigger on top of the old
 * one until the preview grinds to a halt.
 */
export function bindThemeEditor() {
  document.addEventListener('shopify:section:load', (event) => mountAll(event.target));
  document.addEventListener('shopify:section:unload', (event) => unmountAll(event.target));
  document.addEventListener('shopify:section:select', (event) =>
    event.target.dispatchEvent(new CustomEvent('nova:section:select', { bubbles: false }))
  );
}
