/**
 * Drop countdown.
 *
 * Counts to an ISO deadline set in the section settings. If the merchant has
 * not set one, it falls back to a rolling window so the demo never shows a
 * dead 00:00:00 — that fallback is explicit rather than accidental, and the
 * real store should always configure `deadline`.
 *
 * Ticks once per second with a setTimeout aligned to the wall clock, so it
 * cannot drift, and pauses entirely when the tab is hidden.
 */
import { $$, on } from '../core/dom.js';
import { allowMotion } from '../core/env.js';

export function countdown(root) {
  const units = $$('[data-count-unit]', root);
  if (!units.length) return () => {};

  const deadlineAttr = root.dataset.deadline;
  let deadline = deadlineAttr ? Date.parse(deadlineAttr) : NaN;

  if (Number.isNaN(deadline)) {
    // Rolling fallback: always the next 07:21:42 from load.
    const fallbackMs = (7 * 3600 + 21 * 60 + 42) * 1000;
    deadline = Date.now() + fallbackMs;
  }

  let timer = null;
  const previous = new Map();

  function paint() {
    const remaining = Math.max(0, deadline - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);

    const values = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };

    // When there are no days left, show hours as the leading unit.
    if (values.days === 0) values.hours = Math.floor(totalSeconds / 3600);

    units.forEach((unit) => {
      const key = unit.dataset.countUnit;
      const value = values[key];
      if (value == null) return;

      const text = String(value).padStart(2, '0');
      const node = unit.querySelector('[data-count-value]') || unit;

      if (previous.get(key) === text) return;
      previous.set(key, text);
      node.textContent = text;

      if (allowMotion() && key === 'seconds') {
        node.animate(
          [
            { opacity: 0.35, transform: 'translateY(-14%)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
      }
    });

    if (remaining <= 0) {
      root.classList.add('is-expired');
      root.dispatchEvent(new CustomEvent('nova:countdown:expired', { bubbles: true }));
      return false;
    }

    return true;
  }

  function schedule() {
    clearTimeout(timer);
    if (document.hidden) return;
    if (!paint()) return;
    // Align the next tick to the second boundary so the display never stutters.
    timer = setTimeout(schedule, 1000 - (Date.now() % 1000));
  }

  const offVisibility = on(document, 'visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else schedule();
  });

  root.setAttribute('role', 'timer');
  root.setAttribute('aria-live', 'off');
  schedule();

  return () => {
    clearTimeout(timer);
    offVisibility();
  };
}
