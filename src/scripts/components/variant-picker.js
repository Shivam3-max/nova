/**
 * Variant picker — the bridge between the custom UI and Shopify's variant model.
 *
 * Reads the product JSON Liquid prints into the page, resolves the selected
 * option combination to a real variant id, and keeps price, availability, the
 * gallery, the URL and the hidden `id` input in sync. Everything downstream
 * (add to cart, 3D viewer colourway, quick add) listens to one event.
 */
import { $, $$, on, formatMoney } from '../core/dom.js';
import { gsap } from '../animation/gsap.js';
import { allowMotion } from '../core/env.js';

export function variantPicker(root) {
  const dataNode = $('[data-product-json]', root);
  if (!dataNode) return () => {};

  let product;
  try {
    product = JSON.parse(dataNode.textContent);
  } catch (error) {
    console.error('[nova] could not parse product JSON', error);
    return () => {};
  }

  const idInput = $('[data-variant-id]', root);
  const priceNode = $('[data-variant-price]', root);
  const compareNode = $('[data-variant-compare]', root);
  const submitNode = $('[data-add-button]', root);
  const submitLabel = $('[data-add-label]', root) || submitNode;
  const skuNode = $('[data-variant-sku]', root);
  const cleanups = [];

  const optionInputs = $$('[data-option-input]', root);
  const updateUrl = root.dataset.updateUrl !== 'false';

  /** Current selection, indexed by option position (1-based). */
  function currentOptions() {
    const values = [];
    optionInputs.forEach((input) => {
      if (input.checked || input.getAttribute('aria-checked') === 'true') {
        values[Number(input.dataset.optionPosition) - 1] = input.value ?? input.dataset.optionValue;
      }
    });
    return values;
  }

  function findVariant(options) {
    return product.variants.find((variant) =>
      options.every((value, index) => value == null || variant.options[index] === value)
    );
  }

  /**
   * Mark size options unavailable for the selected colour. This is the detail
   * that separates a real storefront from a mockup — sizes that cannot be
   * bought must look unbuyable before the customer clicks.
   */
  function refreshAvailability(options) {
    const colour = options[0];

    $$('[data-option-position="2"]', root).forEach((input) => {
      const size = input.value ?? input.dataset.optionValue;
      const match = product.variants.find((v) => v.options[0] === colour && v.options[1] === size);
      const available = Boolean(match && match.available);

      input.classList.toggle('is-unavailable', !available);
      const label = input.closest('label') || input;
      label.classList?.toggle('is-unavailable', !available);
      if (input.tagName === 'BUTTON') input.disabled = !available;
      input.dataset.available = String(available);
    });
  }

  function setState(variant) {
    if (idInput) idInput.value = variant ? variant.id : '';

    if (submitNode) {
      const sellable = Boolean(variant && variant.available);
      submitNode.disabled = !sellable;
      submitNode.setAttribute('aria-disabled', String(!sellable));
      if (submitLabel) {
        submitLabel.textContent = !variant ? 'Unavailable' : sellable ? 'Add to bag' : 'Sold out';
      }
    }

    if (priceNode && variant) {
      const next = formatMoney(variant.price);
      if (priceNode.textContent.trim() !== next) {
        priceNode.textContent = next;
        if (allowMotion()) {
          gsap.fromTo(priceNode, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4 });
        }
      }
    }

    if (compareNode) {
      const hasCompare = variant && variant.compare_at_price && variant.compare_at_price > variant.price;
      compareNode.textContent = hasCompare ? formatMoney(variant.compare_at_price) : '';
      compareNode.toggleAttribute('hidden', !hasCompare);
    }

    if (skuNode) skuNode.textContent = variant?.sku || '';

    // Reflect the variant in the URL so the page is shareable and refresh-safe.
    if (updateUrl && variant && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    }

    root.dispatchEvent(
      new CustomEvent('nova:variant:change', {
        bubbles: true,
        detail: { variant, product },
      })
    );
  }

  function onSelect() {
    const options = currentOptions();
    refreshAvailability(options);

    let variant = findVariant(options);

    // If the chosen size is gone in the new colour, fall back to the first
    // available size in that colour rather than showing a dead button.
    if (!variant || !variant.available) {
      const fallback = product.variants.find((v) => v.options[0] === options[0] && v.available);
      if (fallback) {
        variant = fallback;
        $$('[data-option-position="2"]', root).forEach((input) => {
          const isMatch = (input.value ?? input.dataset.optionValue) === fallback.options[1];
          setChecked(input, isMatch);
        });
      }
    }

    setState(variant);
  }

  function setChecked(input, checked) {
    if (input.type === 'radio') input.checked = checked;
    else input.setAttribute('aria-checked', String(checked));
    const label = input.closest('label');
    label?.classList.toggle('is-selected', checked);
  }

  // Radio inputs fire change; button-style pickers fire click.
  optionInputs.forEach((input) => {
    if (input.tagName === 'BUTTON') {
      cleanups.push(
        on(input, 'click', () => {
          const position = input.dataset.optionPosition;
          $$(`[data-option-position="${position}"]`, root).forEach((sibling) =>
            setChecked(sibling, sibling === input)
          );
          // Reflect the chosen colour/size name next to the option label.
          const readout = $(`[data-option-readout="${position}"]`, root);
          if (readout) readout.textContent = input.value ?? input.dataset.optionValue;
          onSelect();
        })
      );
    } else {
      cleanups.push(on(input, 'change', onSelect));
    }
  });

  /**
   * Choosing a colourway inside the 3D viewer must move the buy button too —
   * otherwise the customer inspects Bone and adds Black to the bag.
   */
  cleanups.push(
    on(document, 'nova:viewer:color', (event) => {
      const { name } = event.detail || {};
      if (!name) return;

      const match = $$('[data-option-position="1"]', root).find(
        (input) => (input.value ?? input.dataset.optionValue) === name
      );
      if (!match) return;

      $$('[data-option-position="1"]', root).forEach((sibling) =>
        setChecked(sibling, sibling === match)
      );

      const readout = $('[data-option-readout="1"]', root);
      if (readout) readout.textContent = name;

      onSelect();
    })
  );

  onSelect();

  return () => cleanups.forEach((fn) => fn());
}
