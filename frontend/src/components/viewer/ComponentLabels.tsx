import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Box3, Group, Vector3 } from 'three';
import { useLab } from '../../state/labStore';
import type { SuspensionModel } from '../../three/rig/types';

interface Props {
  model: SuspensionModel;
  names: Map<string, string>;
}

/** Floating labels anchored to each component (right-side / centre instance). */
export function ComponentLabels({ model, names }: Props) {
  const show = useLab((s) => s.showLabels);
  const selected = useLab((s) => s.selectedComponentId);
  const hidden = useLab((s) => s.hidden);
  const anchors = useMemo(() => {
    const seen = new Map<string, SuspensionModel['parts'][number]['object'][]>();
    for (const p of model.parts) {
      const id = p.def.componentId;
      if (!id || !names.has(id) || p.def.side === 'L') continue;
      if (!seen.has(id)) seen.set(id, []);
      seen.get(id)!.push(p.object);
    }
    return [...seen.entries()].map(([id, objects]) => ({ id, objects }));
  }, [model, names]);

  const groups = useRef(new Map<string, Group>());
  const box = useMemo(() => new Box3(), []);
  const tmp = useMemo(() => new Vector3(), []);
  const frameNo = useRef(0);

  useFrame(() => {
    if (++frameNo.current % 2) return;
    for (const { id, objects } of anchors) {
      const g = groups.current.get(id);
      if (!g) continue;
      box.makeEmpty();
      for (const o of objects) box.expandByObject(o);
      if (box.isEmpty()) continue;
      box.getCenter(tmp);
      tmp.y = box.max.y * 0.35 + tmp.y * 0.65;
      g.position.copy(tmp);
    }
  });

  return (
    <group>
      {anchors.map(({ id }) => {
        const visible = !hidden[id] && (show || selected === id);
        return (
          <group key={id} ref={(g) => { if (g) groups.current.set(id, g); else groups.current.delete(id); }}>
            {visible && (
              <Html zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                <div className="label-3d" data-active={selected === id}>{names.get(id)}</div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
