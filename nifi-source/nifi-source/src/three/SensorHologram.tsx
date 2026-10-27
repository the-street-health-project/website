/**
 * A concept hologram of the team's future low-cost nitrate sensor: a light source shines through
 * a small vial of water; a detector on the far side measures the glow; a circuit board sends the
 * reading to NiFi. This is an illustration only. No sensor logic exists in the app.
 */
import { useRef } from 'react';
import * as THREE from 'three';
import { createHologramMaterial, createSharedUniforms, createTextSprite } from './hologramMaterial';
import { useThreeScene } from './useThreeScene';

export default function SensorHologram({ reducedMotion, className = '' }: { reducedMotion: boolean; className?: string }) {
  const container = useRef<HTMLDivElement>(null);

  const { supported } = useThreeScene(
    container,
    ({ scene }) => {
      const shared = createSharedUniforms();
      const device = new THREE.Group();
      device.rotation.x = 0.35;
      scene.add(device);
      const holo = (color: string, opacity = 0.6) => {
        const m = createHologramMaterial(shared, { color, opacity, scanDensity: 50 });
        m.side = THREE.FrontSide; // one layer of glass per part; two layers stacked up into a white blur
        return m;
      };
      const edges = (geometry: THREE.BufferGeometry, color: string) =>
        new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));

      // Circuit board.
      const boardGeo = new THREE.BoxGeometry(3.4, 0.12, 2.2);
      const board = new THREE.Mesh(boardGeo, holo('#39ff88', 0.35));
      board.add(edges(boardGeo, '#b6ffd2'));
      board.position.y = -0.9;
      device.add(board);

      // The vial of water in the middle, with glowing liquid.
      const vialGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.7, 40, 1, true);
      const vial = new THREE.Mesh(vialGeo, holo('#b6ffd2', 0.3));
      vial.position.y = 0.05;
      device.add(vial);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.0, 40), holo('#3dff9a', 0.55));
      liquid.position.y = -0.3;
      device.add(liquid);

      // Light source (left) and detector (right).
      const ledGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const led = new THREE.Mesh(ledGeo, holo('#b38cff', 0.6));
      led.add(edges(ledGeo, '#d6c2ff'));
      led.position.set(-1.35, -0.3, 0);
      device.add(led);
      const detector = new THREE.Mesh(ledGeo.clone(), holo('#ffd23d', 0.55));
      detector.add(edges(ledGeo, '#ffe89a'));
      detector.position.set(1.35, -0.3, 0);
      device.add(detector);

      // The light beam passing through the water, and the glow reaching the detector.
      const beamIn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#b38cff', transparent: true, opacity: 0.9 }));
      beamIn.rotation.z = Math.PI / 2;
      beamIn.position.set(-0.6, -0.3, 0);
      device.add(beamIn);
      const beamOut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#3dff9a', transparent: true, opacity: 0.8 }));
      beamOut.rotation.z = Math.PI / 2;
      beamOut.position.set(0.6, -0.3, 0);
      device.add(beamOut);

      // Rings rising off the device, like a signal being sent.
      const rings = [0, 1, 2].map((i) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.5, 0.54, 64),
          new THREE.MeshBasicMaterial({ color: '#39ff88', transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.userData.offset = i / 3;
        device.add(ring);
        return ring;
      });

      const label = createTextSprite('CONCEPT', { glow: '#39ff88', size: 56, width: 384 });
      label.scale.set(2.1, 0.7, 1);
      label.position.set(0, 1.7, 0);
      device.add(label);

      return {
        update: (t) => {
          shared.uTime.value = t;
          shared.uScanX.value = Math.sin(t * 0.8) * 2.5;
          device.rotation.y = t * 0.4;
          (beamOut.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.4 * Math.sin(t * 4);
          for (const ring of rings) {
            const cycle = (t * 0.5 + ring.userData.offset) % 1;
            ring.position.y = 0.9 + cycle * 1.2;
            ring.scale.setScalar(1 + cycle * 1.4);
            (ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - cycle);
          }
        },
      };
    },
    {
      background: '#020604',
      cameraPosition: [0, 1.2, 7],
      target: [0, 0, 0],
      fov: 40,
      interactive: true,
      enableZoom: false,
      bloom: { strength: 0.45, radius: 0.15, threshold: 0.55 }, // glow only on the brightest parts
      reducedMotion,
      fitWidth: 5,
    },
    [reducedMotion],
  );

  if (!supported) return null;
  return (
    <div
      ref={container}
      className={`overflow-hidden rounded-2xl bg-[#020604] ${className}`}
      role="img"
      aria-label="Concept hologram of a low-cost nitrate sensor: a light shines through a vial of water and a detector measures the glow."
    />
  );
}
