/**
 * A 3D hologram of Iowa's nitrate sensors.
 *
 *   - Iowa's 99 counties are a glowing glass plate, its border traced in brighter light.
 *   - Every sensor is a pillar of light. Its HEIGHT is the nitrate reading; its color is the level.
 *   - A sheet of red glass floats at the height of the EPA limit (10 mg/L). Pillars that pierce it
 *     are over the limit, which you can see from across the room.
 *   - A projector disc, a light beam, drifting particles, and a scanning sweep sell the hologram.
 *
 * Drag to rotate, pinch or scroll to zoom, tap a pillar to open that site.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import countiesJson from '../data/geo/iowa-counties.json';
import type { Site } from '../data/types';
import { EPA_LIMIT, isAboveLimit, levelFor } from '../lib/nitrate';
import { createHologramMaterial, createSharedUniforms, createTextSprite, HOLO_COLORS } from './hologramMaterial';
import { ORIGIN, PLATE_THICKNESS, pillarHeight, toScene, UNITS_PER_DEGREE } from './projection';
import { useThreeScene } from './useThreeScene';

const counties = countiesJson as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

interface Props {
  sites: Site[];
  selectedId?: string | null;
  onSelect?: (site: Site) => void;
  mode?: 'interactive' | 'hero';
  reducedMotion: boolean;
  className?: string;
}

/** Outer rings of every county polygon, as [lon, lat] lists. */
function countyRings(): number[][][] {
  const rings: number[][][] = [];
  for (const f of counties.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) rings.push(poly[0]);
  }
  return rings;
}

