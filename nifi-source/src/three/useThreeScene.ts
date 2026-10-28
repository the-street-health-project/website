/**
 * Everything a 3D scene needs, set up once for all of NiFi's holograms:
 * renderer, camera, optional mouse/touch rotation, a glow ("bloom") effect, resizing,
 * an animation loop that pauses when the scene is off-screen or the tab is hidden (saves battery),
 * still frames for people who turn off motion, and clean-up when the screen closes.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { usePageTurnDone } from '../fx/pageTurn';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls | null;
  reducedMotion: boolean;
  /** Ask for one new frame (used when motion is off and something changed). */
  invalidate: () => void;
}

export interface SceneHandle {
  /** Called every frame with the time in seconds. */
  update?: (time: number, delta: number) => void;
  /** Remove any event listeners added by the scene. */
  dispose?: () => void;
}

export interface SceneOptions {
  background: THREE.ColorRepresentation;
  cameraPosition: [number, number, number];
  target?: [number, number, number];
  fov?: number;
  interactive: boolean; // drag to rotate, pinch/scroll to zoom
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  enableZoom?: boolean;
  bloom?: { strength: number; radius: number; threshold: number };
  reducedMotion: boolean;
  /** Pulls the camera back on tall, narrow screens so the whole scene fits. */
  fitWidth?: number;
}

let webgl: boolean | undefined;

/** True if this device can draw WebGL 3D graphics. Checked once (making a test context is slow). */
export function webglAvailable(): boolean {
  if (webgl !== undefined) return webgl;
  try {
    const canvas = document.createElement('canvas');
    webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}

export function useThreeScene(
  container: RefObject<HTMLDivElement | null>,
  build: (ctx: SceneContext) => SceneHandle,
  options: SceneOptions,
  deps: unknown[],
): { supported: boolean } {
  const [supported] = useState(webglAvailable);
  const buildRef = useRef(build);
  buildRef.current = build;
  // During a 3D page turn, wait: building a scene takes a few hundred milliseconds and would hold the turn up.
  const turnDone = usePageTurnDone();

  useEffect(() => {
    const el = container.current;
    if (!el || !supported || !turnDone) return;

    // --- renderer and camera ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(options.background, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Set as the scene's background (not only the clear color) so the glow pass doesn't brighten
    // it twice: with just the clear color, near-black came out slate blue.
    scene.background = new THREE.Color(options.background);
    const camera = new THREE.PerspectiveCamera(options.fov ?? 38, 1, 0.05, 200);
    const target = new THREE.Vector3(...(options.target ?? [0, 0, 0]));
    const basePosition = new THREE.Vector3(...options.cameraPosition);
    camera.position.copy(basePosition);
    camera.lookAt(target);

    // --- glow: render the scene, then blur its bright parts and add them back on top ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    let bloom: UnrealBloomPass | null = null;
    if (options.bloom) {
      bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), options.bloom.strength, options.bloom.radius, options.bloom.threshold);
      composer.addPass(bloom);
    }
    composer.addPass(new OutputPass());

    // --- animation loop ---
    // Set up before the drag controls, because the controls ask for a frame as soon as they start.
    let controls: OrbitControls | null = null;
    let frame = 0;
    let running = false;
    let visible = true;
    let needsFrame = true;
    const clock = new THREE.Clock();
    let handle: SceneHandle = {};

    const renderOnce = () => {
      controls?.update();
      composer.render();
    };
    const tick = () => {
      frame = 0;
      const delta = Math.min(clock.getDelta(), 0.1);
      const animating = !options.reducedMotion;
      needsFrame = false; // cleared before drawing, so changes made while drawing (damping) ask for another frame
      if (animating) handle.update?.(clock.elapsedTime, delta);
      renderOnce();
      // With motion off, only draw again while the user is rotating it (damping) or something changed.
      if (visible && (animating || controls?.autoRotate || needsFrame)) frame = requestAnimationFrame(tick);
      else running = false;
    };
    function invalidate() {
      needsFrame = true;
      if (!running && visible) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    }

    // --- drag to rotate ---
    let resumeTimer = 0;
    if (options.interactive) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.enableZoom = options.enableZoom ?? true;
      controls.minDistance = options.minDistance ?? 4;
      controls.maxDistance = options.maxDistance ?? 20;
      controls.minPolarAngle = 0.25;
      controls.maxPolarAngle = 1.4;
      controls.autoRotate = !options.reducedMotion && !!options.autoRotateSpeed;
      controls.autoRotateSpeed = options.autoRotateSpeed ?? 0;
      // Stop spinning while someone is touching it; start again after a few quiet seconds.
      controls.addEventListener('start', () => {
        if (controls) controls.autoRotate = false;
        window.clearTimeout(resumeTimer);
      });
      controls.addEventListener('end', () => {
        resumeTimer = window.setTimeout(() => {
          if (controls) controls.autoRotate = !options.reducedMotion && !!options.autoRotateSpeed;
          invalidate();
        }, 6000);
      });
      controls.addEventListener('change', () => invalidate());
      controls.update();
    }

    // --- size: match the container, and fit the scene on narrow screens ---
    let fitted = false;
    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom?.setSize(Math.round(w / 2), Math.round(h / 2));
      camera.aspect = w / h;
      if (!fitted && options.fitWidth) {
        // How far back the camera must be so `fitWidth` units fill the screen's width.
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const needed = options.fitWidth / 2 / (halfH * camera.aspect) + 1.5;
        const dir = basePosition.clone().sub(target).normalize();
        camera.position.copy(target).addScaledVector(dir, Math.max(basePosition.distanceTo(target), needed));
        if (controls) controls.maxDistance = Math.max(controls.maxDistance, camera.position.distanceTo(target) + 4);
        fitted = true;
      }
      camera.updateProjectionMatrix();
      invalidate();
    };
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(el);

    // Pause when scrolled out of view or the browser tab is hidden.
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      if (visible) invalidate();
    });
    viewObserver.observe(el);
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) invalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // --- build the scene's contents ---
    handle = buildRef.current({ scene, camera, renderer, controls, reducedMotion: options.reducedMotion, invalidate });
    handle.update?.(0, 0); // set up the first frame (also the still frame when motion is off)
    resize();

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resumeTimer);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      handle.dispose?.();
      controls?.dispose();
      // Free GPU memory: every geometry, material, and texture we created.
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const m of mats) {
          for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
          m.dispose();
        }
      });
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // `options` are read once when the scene is built; anything that should rebuild it goes in `deps`.
  }, [supported, turnDone, ...deps]);

  return { supported };
}
