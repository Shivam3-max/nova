/**
 * Hero scene.
 *
 * A single cloth surface carrying the hero product plate, motes, and a contact
 * shadow, on the white page. Two inputs drive it:
 *   - pointer: parallax rotation and a push into the fabric
 *   - scroll:  camera pushes toward the garment, the garment turns and grows,
 *              then fades out as the first act arrives
 *
 * Loaded via dynamic import, so Three.js never reaches devices that fall back
 * to the static plate.
 */
import * as THREE from 'three';
import { createStage } from './renderer.js';
import { createGarment, createParticles, createShadow, loadTexture } from './garment.js';
import { gsap, ScrollTrigger } from '../animation/gsap.js';
import { env } from '../core/env.js';

export async function mountHeroScene(canvas, { textureUrl, section }) {
  const texture = await loadTexture(textureUrl);

  const pointer = new THREE.Vector2(0, 0);
  const smoothed = new THREE.Vector2(0, 0);

  /* Declared before createStage: createStage performs an initial resize before
     it returns, which calls onResize synchronously. Anything that handler
     touches must already exist or it hits the temporal dead zone. */
  const state = { cameraZ: 6.4, scrollTurn: 0, floatY: 0 };
  const group = new THREE.Group();

  const stage = createStage(canvas, {
    maxPixelRatio: 1.6,
    onRender(delta, elapsed) {
      // Damp the pointer so the garment never snaps.
      smoothed.lerp(pointer, 0.055);

      garment.material.uniforms.uTime.value = elapsed;
      garment.material.uniforms.uPointer.value.copy(smoothed);
      motes.material.uniforms.uTime.value = elapsed;

      group.rotation.y = smoothed.x * 0.22 + state.scrollTurn;
      group.rotation.x = -smoothed.y * 0.12;
      group.position.y = state.floatY + Math.sin(elapsed * 0.5) * 0.045;

      stage.camera.position.z = state.cameraZ;
      stage.camera.position.y = smoothed.y * 0.18;
      stage.camera.lookAt(0, 0, 0);
    },
    onResize(width, height) {
      // Keep the garment a consistent share of the viewport across breakpoints.
      const scale = Math.min(1, width / 1200) * 0.35 + 0.72;
      group.scale.setScalar(scale);
    },
  });

  stage.scene.add(group);

  const garment = createGarment(texture, { amplitude: 1, curve: 1.2, sheen: 0.045 });
  group.add(garment);

  const shadow = createShadow();
  group.add(shadow);

  const motes = createParticles(env.lowPower ? 120 : 240, 6.5);
  stage.scene.add(motes);

  stage.resize();
  stage.start();

  /* ------------------------------ pointer ------------------------------ */

  const onPointerMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  /* ------------------------------ intro -------------------------------- */

  const intro = gsap
    .timeline()
    .fromTo(
      garment.material.uniforms.uOpacity,
      { value: 0 },
      { value: 1, duration: 1.5, ease: 'power2.out' }
    )
    .fromTo(group.position, { y: -0.55 }, { y: 0, duration: 1.7, ease: 'expo.out' }, 0)
    .fromTo(
      group.rotation,
      { y: -0.5 },
      { y: 0, duration: 2.1, ease: 'expo.out' },
      0
    );

  canvas.classList.add('is-ready');
  section?.classList.add('is-webgl');

  /* --------------------------- scroll linkage --------------------------- */
  /* The hero hands off to the first act: camera closes in, the garment turns
     and lifts, then the whole group fades so the sections below arrive on a
     clean white page rather than through a busy scene. */

  const scrollScene = gsap.context(() => {
    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.8,
        },
      })
      .to(state, { cameraZ: 4.35, scrollTurn: 0.55, floatY: 0.35, ease: 'none' }, 0)
      .to(garment.material.uniforms.uAmplitude, { value: 2.1, ease: 'none' }, 0)
      .to(garment.material.uniforms.uOpacity, { value: 0, ease: 'power2.in', duration: 0.35 }, 0.62)
      .to(motes.material.uniforms.uOpacity, { value: 0, ease: 'none' }, 0.5);
  }, section || document.body);

  ScrollTrigger.refresh();

  return {
    stage,
    dispose() {
      intro.kill();
      scrollScene.revert();
      window.removeEventListener('pointermove', onPointerMove);
      section?.classList.remove('is-webgl');
      canvas.classList.remove('is-ready');
      stage.dispose();
    },
  };
}