/** A ring as a flat shape. Shapes are drawn in x/y, then laid down so y becomes -z (north). */
function ringToShape(ring: number[][]): THREE.Shape {
  const shape = new THREE.Shape();
  ring.forEach(([lon, lat], i) => {
    const { x } = toScene(lon, lat);
    const y = (lat - ORIGIN.lat) * UNITS_PER_DEGREE;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  return shape;
}

export default function HologramIowa({ sites, selectedId = null, onSelect, mode = 'interactive', reducedMotion, className = '' }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [hovered, setHovered] = useState<Site | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  const hero = mode === 'hero';
  const siteKey = sites.map((s) => `${s.id}:${s.latest?.value}`).join('|');

  const { supported } = useThreeScene(
    container,
    ({ scene, camera, renderer, invalidate }) => {
      const shared = createSharedUniforms();
      const top = PLATE_THICKNESS;
      const world = new THREE.Group(); // everything goes in here, so the welcome-screen version can spin as one piece
      scene.add(world);

      // ---------- the glass map plate ----------
      // The top is one flat sheet made of every county's shape. (Giving each county its own walls
      // stacked 99 sets of glowing glass and washed the picture out to white.)
      const rings = countyRings();
      const plateGeometries = rings.map((ring) => {
        const g = new THREE.ShapeGeometry(ringToShape(ring));
        g.rotateX(-Math.PI / 2); // lay the shape flat, facing up
        return g;
      });
      const plateTop = mergeGeometries(plateGeometries);
      plateGeometries.forEach((g) => g.dispose());
      plateTop.translate(0, top, 0);
      const plate = new THREE.Mesh(plateTop, createHologramMaterial(shared, { color: HOLO_COLORS.cyan, opacity: 0.3, scanDensity: 40 }));
      world.add(plate);

      // County lines on top, and Iowa's border (segments used by only one county) traced brighter.
      const seen = new Map<string, number>();
      const key = (a: number[], b: number[]) => {
        const p = `${a[0].toFixed(4)},${a[1].toFixed(4)}`;
        const q = `${b[0].toFixed(4)},${b[1].toFixed(4)}`;
        return p < q ? `${p}|${q}` : `${q}|${p}`;
      };
      for (const ring of rings) for (let i = 1; i < ring.length; i++) seen.set(key(ring[i - 1], ring[i]), (seen.get(key(ring[i - 1], ring[i])) ?? 0) + 1);
      const inner: number[] = [];
      const border: number[] = [];
      const walls: number[] = []; // two triangles per border segment: the plate's outside edge
      for (const ring of rings) {
        for (let i = 1; i < ring.length; i++) {
          const a = toScene(ring[i - 1][0], ring[i - 1][1]);
          const b = toScene(ring[i][0], ring[i][1]);
          const list = seen.get(key(ring[i - 1], ring[i]))! > 1 ? inner : border;
          list.push(a.x, top + 0.002, a.z, b.x, top + 0.002, b.z);
          if (list === border) {
            list.push(a.x, 0, a.z, b.x, 0, b.z); // trace the bottom edge too
            walls.push(a.x, 0, a.z, b.x, 0, b.z, b.x, top, b.z, a.x, 0, a.z, b.x, top, b.z, a.x, top, a.z);
          }
        }
      }
      const wallGeometry = new THREE.BufferGeometry();
      wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(walls, 3));
      wallGeometry.computeVertexNormals();
      world.add(new THREE.Mesh(wallGeometry, createHologramMaterial(shared, { color: HOLO_COLORS.cyan, opacity: 0.55, scanDensity: 40 })));
      const lines = (positions: number[], color: string, opacity: number) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
      };
      world.add(lines(inner, HOLO_COLORS.cyan, 0.35));
      world.add(lines(border, '#b6ffd2', 1));

      // ---------- the projector underneath ----------
      const projectorY = -0.9;
      const discMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime, uColor: { value: new THREE.Color(HOLO_COLORS.cyan) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
          void main(){
            float r = length(vUv - 0.5) * 2.0;
            float rings = smoothstep(0.92, 1.0, sin(r * 48.0 - uTime * 2.0) * 0.5 + 0.5);
            float fade = smoothstep(1.0, 0.2, r);
            float spokes = smoothstep(0.985, 1.0, abs(sin(atan(vUv.y - 0.5, vUv.x - 0.5) * 12.0)));
            gl_FragColor = vec4(uColor, (0.04 + 0.45 * rings + 0.2 * spokes) * fade);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(6.6, 96), discMaterial);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = projectorY;
      world.add(disc);

      // Rotating arcs around the rim.
      const arcs: THREE.Mesh[] = [];
      [
        [6.0, 6.08, 0, Math.PI * 1.2],
        [6.35, 6.4, 1, Math.PI * 0.6],
        [5.6, 5.64, 2.5, Math.PI * 0.9],
      ].forEach(([inR, outR, start, length]) => {
        const arc = new THREE.Mesh(
          new THREE.RingGeometry(inR, outR, 96, 1, start, length),
          new THREE.MeshBasicMaterial({ color: HOLO_COLORS.cyan, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
        );
        arc.rotation.x = -Math.PI / 2;
        arc.position.y = projectorY + 0.01;
        arcs.push(arc);
        world.add(arc);
      });

      // The cone of light from the projector up to the map.
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(6.2, 1.1, Math.abs(projectorY), 64, 1, true),
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(HOLO_COLORS.cyan) } },
          vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: `uniform vec3 uColor; varying float vY; void main(){ gl_FragColor = vec4(uColor, 0.02 + 0.05 * smoothstep(-0.45, 0.45, vY)); }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
      beam.position.y = projectorY / 2;
      world.add(beam);

      // ---------- the EPA limit: a sheet of red glass ----------
      const limitY = top + pillarHeight(EPA_LIMIT);
      const limit = new THREE.Mesh(
        new THREE.PlaneGeometry(10.8, 7.0, 1, 1),
        new THREE.ShaderMaterial({
          uniforms: { uTime: shared.uTime, uColor: { value: new THREE.Color(HOLO_COLORS.limit) } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: `
            uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
            void main(){
              vec2 grid = abs(fract(vUv * vec2(28.0, 18.0)) - 0.5);
              float line = smoothstep(0.47, 0.5, max(grid.x, grid.y));
              float edge = smoothstep(0.035, 0.0, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
              float shimmer = 0.5 + 0.5 * sin((vUv.x + vUv.y) * 18.0 - uTime * 1.5);
              gl_FragColor = vec4(uColor, 0.07 + 0.12 * line + 0.6 * edge + 0.05 * shimmer);
            }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
      limit.rotation.x = -Math.PI / 2;
      limit.position.set(0, limitY, 0);
      world.add(limit);
      if (!hero) {
        const limitLabel = createTextSprite('EPA LIMIT · 10 mg/L', { color: '#ffd0d5', glow: HOLO_COLORS.limit, size: 40, width: 512 });
        limitLabel.scale.set(2.8, 0.7, 1);
        limitLabel.position.set(-3.6, limitY + 0.25, 3.4);
        world.add(limitLabel);
      }

      // ---------- a pillar of light for every sensor ----------
      interface Pillar {
        site: Site;
        body: THREE.Mesh;
        cap: THREE.Mesh;
        ring: THREE.Mesh;
        hit: THREE.Mesh;
        phase: number;
      }
      const pillars: Pillar[] = [];
      const hitTargets: THREE.Object3D[] = [];
      sites.forEach((site, i) => {
        if (!site.latest) return;
        const value = site.latest.value;
        const level = levelFor(value);
        const community = site.kind === 'community';
        const color = community ? HOLO_COLORS.community : HOLO_COLORS[level];
        const { x, z } = toScene(site.lon, site.lat);
        const h = pillarHeight(value);

        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(community ? 0.06 : 0.075, community ? 0.06 : 0.075, h, 24, 1, true),
          createHologramMaterial(shared, { color, opacity: community ? 0.5 : 0.7, scanDensity: 70 }),
        );
        // Front faces only: drawing the inside too doubled the light and turned red and yellow pillars white.
        (body.material as THREE.ShaderMaterial).side = THREE.FrontSide;
        if (community) (body.material as THREE.ShaderMaterial).wireframe = true;
        body.position.set(x, top + h / 2, z);

        const cap = new THREE.Mesh(new THREE.SphereGeometry(community ? 0.08 : 0.1, 20, 12), new THREE.MeshBasicMaterial({ color }));
        cap.position.set(x, top + h, z);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.13, 0.17, 48),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, top + 0.01, z);

        // A wider, invisible cylinder so pillars are easy to tap with a finger.
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, h + 0.4, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
        hit.position.set(x, top + h / 2, z);
        hit.userData.site = site;

        world.add(body, cap, ring, hit);
        hitTargets.push(hit);
        pillars.push({ site, body, cap, ring, hit, phase: i * 0.37 });

        if (!hero) {
          const label = createTextSprite(value.toFixed(1), { glow: color, size: 60 });
          label.scale.set(1.0, 0.5, 1);
          label.position.set(x, top + h + 0.4, z);
          world.add(label);
        }
      });

      // ---------- drifting particles ----------
      const COUNT = hero ? 220 : 360;
      const positions = new Float32Array(COUNT * 3);
      const speeds = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i++) {
        const r = Math.sqrt(Math.random()) * 6;
        const a = Math.random() * Math.PI * 2;
        positions.set([Math.cos(a) * r, projectorY + Math.random() * 3.6, Math.sin(a) * r], i * 3);
        speeds[i] = 0.08 + Math.random() * 0.22;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(
        particleGeometry,
        new THREE.PointsMaterial({ color: HOLO_COLORS.cyan, size: 0.035, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      world.add(particles);

      // ---------- tapping and hovering ----------
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pick = (event: PointerEvent): Site | null => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hitResult = raycaster.intersectObjects(hitTargets, false)[0];
        return hitResult ? (hitResult.object.userData.site as Site) : null;
      };
      let downX = 0;
      let downY = 0;
      const onDown = (e: PointerEvent) => {
        downX = e.clientX;
        downY = e.clientY;
      };
      const onUp = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // that was a drag, not a tap
        const site = pick(e);
        if (site) onSelectRef.current?.(site);
      };
      let lastHover: Site | null = null;
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        const site = pick(e);
        renderer.domElement.style.cursor = site ? 'pointer' : 'grab';
        if (tooltip.current && site) {
          const rect = renderer.domElement.getBoundingClientRect();
          tooltip.current.style.transform = `translate(${e.clientX - rect.left + 14}px, ${e.clientY - rect.top + 14}px)`;
        }
        if (site !== lastHover) {
          lastHover = site;
          setHovered(site);
          refreshRef.current();
        }
      };
      const onLeave = () => {
        lastHover = null;
        setHovered(null);
      };
      if (!hero) {
        renderer.domElement.addEventListener('pointerdown', onDown);
        renderer.domElement.addEventListener('pointerup', onUp);
        renderer.domElement.addEventListener('pointermove', onMove);
        renderer.domElement.addEventListener('pointerleave', onLeave);
      }

      // ---------- animation ----------
      const position = particleGeometry.attributes.position as THREE.BufferAttribute;
      const applyHighlights = () => {
        for (const p of pillars) {
          const active = p.site.id === selectedRef.current || p.site.id === lastHover?.id;
          (p.body.material as THREE.ShaderMaterial).uniforms.uHighlight.value = active ? 0.9 : 0;
          p.cap.scale.setScalar(active ? 1.6 : 1);
        }
      };
      refreshRef.current = () => {
        applyHighlights();
        invalidate();
      };
      return {
        update: (t, dt) => {
          if (hero) world.rotation.y = t * 0.18;
          shared.uTime.value = t;
          shared.uScanX.value = Math.sin(t * 0.35) * 6.5;
          arcs.forEach((arc, i) => (arc.rotation.z = t * (0.15 + i * 0.12) * (i % 2 ? -1 : 1)));
          for (let i = 0; i < COUNT; i++) {
            let y = position.getY(i) + speeds[i] * dt;
            if (y > 2.8) y = projectorY;
            position.setY(i, y);
          }
          position.needsUpdate = true;
          for (const p of pillars) {
            // Pillars over the limit send out a pulse ring from their base.
            const over = isAboveLimit(p.site.latest?.value ?? 0);
            const cycle = (t * 0.7 + p.phase) % 1;
            p.ring.scale.setScalar(over ? 1 + cycle * 3 : 1 + 0.15 * Math.sin(t * 2 + p.phase));
            (p.ring.material as THREE.MeshBasicMaterial).opacity = over ? 0.9 * (1 - cycle) : 0.7;
            p.cap.position.y = PLATE_THICKNESS + pillarHeight(p.site.latest?.value ?? 0) + 0.03 * Math.sin(t * 2.2 + p.phase);
          }
          applyHighlights();
        },
        dispose: () => {
          renderer.domElement.removeEventListener('pointerdown', onDown);
          renderer.domElement.removeEventListener('pointerup', onUp);
          renderer.domElement.removeEventListener('pointermove', onMove);
          renderer.domElement.removeEventListener('pointerleave', onLeave);
        },
      };
    },
    {
      background: '#020604',
      cameraPosition: hero ? [0, 6.2, 9.6] : [0, 7.2, 9.4],
      target: [0, 0.5, 0],
      fov: 38,
      interactive: !hero,
      autoRotateSpeed: hero ? 0 : 0.55,
      minDistance: 5,
      maxDistance: 20,
      // Only bright things (pillars, border, labels) glow; the faint glass stays crisp.
      bloom: { strength: 0.4, radius: 0.1, threshold: 0.6 },
      reducedMotion,
      fitWidth: hero ? 12.5 : 11.5,
    },
    [siteKey, hero, reducedMotion],
  );

  // Update the glow on the selected pillar when the selection changes (works with motion off too).
  useEffect(() => refreshRef.current(), [selectedId]);

  if (!supported) {
    return (
      <div className={`grid place-items-center bg-[#020604] p-6 text-center text-white ${className}`}>
        <p>This device can't show 3D graphics. The 2D map has the same data.</p>
      </div>
    );
  }

  const v = hovered?.latest?.value;
  return (
    <div className={`relative overflow-hidden bg-[#020604] ${className}`}>
      <div
        ref={container}
        className="h-full w-full"
        role="img"
        aria-label={`3D hologram of Iowa. Each light pillar is a monitoring site; taller pillars mean more nitrate. A red glass layer marks the EPA limit of ${EPA_LIMIT} mg/L. ${sites.filter((s) => isAboveLimit(s.latest?.value ?? 0)).length} sites rise above it.`}
        style={hero ? { pointerEvents: 'none' } : undefined}
      />
      {!hero && (
        <div ref={tooltip} className={`pointer-events-none absolute left-0 top-0 rounded-lg bg-black/80 px-3 py-2 text-sm text-white ring-1 ring-[#39ff88]/60 ${hovered ? '' : 'hidden'}`}>
          {hovered && (
            <>
              <strong className="block">{hovered.name}</strong>
              {v != null && `${v.toFixed(1)} mg/L`}
            </>
          )}
        </div>
      )}
    </div>
  );
}
