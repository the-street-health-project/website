/**
 * A hologram of the nitrate ion, NO3-: one nitrogen atom in the middle and three oxygen atoms
 * spread 120 degrees apart in a flat triangle. The three bonds are identical (the extra electron
 * is shared among all three oxygens), which is why they're drawn the same. Drag to turn it.
 */
import { useRef } from 'react';
import * as THREE from 'three';
import { createHologramMaterial, createSharedUniforms, createTextSprite } from './hologramMaterial';
import { useThreeScene } from './useThreeScene';

export default function NitrateMolecule({ reducedMotion, className = '' }: { reducedMotion: boolean; className?: string }) {
  const container = useRef<HTMLDivElement>(null);

  const { supported } = useThreeScene(
    container,
    ({ scene }) => {
      const shared = createSharedUniforms();
      const molecule = new THREE.Group();
      molecule.rotation.x = -0.5; // tip it toward the viewer so the flat triangle is easy to see
      scene.add(molecule);

      const atom = (radius: number, color: string, label: string, x: number, y: number) => {
        const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), createHologramMaterial(shared, { color, opacity: 0.6, scanDensity: 30 }));
        (shell.material as THREE.ShaderMaterial).side = THREE.FrontSide; // one layer of glass, not two
        const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.35, 24, 16), new THREE.MeshBasicMaterial({ color }));
        const text = createTextSprite(label, { glow: color, size: 96 });
        text.scale.set(1.5, 0.75, 1);
        text.position.set(0, 0, radius + 0.05);
        const g = new THREE.Group();
        g.add(shell, core, text);
        g.position.set(x, y, 0);
        molecule.add(g);
      };

      const BOND = 1.35; // drawing scale: real N–O bonds are about 0.124 nanometers
      atom(0.42, '#5aa9ff', 'N', 0, 0);
      for (let i = 0; i < 3; i++) {
        const angle = Math.PI / 2 + (i * 2 * Math.PI) / 3; // 120° apart
        const x = Math.cos(angle) * BOND;
        const y = Math.sin(angle) * BOND;
        atom(0.5, '#ff5a6e', 'O', x, y);
        // The bond: a glowing rod from the nitrogen to this oxygen.
        const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, BOND, 16, 1, true), createHologramMaterial(shared, { color: '#b6ffd2', opacity: 0.7 }));
        bond.position.set(x / 2, y / 2, 0);
        bond.rotation.z = angle - Math.PI / 2;
        molecule.add(bond);
      }

      // A faint cloud for the shared extra electron that gives nitrate its negative charge.
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(2.3, 48, 32), createHologramMaterial(shared, { color: '#39ff88', opacity: 0.12, scanDensity: 18 }));
      (cloud.material as THREE.ShaderMaterial).side = THREE.FrontSide;
      molecule.add(cloud);
      const charge = createTextSprite('NO₃⁻', { glow: '#39ff88', size: 80 });
      charge.scale.set(2.2, 1.1, 1);
      charge.position.set(2.0, 2.0, 0);
      molecule.add(charge);

      return {
        update: (t) => {
          shared.uTime.value = t;
          shared.uScanX.value = Math.sin(t * 0.6) * 3;
          molecule.rotation.y = t * 0.45;
        },
      };
    },
    {
      background: '#020604',
      cameraPosition: [0, 0, 8.5],
      fov: 40,
      interactive: true,
      enableZoom: false,
      bloom: { strength: 0.45, radius: 0.15, threshold: 0.55 }, // glow only on the brightest parts, so the atoms stay sharp
      reducedMotion,
      fitWidth: 6,
    },
    [reducedMotion],
  );

  if (!supported) return null;
  return (
    <div
      ref={container}
      className={`overflow-hidden rounded-2xl bg-[#020604] ${className}`}
      role="img"
      aria-label="3D model of a nitrate ion: one nitrogen atom bonded to three oxygen atoms in a flat triangle, with a negative charge."
    />
  );
}
