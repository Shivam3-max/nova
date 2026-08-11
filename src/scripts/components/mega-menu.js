/**
 * Fullscreen mega menu.
 *
 * Opens with a clip-path wipe, then staggers the category list in. Hovering a
 * category cross-fades the preview plate and dims its siblings (the dimming is
 * CSS; only the image swap needs JS).
 */
import { gsap } from '../animation/gsap.js';
import { createOverlay } from './overlay.js';
import { $, $$, on } from '../core/dom.js';
import { allowMotion } from '../core/env.js';

export function megaMenu(root) {
  const sheet = $('.mega__sheet', root);
  const links = $$('.mega__link', root);
  const cards = $$('.mega__card', root);
  const previews = $$('.mega__preview img', root);
  const triggers = $$('[data-mega-open]');
  const closers = $$('[data-mega-close]', root);
  const cleanups = [];

  let timeline = null;

  const overlay = createOverlay(root, {
    initialFocus: () => links[0],
    onOpen() {
      triggers.forEach((t) => t.setAttribute('aria-expanded', 'true'));
      timeline?.kill();

      if (!allowMotion()) {
        gsap.set(sheet, { clipPath: 'inset(0 0 0% 0)' });
        gsap.set([links, cards], { clearProps: 'all', opacity: 1, y: 0 });
        return;
      }

      timeline = gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .fromTo(
          sheet,
          { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: 0.85 }
        )
        .fromTo(
          links,
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.75, stagger: 0.055 },
          '-=0.5'
        )
        .fromTo(
          cards,
          { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.06 },
          '-=0.55'
        );
    },
    onClose(finish) {
      triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
      timeline?.kill();

      if (!allowMotion()) {
        finish();
        return false;
      }

      timeline = gsap.timeline({ onComplete: finish }).to(sheet, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.55,
        ease: 'power3.inOut',
      });

      return false; // the timeline calls finish()
    },
  });

  triggers.forEach((trigger) => {
    trigger.setAttribute('aria-expanded', 'false');
    cleanups.push(
      on(trigger, 'click', (event) => {
        event.preventDefault();
        overlay.toggle();
      })
    );
  });

  closers.forEach((el) => cleanups.push(on(el, 'click', () => overlay.hide())));

  // Category hover swaps the preview image.
  links.forEach((link) => {
    const key = link.dataset.preview;
    if (!key) return;

    const activate = () => {
      previews.forEach((img) => img.classList.toggle('is-active', img.dataset.preview === key));
    };

    cleanups.push(on(link, 'pointerenter', activate));
    cleanups.push(on(link, 'focus', activate));
  });

  // Restore the default preview when the list is left entirely.
  const list = $('.mega__list', root);
  if (list) {
    cleanups.push(
      on(list, 'pointerleave', () => {
        previews.forEach((img, i) => img.classList.toggle('is-active', i === 0));
      })
    );
  }

  previews[0]?.classList.add('is-active');

  return () => {
    timeline?.kill();
    cleanups.forEach((fn) => fn());
    overlay.destroy();
  };
}
