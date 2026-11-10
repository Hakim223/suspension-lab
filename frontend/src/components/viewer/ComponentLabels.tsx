import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Box3, Vector3, type Object3D } from 'three';
import { useLab } from '../../state/labStore';
import type { SuspensionModel } from '../../three/rig/types';

const LABEL_H = 24;
const GAP = 4;

export interface LabelEls {
  label: HTMLDivElement | null;
  line: HTMLDivElement | null;
  dot: HTMLDivElement | null;
}
export type LabelRegistry = MutableRefObject<Map<string, LabelEls>>;

/** One anchor per component: its right-side / centre parts (left side is the mirror image). */
export function labelAnchors(model: SuspensionModel, names: Map<string, string>) {
  const seen = new Map<string, Object3D[]>();
  for (const p of model.parts) {
    const id = p.def.componentId;
    if (!id || !names.has(id) || p.def.side === 'L') continue;
    if (!seen.has(id)) seen.set(id, []);
    seen.get(id)!.push(p.object);
  }
  return [...seen.entries()].map(([id, objects]) => ({ id, objects }));
}

/**
 * DOM overlay (rendered OUTSIDE the <Canvas>, covering it exactly). Elements are positioned
 * imperatively by <LabelLayout/> each frame — no React re-render at frame rate.
 */
export function LabelsOverlay({ model, names, registry }: { model: SuspensionModel | null; names: Map<string, string>; registry: LabelRegistry }) {
  const anchors = useMemo(() => (model ? labelAnchors(model, names) : []), [model, names]);
  const reg = (id: string, key: keyof LabelEls) => (el: HTMLDivElement | null) => {
    const cur = registry.current.get(id) ?? { label: null, line: null, dot: null };
    cur[key] = el;
    registry.current.set(id, cur);
  };
  return (
    <div className="labels-layer" aria-hidden="true" data-testid="labels-layer">
      {anchors.map(({ id }) => (
        <div key={id}>
          <div className="label-line" style={{ display: 'none' }} ref={reg(id, 'line')} />
          <div className="label-dot" style={{ display: 'none' }} data-dot={id} ref={reg(id, 'dot')} />
          <div className="label-3d" style={{ display: 'none' }} data-component={id} ref={reg(id, 'label')}>
            {names.get(id)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** In-canvas updater: projects anchors and de-clutters the labels with a greedy layout. */
export function LabelLayout({ model, names, registry }: { model: SuspensionModel; names: Map<string, string>; registry: LabelRegistry }) {
  const { camera, size } = useThree();
  const anchors = useMemo(() => labelAnchors(model, names), [model, names]);
  const box = useMemo(() => new Box3(), []);
  const v = useMemo(() => new Vector3(), []);
  const frameNo = useRef(0);

  useFrame(() => {
    if (++frameNo.current % 2) return;
    const s = useLab.getState();
    const hideAll = (e: LabelEls) => {
      if (e.label) e.label.style.display = 'none';
      if (e.line) e.line.style.display = 'none';
      if (e.dot) e.dot.style.display = 'none';
    };
    const items: Array<{ id: string; x: number; y: number; w: number; e: Required<{ [K in keyof LabelEls]: HTMLDivElement }> }> = [];
    for (const { id, objects } of anchors) {
      const e = registry.current.get(id);
      if (!e?.label || !e.line || !e.dot) continue;
      const focusOnly = s.ghostOthers && s.selectedComponentId !== null;
      const visible = !s.hidden[id] && ((s.showLabels && !focusOnly) || s.selectedComponentId === id);
      if (!visible) {
        hideAll(e);
        continue;
      }
      box.makeEmpty();
      for (const o of objects) if (o.visible) box.expandByObject(o);
      if (box.isEmpty()) continue;
      box.getCenter(v).project(camera);
      if (v.z > 1) {
        hideAll(e);
        continue;
      }
      e.label.style.display = e.line.style.display = e.dot.style.display = '';
      items.push({
        id,
        x: ((v.x + 1) / 2) * size.width,
        y: ((1 - v.y) / 2) * size.height,
        w: e.label.offsetWidth || 120,
        e: e as Required<{ [K in keyof LabelEls]: HTMLDivElement }>,
      });
    }
    // Try above / below / left / right of the anchor, then stack upwards. Selected label first.
    items.sort((a, b) => (a.id === s.selectedComponentId ? -1 : b.id === s.selectedComponentId ? 1 : a.y - b.y));
    const placed: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
    const free = (x0: number, y0: number, w: number) =>
      x0 >= 2 && x0 + w <= size.width - 2 && y0 >= 2 && y0 + LABEL_H <= size.height - 2 &&
      !placed.some((p) => x0 < p.x1 + GAP && x0 + w > p.x0 - GAP && y0 < p.y1 + GAP && y0 + LABEL_H > p.y0 - GAP);
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
      it.e.label.style.transform = `translate(${x0}px, ${y0}px)`;
      it.e.label.dataset.active = String(s.selectedComponentId === it.id);
      const tx = Math.max(x0, Math.min(x0 + w, it.x));
      const ty = Math.max(y0, Math.min(y0 + LABEL_H, it.y));
      it.e.line.style.width = `${Math.hypot(tx - it.x, ty - it.y)}px`;
      it.e.line.style.transform = `translate(${it.x}px, ${it.y}px) rotate(${Math.atan2(ty - it.y, tx - it.x)}rad)`;
      it.e.dot.style.transform = `translate(${it.x - 3}px, ${it.y - 3}px)`;
    }
  });
  return null;
}
