/**
 * Hero controller.
 *
 * Owns the decision of whether this visitor gets the WebGL scene or the static
 * plate, loads Three.js only in the first case, and runs the typography
 * choreography either way. The headline animation never depends on the scene
 * booting — if WebGL fails at any point the page still reads correctly.
 */
import { gsap, ScrollTrigger, createScene } from '../animation/gsap.js';
import { splitLines } from '../animation/split.js';
import { $, $$, on } from '../core/dom.js';
import { allowWebGL, allowMotion } from '../core/env.js';

export function hero(root) {
  const canvas = $('[data-hero-canvas]', root);
  const fallback = $('[data-hero-fallback]', root);
  const title = $('[data-hero-title]', root);
  const pins = $$('.hero__pin', root);
  const cleanups = [];

  let scene = null;
  let disposed = false;

  /* ------------------------- typography ------------------------- */

  const intro = gsap.timeline({ delay: 0.15 });
  const fades = $$('[data-hero-fade]', root);

  if (allowMotion()) {
    if (title) {
      const { lines } = splitLines(title);
      if (lines.length) {
        intro.fromTo(
          lines,
          { yPercent: 112 },
          { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.08 },
          0
        );
      }
    }

    if (fades.length) {
      intro.fromTo(
        fades,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.09, ease: 'power3.out' },
        0.35
      );
    }

    if (pins.length) {
      intro.fromTo(pins, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.8, stagger: 0.12 }, 0.9);
    }
  } else if (fades.length || pins.length) {
    gsap.set([...fades, ...pins], { opacity: 1, y: 0, x: 0 });
  }

  /* Scroll: headline leaves before the garment does. */
  const scrollScene = createScene(root, () => {
    if (!allowMotion()) return;

    const content = $('.hero__content', root);
    if (content) {
      gsap.to(content, {
        yPercent: -26,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top top', end: '62% top', scrub: 0.5 },
      });
    }

    if (pins.length) {
      gsap.to(pins, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top top', end: '30% top', scrub: true },
      });
    }

    // The static plate gets its own push so the fallback still feels directed.
    if (fallback) {
      gsap.to(fallback, {
        scale: 1.12,
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });
    }
  });

  /* --------------------------- WebGL ---------------------------- */

  async function boot() {
    if (!canvas || !allowWebGL()) return;

    const textureUrl = canvas.dataset.texture;
    if (!textureUrl) return;

    try {
      // Three.js lives in its own chunk — never downloaded on the fallback path.
      const { mountHeroScene } = await import('../webgl/hero-scene.js');
      if (disposed) return;

      scene = await mountHeroScene(canvas, { textureUrl, section: root });
      ScrollTrigger.refresh();
    } catch (error) {
      console.warn('[nova] hero scene unavailable, keeping the static plate', error);
      root.classList.remove('is-webgl');
    }
  }

  // A lost GPU context reverts to the plate rather than leaving a blank hero.
  if (canvas) {
    cleanups.push(
      on(canvas, 'nova:webgl:lost', () => {
        root.classList.remove('is-webgl');
        scene?.dispose();
        scene = null;
      })
    );
  }

  /* Defer the scene until the browser is idle so it never competes with the
     first paint or the product imagery below the fold. */
  const start = () => boot();
  if ('requestIdleCallback' in window) {
    const handle = requestIdleCallback(start, { timeout: 1200 });
    cleanups.push(() => cancelIdleCallback(handle));
  } else {
    const handle = setTimeout(start, 260);
    cleanups.push(() => clearTimeout(handle));
  }

  return () => {
    disposed = true;
    intro.kill();
    scrollScene();
    scene?.dispose();
    cleanups.forEach((fn) => fn());
  };
}
