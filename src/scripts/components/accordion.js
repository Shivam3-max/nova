/**
 * Accordion with height tweening.
 *
 * Uses a real height animation (not max-height) so long panels open at the
 * same speed as short ones, and sets height back to auto on completion so the
 * panel reflows correctly if its contents change.
 */
import { gsap } from '../animation/gsap.js';
import { $$, on } from '../core/dom.js';
import { allowMotion } from '../core/env.js';

export function accordion(root) {
  const items = $$('.acc__item', root);
  const single = root.dataset.accordionSingle === 'true';
  const cleanups = [];

  function setOpen(item, open, animate = true) {
    const trigger = item.querySelector('.acc__trigger');
    const panel = item.querySelector('.acc__panel');
    if (!trigger || !panel) return;

    item.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    panel.toggleAttribute('inert', !open);

    gsap.killTweensOf(panel);

    if (!animate || !allowMotion()) {
      gsap.set(panel, { height: open ? 'auto' : 0 });
      return;
    }

    if (open) {
      gsap.set(panel, { height: 'auto' });
      const target = panel.offsetHeight;
      gsap.fromTo(
        panel,
        { height: 0 },
        {
          height: target,
          duration: 0.55,
          ease: 'power3.out',
          onComplete: () => gsap.set(panel, { height: 'auto' }),
        }
      );
      gsap.fromTo(
        panel.querySelector('.acc__body'),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, delay: 0.08, ease: 'power2.out' }
      );
    } else {
      gsap.to(panel, { height: 0, duration: 0.42, ease: 'power3.inOut' });
    }
  }

  items.forEach((item) => {
    const trigger = item.querySelector('.acc__trigger');
    if (!trigger) return;

    const startOpen = item.dataset.open === 'true';
    setOpen(item, startOpen, false);

    cleanups.push(
      on(trigger, 'click', () => {
        const willOpen = !item.classList.contains('is-open');

        if (single && willOpen) {
          items.forEach((other) => other !== item && setOpen(other, false));
        }

        setOpen(item, willOpen);
      })
    );
  });

  return () => {
    cleanups.forEach((fn) => fn());
    items.forEach((item) => gsap.killTweensOf(item.querySelector('.acc__panel')));
  };
}
