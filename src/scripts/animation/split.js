/**
 * Line splitting for staggered headline reveals.
 *
 * Deliberately hand-rolled rather than pulling in a plugin: we only need line
 * grouping, and doing it here means we control the accessibility story — the
 * original text stays in the DOM as an aria-label and the visual fragments are
 * hidden from assistive tech, so a screen reader reads one clean sentence
 * instead of a stream of disconnected words.
 */

const WS = /\s+/;

/**
 * Split an element's text into line wrappers.
 * @returns {{ lines: HTMLElement[], revert: () => void }}
 */
export function splitLines(el) {
  if (!el || el.dataset.split === 'done') {
    return { lines: Array.from(el?.querySelectorAll('.split-line__inner') || []), revert: () => {} };
  }

  const original = el.innerHTML;
  const text = el.textContent.trim();
  if (!text) return { lines: [], revert: () => {} };

  // 1. Wrap every word so we can measure where the browser broke the lines.
  const words = text.split(WS);
  el.textContent = '';
  const wordSpans = words.map((word, i) => {
    const span = document.createElement('span');
    span.style.display = 'inline-block';
    span.textContent = word;
    el.appendChild(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    return span;
  });

  // 2. Group words by their vertical offset.
  const rows = new Map();
  for (const span of wordSpans) {
    const top = Math.round(span.offsetTop);
    if (!rows.has(top)) rows.set(top, []);
    rows.get(top).push(span.textContent);
  }

  // 3. Rebuild as overflow-hidden line wrappers.
  el.textContent = '';
  const lines = [];
  for (const words of rows.values()) {
    const outer = document.createElement('span');
    outer.className = 'split-line';
    const inner = document.createElement('span');
    inner.className = 'split-line__inner';
    inner.textContent = words.join(' ');
    outer.appendChild(inner);
    el.appendChild(outer);
    lines.push(inner);
  }

  // 4. Keep the sentence intact for assistive tech.
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', text);
  el.querySelectorAll('.split-line').forEach((n) => n.setAttribute('aria-hidden', 'true'));
  el.dataset.split = 'done';

  return {
    lines,
    revert() {
      el.innerHTML = original;
      delete el.dataset.split;
      el.removeAttribute('aria-label');
    },
  };
}

/**
 * Re-split on resize, because line breaks move. Debounced, and skipped when
 * only the viewport height changed (mobile URL bar).
 */
export function responsiveSplit(el, onSplit) {
  let width = window.innerWidth;
  let handle = null;
  let current = splitLines(el);
  onSplit(current.lines);

  const onResize = () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    clearTimeout(handle);
    handle = setTimeout(() => {
      current.revert();
      current = splitLines(el);
      onSplit(current.lines);
    }, 220);
  };

  window.addEventListener('resize', onResize);

  return () => {
    clearTimeout(handle);
    window.removeEventListener('resize', onResize);
    current.revert();
  };
}
