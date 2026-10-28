/**
 * The "hologram" look, written as a small GPU shader.
 *
 * A hologram in movies is see-through, glows brightest at its edges, has thin horizontal
 * scan lines, and flickers a little. This shader does exactly those four things:
 *   - fresnel: surfaces facing away from the camera (the edges) glow more
 *   - scan lines: a sine wave on the height (y) makes stripes that crawl upward over time
 *   - sweep: a bright band slides across the map (uScanX)
 *   - flicker: a fast, tiny wobble in brightness
 * Additive blending makes overlapping parts add up to brighter light, like real light does.
 */
import * as THREE from 'three';

/** Uniforms shared by every hologram material, so one update per frame animates all of them. */
export interface SharedUniforms {
  uTime: { value: number };
  uScanX: { value: number };
}

export function createSharedUniforms(): SharedUniforms {
  return { uTime: { value: 0 }, uScanX: { value: -100 } };
}

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uScanX;
  uniform float uHighlight;
  uniform float uScanDensity;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 2.0);
    float scan = 0.5 + 0.5 * sin(vWorldPos.y * uScanDensity - uTime * 3.0);
    float sweep = smoothstep(0.45, 0.0, abs(vWorldPos.x - uScanX));
    float flicker = 0.93 + 0.07 * sin(uTime * 21.0 + vWorldPos.x * 2.7);
    vec3 color = uColor * (0.45 + 1.1 * fresnel + 0.25 * scan + 0.9 * sweep + uHighlight);
    float alpha = uOpacity * (0.32 + 0.68 * fresnel + 0.18 * scan + 0.6 * sweep + 0.5 * uHighlight) * flicker;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

export interface HologramOptions {
  color: THREE.ColorRepresentation;
  opacity?: number;
  scanDensity?: number; // stripes per unit of height
}

export function createHologramMaterial(shared: SharedUniforms, opts: HologramOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(opts.color) },
      uOpacity: { value: opts.opacity ?? 0.6 },
      uHighlight: { value: 0 },
      uScanDensity: { value: opts.scanDensity ?? 60 },
      uTime: shared.uTime,
      uScanX: shared.uScanX,
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/** A text label drawn on a canvas and shown as a sprite that always faces the camera. */
export function createTextSprite(text: string, opts: { color?: string; glow?: string; size?: number; width?: number } = {}): THREE.Sprite {
  const width = opts.width ?? 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `700 ${opts.size ?? 64}px "Atkinson Hyperlegible", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = opts.glow ?? '#39ff88';
  ctx.shadowBlur = 18;
  ctx.fillStyle = opts.color ?? '#ffffff';
  ctx.fillText(text, width / 2, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width / 256, 0.5, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Colors for nitrate levels in the hologram (brighter than the 2D map, because they glow on black). */
export const HOLO_COLORS = {
  cyan: '#39ff88',
  low: '#3dff9a',
  watch: '#ffd23d',
  high: '#ff4d5e',
  community: '#b38cff',
  limit: '#ff3b4f',
} as const;
