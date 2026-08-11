/**
 * WebGL lifecycle manager.
 *
 * Rules this enforces for the whole theme:
 *   - only one scene renders at a time (opening the 3D viewer pauses the hero)
 *   - a scene off screen does not render at all
 *   - a hidden tab does not render at all
 *   - device pixel ratio is capped, because a fashion plate does not need 3x
 *   - dispose() actually releases geometries, materials, textures and the GL
 *     context, so navigating or editing a section cannot leak GPU memory
 *
 * Everything WebGL in the theme goes through createStage().
 */
import * as THREE from 'three';

const stages = new Set();
let activeStage = null;
let rafHandle = 0;
let lastTime = 0;

const clock = { elapsed: 0 };

function loop(time) {
  rafHandle = requestAnimationFrame(loop);

  const delta = Math.min((time - lastTime) / 1000, 1 / 30);
  lastTime = time;
  clock.elapsed += delta;

  for (const stage of stages) {
    if (!stage.running || stage.paused || !stage.visible) continue;
    stage.render(delta, clock.elapsed);
  }
}

function ensureLoop() {
  if (rafHandle) return;
  lastTime = performance.now();
  rafHandle = requestAnimationFrame(loop);
}

function maybeStopLoop() {
  const anyRunning = [...stages].some((s) => s.running && !s.paused && s.visible);
  if (!anyRunning && rafHandle) {
    cancelAnimationFrame(rafHandle);
    rafHandle = 0;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = 0;
    }
  } else {
    ensureLoop();
  }
});

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} options
 * @returns {object} stage
 */
export function createStage(canvas, options = {}) {
  const {
    alpha = true,
    antialias = true,
    maxPixelRatio = 1.75,
    exclusive = false, // pause every other stage while this one runs
    onResize,
    onRender,
    clearColor = null,
  } = options;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha,
    antialias,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  if (clearColor !== null) renderer.setClearColor(clearColor, 1);
  else renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const stage = {
    renderer,
    scene,
    camera,
    canvas,
    running: false,
    paused: false,
    visible: true,
    disposed: false,

    render(delta, elapsed) {
      onRender?.(delta, elapsed, stage);
      renderer.render(scene, camera);
    },

    resize() {
      const parent = canvas.parentElement || canvas;
      const width = parent.clientWidth || window.innerWidth;
      const height = parent.clientHeight || window.innerHeight;
      if (!width || !height) return;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      onResize?.(width, height, stage);
    },

    start() {
      if (stage.disposed) return;
      stage.running = true;
      if (exclusive) {
        activeStage = stage;
        for (const other of stages) if (other !== stage) other.pause();
      }
      ensureLoop();
    },

    stop() {
      stage.running = false;
      if (activeStage === stage) {
        activeStage = null;
        for (const other of stages) other.resume();
      }
      maybeStopLoop();
    },

    pause() {
      stage.paused = true;
      maybeStopLoop();
    },

    resume() {
      if (stage.disposed) return;
      if (activeStage && activeStage !== stage) return; // an exclusive stage owns the GPU
      stage.paused = false;
      if (stage.running) ensureLoop();
    },

    dispose() {
      if (stage.disposed) return;
      stage.disposed = true;
      stage.stop();
      stages.delete(stage);
      observer?.disconnect();
      window.removeEventListener('resize', stage.resize);
      canvas.removeEventListener('webglcontextlost', onContextLost);

      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        const material = object.material;
        if (!material) return;
        const materials = Array.isArray(material) ? material : [material];
        for (const m of materials) {
          for (const key of Object.keys(m)) {
            const value = m[key];
            if (value && value.isTexture) value.dispose();
          }
          m.dispose();
        }
      });

      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss?.();
      maybeStopLoop();
    },
  };

  /* Only render while on screen. */
  const observer =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          ([entry]) => {
            stage.visible = entry.isIntersecting;
            if (stage.visible) ensureLoop();
            else maybeStopLoop();
          },
          { rootMargin: '120px' }
        )
      : null;

  observer?.observe(canvas);

  /* A lost context must not leave a frozen canvas over the page. */
  function onContextLost(event) {
    event.preventDefault();
    console.warn('[nova] WebGL context lost — falling back to the static plate');
    stage.stop();
    canvas.dispatchEvent(new CustomEvent('nova:webgl:lost', { bubbles: true }));
  }

  canvas.addEventListener('webglcontextlost', onContextLost);
  window.addEventListener('resize', stage.resize);

  stages.add(stage);
  stage.resize();

  return stage;
}

export { THREE };
