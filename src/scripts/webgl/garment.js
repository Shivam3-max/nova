/**
 * Procedural garment surface.
 *
 * Rather than fake a 3D hoodie out of primitives — which always reads as a toy
 * — the garment is presented the way a studio would shoot it: the product plate
 * mapped onto a cloth surface that is curved as if hung on an invisible form,
 * lit from one side, and displaced by a fabric shader so it breathes.
 *
 * In production, if the merchant has attached a real 3D model to the product in
 * Shopify (Shopify supports GLB product media natively), the viewer loads that
 * instead — see viewer-scene.js. This is the fallback that always works, and
 * it needs no asset pipeline.
 */
import * as THREE from 'three';

export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2  uPointer;
  uniform float uAmplitude;
  uniform float uCurve;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying float vWave;

  // Cheap value noise — enough character for cloth, far cheaper than simplex.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Hang the cloth on an invisible form: bend the plane around Y.
    float bend = (uv.x - 0.5);
    pos.z -= bend * bend * uCurve;

    // Fabric motion. Two travelling waves plus noise, damped at the top edge
    // so the garment appears suspended rather than floating free.
    float hang = smoothstep(0.0, 0.55, uv.y);
    float wave =
        sin(uv.x * 6.2 + uTime * 0.72) * 0.045
      + sin(uv.y * 4.4 - uTime * 0.53) * 0.032
      + (noise(uv * 3.4 + uTime * 0.13) - 0.5) * 0.09;

    // Cursor pushes the surface away like air moving across it.
    float pointerPush = (1.0 - distance(uv, uPointer * 0.5 + 0.5)) * 0.16;

    float displacement = (wave + pointerPush) * uAmplitude * hang;
    pos.z += displacement;

    vWave = displacement;

    // Recompute a usable normal from the wave gradient for the lighting term.
    float eps = 0.012;
    float dx = sin((uv.x + eps) * 6.2 + uTime * 0.72) * 0.045 - sin(uv.x * 6.2 + uTime * 0.72) * 0.045;
    float dy = sin((uv.y + eps) * 4.4 - uTime * 0.53) * 0.032 - sin(uv.y * 4.4 - uTime * 0.53) * 0.032;
    vNormal = normalize(vec3(-dx / eps, -dy / eps, 1.0));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3  uLight;
  uniform float uOpacity;
  uniform float uSheen;
  uniform vec3  uTint;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying float vWave;

  void main() {
    vec4 texel = texture2D(uMap, vUv);

    // Drop the plate's transparent surround so the garment floats.
    if (texel.a < 0.02) discard;

    vec3 normal = normalize(vNormal);
    float diffuse = clamp(dot(normal, normalize(uLight)), 0.0, 1.0);

    // Soft studio wrap: never let the shadow side go fully black.
    float light = mix(0.82, 1.16, diffuse);

    // Sheen along the wave crests reads as fabric catching the light.
    float sheen = smoothstep(0.01, 0.07, vWave) * uSheen;

    vec3 colour = texel.rgb * uTint * light + sheen;

    gl_FragColor = vec4(colour, texel.a * uOpacity);
  }
`;

/**
 * Build the cloth mesh.
 * @param {THREE.Texture} texture product plate
 */
export function createGarment(texture, options = {}) {
  const {
    width = 3.1,
    height = 3.9,
    segments = 72,
    amplitude = 1,
    curve = 1.15,
    sheen = 0.05,
    tint = new THREE.Color(1, 1, 1),
  } = options;

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  const geometry = new THREE.PlaneGeometry(width, height, segments, Math.round(segments * 1.2));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uAmplitude: { value: amplitude },
      uCurve: { value: curve },
      uLight: { value: new THREE.Vector3(-0.45, 0.7, 0.9) },
      uOpacity: { value: 1 },
      uSheen: { value: sheen },
      uTint: { value: tint },
    },
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'garment';
  return mesh;
}

/**
 * Fabric motes drifting around the garment. Points, one draw call, additive
 * enough to read on white without turning into glitter.
 */
export function createParticles(count = 260, spread = 6) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 1.15;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.5;
    scales[i] = Math.random() * 0.6 + 0.25;
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 26 },
      uColor: { value: new THREE.Color('#0d0d0f') },
      uOpacity: { value: 0.24 },
    },
    vertexShader: /* glsl */ `
      attribute float aScale;
      attribute float aSeed;
      uniform float uTime;
      uniform float uSize;
      varying float vFade;

      void main() {
        vec3 pos = position;
        pos.y += sin(uTime * 0.22 + aSeed) * 0.34;
        pos.x += cos(uTime * 0.17 + aSeed * 1.7) * 0.26;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aScale * (1.0 / -mv.z);

        // Fade motes that drift toward the camera so nothing pops.
        vFade = smoothstep(0.0, 3.0, -mv.z) * (1.0 - smoothstep(9.0, 14.0, -mv.z));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.1, d) * uOpacity * vFade;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'motes';
  return points;
}

/** Soft contact shadow so the garment sits in the page instead of over it. */
export function createShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(13,13,15,0.34)');
  gradient.addColorStop(0.55, 'rgba(13,13,15,0.12)');
  gradient.addColorStop(1, 'rgba(13,13,15,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.5),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2.1;
  mesh.position.y = -2.1;
  mesh.name = 'shadow';
  return mesh;
}

/** Promise-based texture load that never rejects the whole scene. */
export function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () =>
      reject(new Error(`Could not load texture: ${url}`))
    );
  });
}
