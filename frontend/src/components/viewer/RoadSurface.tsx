import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, PlaneGeometry } from 'three';
import { useLab } from '../../state/labStore';
import { simClock } from '../../three/sim/clock';
import type { Timeline } from '../../three/sim/timeline';
import type { Side } from '../../three/rig/types';

const LENGTH = 3.2;
const SEGS = 80;
const WIDTH = 0.3;

/**
 * Two road strips under the wheels. Heights come from the same timeline that drives the
 * suspension, so the tyre contact patch stays on the road. Stripes scroll to show motion.
 */
export function RoadSurface({ timeline, trackHalf }: { timeline: Timeline; trackHalf: number }) {
  const strips = useMemo(() => (['L', 'R'] as Side[]).map((side) => {
    const g = new PlaneGeometry(WIDTH, LENGTH, 1, SEGS);
    g.rotateX(-Math.PI / 2);
    const colors = new Float32Array(g.attributes.position!.count * 3);
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return { side, g };
  }), []);

  useFrame(() => {
    const s = useLab.getState();
    const manual = s.mode === 'manual';
    const dist = simClock.wheelAngle * 0.31;
    for (const { side, g } of strips) {
      const pos = g.attributes.position as BufferAttribute;
      const col = g.attributes.color as BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const z = -pos.getZ(i); // PlaneGeometry rotated: +z local -> towards the back; flip so +dz is ahead
        const h = manual ? (side === 'L' ? s.manual.left : s.manual.right) : timeline.roadAhead(side, simClock.t, z);
        pos.setY(i, h - 0.004);
        const stripe = (((z + dist) % 0.5) + 0.5) % 0.5 < 0.06 ? 0.11 : 0.045;
        const fade = Math.max(0, 1 - Math.abs(z) / (LENGTH / 2)) * 0.85 + 0.15;
        col.setXYZ(i, stripe * fade, (stripe + 0.02) * fade, (stripe + 0.05) * fade);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
      g.computeVertexNormals();
    }
  });

  return (
    <group>
      {strips.map(({ side, g }) => (
        <mesh key={side} geometry={g} position={[side === 'R' ? trackHalf : -trackHalf, 0, 0]} receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.95} metalness={0} envMapIntensity={0.15} color="#8a96a8" />
        </mesh>
      ))}
    </group>
  );
}
