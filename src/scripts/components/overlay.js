/**
 * Shared overlay behaviour for the mega menu, search and cart drawer.
 *
 * Consolidated because all three need identical, easy-to-get-wrong plumbing:
 * scroll lock, focus trap, focus restore, Escape to close, and telling the
 * header to stay put. Only the open/close animation differs.
 */
import { focusTrap, lockScroll, unlockScroll, on } from '../core/dom.js';
import { pauseSmoothScroll, resumeSmoothScroll } from '../core/scroll.js';

export function createOverlay(root, { onOpen, onClose, initialFocus } = {}) {
  let open = false;
  let releaseTrap = null;
  let lastFocused = null;

  const announce = (state) =>
    document.dispatchEvent(new CustomEvent('nova:panel', { detail: { open: state, root } }));

  function show() {
    if (open) return;
    open = true;
    lastFocused = document.activeElement;

    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    lockScroll();
    pauseSmoothScroll();
    releaseTrap = focusTrap(root);
    announce(true);

    onOpen?.();

    // Focus after the panel is on screen so the browser does not scroll to it.
    requestAnimationFrame(() => {
      const target = typeof initialFocus === 'function' ? initialFocus() : initialFocus;
      (target || root.querySelector('button, [href], input') || root).focus({ preventScroll: true });
    });
  }

  function hide() {
    if (!open) return;
    open = false;

    root.setAttribute('aria-hidden', 'true');
    releaseTrap?.();
    releaseTrap = null;
    unlockScroll();
    resumeSmoothScroll();
    announce(false);

    const finish = () => {
      root.classList.remove('is-open');
      lastFocused?.focus?.({ preventScroll: true });
    };

    const result = onClose?.(finish);
    // If onClose does not take responsibility for finishing, do it now.
    if (result !== false) finish();
  }

  const offKey = on(document, 'keydown', (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      hide();
    }
  });

  return {
    show,
    hide,
    toggle: () => (open ? hide() : show()),
    get isOpen() {
      return open;
    },
    destroy() {
      offKey();
      if (open) {
        releaseTrap?.();
        unlockScroll();
        resumeSmoothScroll();
      }
    },
  };
}
