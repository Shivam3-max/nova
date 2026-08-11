/**
 * Fullscreen 3D product viewer.
 *
 * Two paths, decided per product:
 *   1. The merchant attached a real 3D model to the product in Shopify
 *      (Shopify stores GLB files as product media). We load that with
 *      GLTFLoader — this is the production path and gives true inspection.
 *   2. No model: we present the product plate on a curved cloth shell that can
 *      be turned and zoomed. Not a substitute for a real model, but honest,
 *      instant, and it exercises the same variant-linked colourway plumbing.
 *
 * Either way, colour selection maps to a Shopify variant, so the viewer and the
 * buy button never disagree about what is being bought.
 */
import * as THREE from 'three';
import { createStage } from './renderer.js';
import { createGarment, loadTexture } from './garment.js';

/** Drag-to-orbit with damping. Deliberately not OrbitControls — we only need
 *  two axes and a zoom, and this keeps the chunk smaller. */
function createOrbit(element, object, { minZoom = 3.2, maxZoom = 9 } = {}) {
  const rotation = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const zoom = { current: 6, target: 6 };

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onDown = (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    element.setPointerCapture?.(event.pointerId);
    element.style.cursor = 'grabbing';
  };

  const onMove = (event) => {
    if (!dragging) return;
    target.y += (event.clientX - lastX) * 0.0072;
    target.x += (event.clientY - lastY) * 0.0052;
    // Stop the garment from tipping over entirely.
    target.x = Math.max(-0.62, Math.min(0.62, target.x));
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const onUp = (event) => {
    dragging = false;
    element.releasePointerCapture?.(event.pointerId);
    element.style.cursor = 'grab';
  };

  const onWheel = (event) => {
    event.preventDefault();
    zoom.target = Math.max(minZoom, Math.min(maxZoom, zoom.target + event.deltaY * 0.0035));
  };

  /* Pinch to zoom on touch. */
  const touches = new Map();
  let pinchStart = 0;

  const onTouchStart = (event) => {
    for (const touch of event.changedTouches) touches.set(touch.identifier, touch);
    if (touches.size === 2) pinchStart = touchDistance();
  };

  const onTouchMove = (event) => {
    for (const touch of event.changedTouches) touches.set(touch.identifier, touch);
    if (touches.size !== 2) return;
    event.preventDefault();
    const distance = touchDistance();
    if (pinchStart) {
      zoom.target = Math.max(minZoom, Math.min(maxZoom, zoom.target * (pinchStart / distance)));
      pinchStart = distance;
    }
  };

  const onTouchEnd = (event) => {
    for (const touch of event.changedTouches) touches.delete(touch.identifier);
    if (touches.size < 2) pinchStart = 0;
  };

  function touchDistance() {
    const [a, b] = [...touches.values()];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onUp);
  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('touchstart', onTouchStart, { passive: true });
  element.addEventListener('touchmove', onTouchMove, { passive: false });
  element.addEventListener('touchend', onTouchEnd);
  element.style.cursor = 'grab';

  return {
    get isDragging() {
      return dragging;
    },
    zoom,
    update(delta) {
      // Idle drift so the object never looks frozen.
      if (!dragging) target.y += delta * 0.12;

      rotation.x += (target.x - rotation.x) * 0.1;
      rotation.y += (target.y - rotation.y) * 0.1;
      zoom.current += (zoom.target - zoom.current) * 0.1;

      object.rotation.x = rotation.x;
      object.rotation.y = rotation.y;
    },
    reset() {
      target.x = 0;
      target.y = 0;
      zoom.target = 6;
    },
    dispose() {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    },
  };
}

/** Studio three-point light rig for the GLB path. */
function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-3, 4, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.7);
  fill.position.set(4, 1, 3);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(0, 2, -5);
  scene.add(rim);
}

export async function mountViewerScene(canvas, { textureUrl, modelUrl = null }) {
  const group = new THREE.Group();
  let garment = null;
  let loadedModel = null;

  const stage = createStage(canvas, {
    exclusive: true, // the hero must stop rendering while this is open
    maxPixelRatio: 1.75,
    clearColor: new THREE.Color('#0b0b0d'),
    onRender(delta, elapsed) {
      orbit.update(delta);
      stage.camera.position.z = orbit.zoom.current;
      if (garment) garment.material.uniforms.uTime.value = elapsed;
    },
  });

  stage.scene.add(group);
  addLights(stage.scene);

  const orbit = createOrbit(canvas, group);

  /* --- Path 1: a real 3D model attached to the Shopify product --- */
  if (modelUrl) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new Promise((resolve, reject) =>
        new GLTFLoader().load(modelUrl, resolve, undefined, reject)
      );

      loadedModel = gltf.scene;

      // Normalise: centre the model and scale it to a consistent height.
      const box = new THREE.Box3().setFromObject(loadedModel);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      const scale = 3.4 / Math.max(size.y || 1, 0.001);

      loadedModel.position.sub(centre);
      loadedModel.scale.setScalar(scale);
      loadedModel.position.multiplyScalar(scale);

      group.add(loadedModel);
    } catch (error) {
      console.warn('[nova] 3D model failed to load, using the plate viewer', error);
      loadedModel = null;
    }
  }

  /* --- Path 2: cloth-shell fallback --- */
  if (!loadedModel) {
    const texture = await loadTexture(textureUrl);
    garment = createGarment(texture, {
      width: 3.4,
      height: 4.25,
      amplitude: 0.55,
      curve: 1.45,
      sheen: 0.08,
    });
    group.add(garment);
  }

  stage.resize();
  stage.start();

  return {
    stage,

    /** Swap the colourway. Driven by the Shopify variant, not a colour picker. */
    async setColorway(url) {
      if (!garment) return; // GLB path recolours via its own material set
      try {
        const next = await loadTexture(url);
        const previous = garment.material.uniforms.uMap.value;
        garment.material.uniforms.uMap.value = next;
        previous?.dispose();
      } catch (error) {
        console.warn('[nova] colourway texture failed', error);
      }
    },

    reset: () => orbit.reset(),

    dispose() {
      orbit.dispose();
      stage.dispose();
    },
  };
}
