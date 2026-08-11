/**
 * Closing section — drifting fabric motes.
 *
 * Deliberately a 2D canvas, not a second WebGL context. The hero already owns
 * a GPU surface; spinning up another for a decorative particle field is exactly
 * the kind of cost the brief warns against. This draws a few hundred points at
 * a capped frame rate and stops the moment it scrolls out of view.
 */
import { on } from '../core/dom.js';
import { allowMotion, env } from '../core/env.js';

const TARGET_FPS = 30;

export function finale(root) {
  const canvas = root.querySelector('[data-finale-canvas]');
  if (!canvas || !allowMotion()) return () => {};

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  const count = env.lowPower || env.small ? 60 : 150;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let frame = 0;
  let visible = false;
  let lastDraw = 0;
  let pointer = { x: 0.5, y: 0.5 };

  function resize() {
    const rect = root.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.7 + 0.5,
      vx: (Math.random() - 0.5) * 0.16,
      vy: -(Math.random() * 0.22 + 0.05),
      a: Math.random() * 0.22 + 0.05,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(time) {
    frame = requestAnimationFrame(draw);
    if (!visible) return;

    // Cap the frame rate — nothing here benefits from 120fps.
    if (time - lastDraw < 1000 / TARGET_FPS) return;
    const delta = Math.min((time - lastDraw) / 16.67, 3);
    lastDraw = time;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0d0d0f';

    const px = pointer.x * width;
    const py = pointer.y * height;

    for (const p of particles) {
      p.phase += 0.01 * delta;
      p.x += (p.vx + Math.sin(p.phase) * 0.12) * delta;
      p.y += p.vy * delta;

      // Gentle repulsion so the field acknowledges the cursor.
      const dx = p.x - px;
      const dy = p.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist < 130 && dist > 0.01) {
        const push = ((130 - dist) / 130) * 0.9;
        p.x += (dx / dist) * push * delta;
        p.y += (dy / dist) * push * delta;
      }

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
    },
    { rootMargin: '80px' }
  );
  observer.observe(root);

  const offPointer = on(
    window,
    'pointermove',
    (event) => {
      const rect = root.getBoundingClientRect();
      pointer = {
        x: (event.clientX - rect.left) / (rect.width || 1),
        y: (event.clientY - rect.top) / (rect.height || 1),
      };
    },
    { passive: true }
  );

  const offResize = on(window, 'resize', resize);

  resize();
  canvas.classList.add('is-ready');
  frame = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    offPointer();
    offResize();
  };
}
