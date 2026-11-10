import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Box3, Vector3, type Object3D } from 'three';
import { useLab } from '../../state/labStore';
import type { SuspensionModel } from '../../three/rig/types';

interface Props {
  model: SuspensionModel;
  names: Map<string, string>;
}

const LABEL_H = 24;
const GAP = 4;

/**
 * Component labels in a single screen-space overlay. Each frame, anchors (right/centre part
 * bounding boxes) are projected and labels are de-cluttered with a greedy vertical layout;
 * a leader line connects each label to its anchor. DOM is mutated directly (no React re-render).
 */
export function ComponentLabels({ model, names }: Props) {
  const show = useLab((s) => s.showLabels);
  const selected = useLab((s) => s.selectedComponentId);
  const hidden = useLab((s) => s.hidden);
  const { camera, size } = useThree();

  const anchors = useMemo(() => {
    const seen = new Map<string, Object3D[]>();
    for (const p of model.parts) {
      const id = p.def.componentId;
      if (!id || !names.has(id) || p.def.side === 'L') continue;
      if (!seen.has(id)) seen.set(id, []);
      seen.get(id)!.push(p.object);
    }
    return [...seen.entries()].map(([id, objects]) => ({ id, objects }));
  }, [model, names]);

  const els = useRef(new Map<string, { label: HTMLDivElement | null; line: HTMLDivElement | null; dot: HTMLDivElement | null }>());
  const box = useMemo(() => new Box3(), []);
  const v = useMemo(() => new Vector3(), []);
  const frameNo = useRef(0);

  useFrame(() => {
    if (++frameNo.current % 2) return;
    const s = useLab.getState();
    const items: Array<{ id: string; x: number; y: number; w: number; label: HTMLDivElement; line: HTMLDivElement; dot: HTMLDivElement }> = [];
    for (const { id, objects } of anchors) {
      const e = els.current.get(id);
      if (!e?.label || !e.line || !e.dot) continue;
      const focusOnly = s.ghostOthers && s.selectedComponentId !== null;
      const visible = !s.hidden[id] && ((s.showLabels && !focusOnly) || s.selectedComponentId === id);
      if (!visible) {
        e.label.style.display = e.line.style.display = e.dot.style.display = 'none';
        continue;
      }
      box.makeEmpty();
      for (const o of objects) if (o.visible) box.expandByObject(o);
      if (box.isEmpty()) continue;
      box.getCenter(v);
      v.project(camera);
      if (v.z > 1) {
        e.label.style.display = e.line.style.display = e.dot.style.display = 'none';
        continue;
      }
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      e.label.style.display = e.line.style.display = e.dot.style.display = '';
      items.push({ id, x, y, w: e.label.offsetWidth || 120, label: e.label, line: e.line, dot: e.dot });
    }
    // Greedy de-clutter: try above / below / left / right of the anchor, then stack upwards.
    items.sort((a, b) => (a.id === s.selectedComponentId ? -1 : b.id === s.selectedComponentId ? 1 : a.y - b.y));
    const placed: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
    const free = (x0: number, y0: number, w: number) =>
      x0 >= 2 && x0 + w <= size.width - 2 && y0 >= 2 && y0 + LABEL_H <= size.height - 2 &&
      !placed.some((p) => x0 < p.x1 + GAP && x0 + w > p.x0 - GAP && y0 < p.y1 + GAP && y0 + LABEL_H > p.y0 - GAP);
    const sel = s.selectedComponentId;
    for (const it of items) {
      const w = it.w;
      const cands: Array<[number, number]> = [
        [it.x - w / 2, it.y - 34 - LABEL_H / 2],
        [it.x - w / 2, it.y + 22],
        [it.x - w - 22, it.y - LABEL_H / 2],
        [it.x + 22, it.y - LABEL_H / 2],
        [it.x - w / 2, it.y - 64 - LABEL_H / 2],
        [it.x - w / 2, it.y + 52],
      ];
      let pos = cands.find(([x0, y0]) => free(x0, y0, w));
      if (!pos) {
        let [x0, y0] = cands[0]!;
        x0 = Math.max(4, Math.min(size.width - w - 4, x0));
        for (let guard = 0; guard < 40 && !free(x0, y0, w); guard++) y0 -= LABEL_H + GAP;
        pos = [x0, Math.max(4, y0)];
      }
      const [x0, y0] = pos;
      placed.push({ x0, x1: x0 + w, y0, y1: y0 + LABEL_H });
      it.label.style.transform = `translate(${x0}px, ${y0}px)`;
      it.label.dataset.active = String(sel === it.id);
      // Leader line from anchor to the nearest point on the label box.
      const tx = Math.max(x0, Math.min(x0 + w, it.x));
      const ty = Math.max(y0, Math.min(y0 + LABEL_H, it.y));
      const len = Math.hypot(tx - it.x, ty - it.y);
      const ang = Math.atan2(ty - it.y, tx - it.x);
      it.line.style.width = `${len}px`;
      it.line.style.transform = `translate(${it.x}px, ${it.y}px) rotate(${ang}rad)`;
      it.dot.style.transform = `translate(${it.x - 3}px, ${it.y - 3}px)`;
    }
  });

  return (
    <Html fullscreen zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className="labels-layer" aria-hidden="true" data-testid="labels-layer">
        {anchors.map(({ id }) => {
          const visible = !hidden[id] && (show || selected === id);
          return (
            <div key={id} style={{ display: visible ? undefined : 'none' }}>
              <div className="label-line" ref={(el) => { els.current.set(id, { ...(els.current.get(id) ?? { label: null, dot: null }), line: el }); }} />
              <div className="label-dot" ref={(el) => { els.current.set(id, { ...(els.current.get(id) ?? { label: null, line: null }), dot: el }); }} />
              <div className="label-3d" data-component={id} ref={(el) => { els.current.set(id, { ...(els.current.get(id) ?? { line: null, dot: null }), label: el }); }}>
                {names.get(id)}
              </div>
            </div>
          );
        })}
      </div>
    </Html>
  );
}
