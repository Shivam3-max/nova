/**
 * VIEW IN 3D.
 *
 * Opens a fullscreen viewer, lazily loading both Three.js and the viewer scene.
 * The colourway shown is driven by the selected Shopify variant, so changing
 * colour in the viewer changes what the Add to Bag button will actually add.
 *
 * Devices without WebGL get the image fallback — same modal, same colour
 * switching, no rotation.
 */
import { gsap } from '../animation/gsap.js';
import { createOverlay } from './overlay.js';
import { $, $$, on, delegate } from '../core/dom.js';
import { allowWebGL, supportsWebGL } from '../core/env.js';

export function productViewer(root) {
  const canvas = $('[data-viewer-canvas]', root);
  const loading = $('[data-viewer-loading]', root);
  const titleNode = $('[data-viewer-title]', root);
  const fallbackImg = $('[data-viewer-fallback-img]', root);
  const colorsWrap = $('[data-viewer-colors]', root);
  const cleanups = [];

  let scene = null;
  let loadingScene = false;
  let current = null; // { title, colors: [{name, art, variantId}], activeIndex }

  const overlay = createOverlay(root, {
    initialFocus: () => $('.viewer__close', root),
    onOpen() {
      gsap.to(root, { opacity: 1, duration: 0.45, ease: 'power2.out' });
      boot();
    },
    onClose(finish) {
      gsap.to(root, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => {
          // Free the GPU as soon as the viewer is dismissed; the hero scene
          // resumes automatically once this exclusive stage is gone.
          scene?.dispose();
          scene = null;
          finish();
        },
      });
      return false;
    },
  });

  async function boot() {
    if (!current) return;

    if (!allowWebGL() && !supportsWebGL()) {
      root.classList.add('is-fallback');
      return;
    }

    if (scene || loadingScene) {
      scene?.reset();
      return;
    }

    loadingScene = true;
    loading?.removeAttribute('hidden');

    try {
      const { mountViewerScene } = await import('../webgl/viewer-scene.js');
      const colour = current.colors[current.activeIndex] || current.colors[0];

      scene = await mountViewerScene(canvas, {
        textureUrl: colour?.art,
        modelUrl: current.modelUrl || null,
      });

      root.classList.remove('is-fallback');
    } catch (error) {
      console.warn('[nova] 3D viewer unavailable', error);
      root.classList.add('is-fallback');
    } finally {
      loadingScene = false;
      loading?.setAttribute('hidden', '');
    }
  }

  function renderColors() {
    if (!colorsWrap || !current) return;

    colorsWrap.innerHTML = current.colors
      .map(
        (colour, index) => `
        <button class="swatch" type="button"
                role="radio"
                aria-checked="${index === current.activeIndex}"
                aria-label="${colour.name}"
                data-viewer-color="${index}"
                style="--swatch-color:${colour.swatch}"></button>`
      )
      .join('');
  }

  async function setColor(index) {
    if (!current || !current.colors[index]) return;
    current.activeIndex = index;

    const colour = current.colors[index];
    $$('[data-viewer-color]', colorsWrap).forEach((el, i) =>
      el.setAttribute('aria-checked', String(i === index))
    );

    if (fallbackImg) {
      fallbackImg.src = colour.art;
      fallbackImg.alt = `${current.title} in ${colour.name}`;
    }

    await scene?.setColorway(colour.art);

    // Keep the buy button honest: selecting a colour here selects the variant.
    if (colour.variantId) {
      document.dispatchEvent(
        new CustomEvent('nova:viewer:color', { detail: { variantId: colour.variantId, name: colour.name } })
      );
    }
  }

  cleanups.push(
    delegate(document, 'click', '[data-view3d]', (event, trigger) => {
      event.preventDefault();

      let payload;
      try {
        payload = JSON.parse(trigger.dataset.view3d);
      } catch {
        console.warn('[nova] malformed 3D viewer payload');
        return;
      }

      current = { activeIndex: 0, ...payload };

      // Open on the colour the customer is already looking at.
      const selected = trigger.dataset.selectedColor;
      if (selected) {
        const index = current.colors.findIndex((c) => c.name === selected);
        if (index >= 0) current.activeIndex = index;
      }

      if (titleNode) titleNode.textContent = current.title;
      renderColors();

      const colour = current.colors[current.activeIndex];
      if (fallbackImg && colour) {
        fallbackImg.src = colour.art;
        fallbackImg.alt = `${current.title} in ${colour.name}`;
      }

      overlay.show();
    })
  );

  if (colorsWrap) {
    cleanups.push(
      delegate(colorsWrap, 'click', '[data-viewer-color]', (event, button) => {
        setColor(Number(button.dataset.viewerColor));
      })
    );
  }

  $$('[data-viewer-close]', root).forEach((el) =>
    cleanups.push(on(el, 'click', () => overlay.hide()))
  );

  return () => {
    scene?.dispose();
    cleanups.forEach((fn) => fn());
    overlay.destroy();
  };
}
