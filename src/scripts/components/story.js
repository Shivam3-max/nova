/**
 * "Designed with intention" — scroll-linked storytelling.
 *
 * Each step owns an image. As a step enters the middle of the viewport its
 * image cross-fades in and the copy comes up to full opacity. One ScrollTrigger
 * per step, all scoped to a gsap.Context so they die with the section.
 */
import { gsap, ScrollTrigger, createScene } from '../animation/gsap.js';
import { $$ } from '../core/dom.js';
import { allowMotion } from '../core/env.js';

export function story(root) {
  const steps = $$('.story__step', root);
  const images = $$('.story__img', root);
  if (!steps.length) return () => {};

  const activate = (index) => {
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    images.forEach((img, i) => img.classList.toggle('is-active', i === index));
  };

  if (!allowMotion()) {
    // Reduced motion: show every step and the first image, no scroll binding.
    steps.forEach((step) => step.classList.add('is-active'));
    images[0]?.classList.add('is-active');
    return () => {};
  }

  activate(0);

  return createScene(root, () => {
    steps.forEach((step, index) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 62%',
        end: 'bottom 42%',
        onEnter: () => activate(index),
        onEnterBack: () => activate(index),
      });

      gsap.fromTo(
        step.querySelectorAll('[data-story-line]'),
        { y: 26, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: step, start: 'top 78%' },
        }
      );
    });

    // Slow drift on the sticky plate so it is never completely static.
    const sticky = root.querySelector('.story__sticky');
    if (sticky) {
      gsap.fromTo(
        images,
        { scale: 1.08 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 1 },
        }
      );
    }
  });
}
