import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, Euler, Group, Mesh, MeshStandardMaterial, PMREMGenerator, Plane, Quaternion, Vector3, type Object3D } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { AnatomyModel, FailureVisual } from './models';
import type { AnatomyView } from '../state/mechanicStore';

interface Props {
  model: AnatomyModel;
  view: AnatomyView;
  failure: FailureVisual | null;
  selectedPart: string | null;
  playing: boolean;
  onPick: (partId: string | null) => void;
}

const CUT_PLANE = new Plane(new Vector3(0, 0, -1), 0); // removes the half facing the camera (z > 0)
const FAIL = new Color('#f87171');
const SEL = new Color('#f5a524');
const BLACK = new Color(0);

interface Built {
  root: Group;
  parts: Map<string, { obj: Object3D; base: { p: Vector3; q: Quaternion; s: Vector3 }; explode: Vector3; cut: boolean; mats: MeshStandardMaterial[] }>;
}

function build(model: AnatomyModel): Built {
  const root = new Group();
  const parts: Built['parts'] = new Map();
  for (const def of model.parts) {
    const obj = def.build();
    obj.userData.partId = def.id;
    const mats: MeshStandardMaterial[] = [];
    obj.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.material = (m.material as MeshStandardMaterial).clone();
        const mt = m.material as MeshStandardMaterial;
        mt.userData.base = { color: mt.color.clone(), opacity: mt.opacity };
        mats.push(mt);
      }
    });
    root.add(obj);
    parts.set(def.id, { obj, base: { p: obj.position.clone(), q: obj.quaternion.clone(), s: obj.scale.clone() }, explode: new Vector3(...def.explode), cut: !!def.cut, mats });
  }
  return { root, parts };
}

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.localClippingEnabled = true;
    const pm = new PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => { scene.environment = null; env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

function Scene({ model, view, failure, selectedPart, playing, onPick }: Props) {
  const built = useMemo(() => build(model), [model]);
  const t = useRef(0);
  const explode = useRef(0);
  useEffect(() => () => {
    built.root.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) { m.geometry.dispose(); (m.material as MeshStandardMaterial).dispose(); }
    });
  }, [built]);

  // Cutaway: clip the parts flagged `cut`.
  useEffect(() => {
    for (const p of built.parts.values()) for (const m of p.mats) {
      m.clippingPlanes = view === 'cutaway' && p.cut ? [CUT_PLANE] : [];
      m.needsUpdate = true;
    }
  }, [built, view]);

  // All visual rules of the active failure (primary + secondary), flattened.
  const rules = useMemo(() => (failure ? [failure, ...(failure.also ?? [])] : []), [failure]);

  // Colour state (selection / failure tint) — reapplied when inputs change.
  useEffect(() => {
    for (const [id, p] of built.parts) {
      const hit = rules.filter((r) => r.parts.includes(id));
      const failed = hit.length > 0;
      const tint = hit.find((r) => r.tint)?.tint;
      for (const m of p.mats) {
        const base = m.userData.base as { color: Color; opacity: number };
        m.color.copy(base.color);
        if (tint) m.color.set(tint);
        m.emissive.copy(failed && tint ? FAIL : id === selectedPart ? SEL : BLACK);
        m.emissiveIntensity = failed && tint ? 0.25 : id === selectedPart ? 0.35 : 0;
      }
      p.obj.visible = !hit.some((r) => r.hide);
    }
  }, [built, rules, selectedPart]);

  const tmpQ = useMemo(() => new Quaternion(), []);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const target = view === 'exploded' ? 1 : 0;
    explode.current += (target - explode.current) * Math.min(1, d * 5);
    if (playing) t.current += d;
    const ms = failure?.motionScale ?? 1;
    const phase = Math.sin(t.current * 2.2);
    for (const [id, p] of built.parts) {
      p.obj.position.copy(p.base.p).addScaledVector(p.explode, explode.current);
      p.obj.quaternion.copy(p.base.q);
      p.obj.scale.copy(p.base.s);
      const frozen = rules.some((r) => r.freeze && r.parts.includes(id));
      const moving = model.moving.includes(id) && !frozen;
      if (moving) {
        switch (model.motion) {
          case 'stroke':
            p.obj.position.y += phase * 0.09 * ms;
            break;
          case 'articulate':
            p.obj.quaternion.multiply(tmpQ.setFromEuler(new Euler(0, t.current * 0.8, phase * 0.32 * ms)));
            break;
          case 'rotate':
            p.obj.quaternion.multiply(tmpQ.setFromEuler(model.id === 'wheel-bearing' ? new Euler(t.current * (id === 'balls' ? 0.9 : 1.8) * ms, 0, 0) : new Euler(0, phase * 0.6 * ms, 0)));
            break;
          case 'twist':
            // The arm swings about the bushing (bolt) axis = Y; rubber shown at half the angle.
            p.obj.quaternion.multiply(tmpQ.setFromEuler(new Euler(0, phase * 0.3 * ms * (id === 'rubber' ? 0.5 : 1), 0)));
            break;
          case 'steer': {
            const ang = phase * 2.4 * ms; // pinion angle (rad)
            if (id === 'pinion') p.obj.rotateY(ang);
            else p.obj.position.x += ang * 0.02; // rack travel = angle · pitch radius
            break;
          }
          case 'gear': {
            const a = t.current * 0.7 * ms;
            if (id === 'worm') p.obj.rotateX(a * 16); // ≈16:1 reduction
            else p.obj.rotateY(a);
            break;
          }
        }
      }
      for (const r of rules) {
        if (!r.parts.includes(id)) continue;
        if (r.offset) p.obj.position.add(new Vector3(...r.offset));
        if (r.move) p.obj.position.add(new Vector3(...r.move).multiplyScalar(Math.sign(phase) * Math.min(1, Math.abs(phase) * 3)));
        if (r.tilt) p.obj.quaternion.multiply(tmpQ.setFromEuler(new Euler(0, 0, r.tilt)));
        if (r.rotate) p.obj.quaternion.multiply(tmpQ.setFromEuler(new Euler(...r.rotate)));
        if (r.scale) p.obj.scale.multiply(new Vector3(...r.scale));
      }
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    let o: Object3D | null = e.object;
    while (o && o.userData.partId === undefined) o = o.parent;
    onPick(o ? (o.userData.partId as string) : null);
  };

  return <primitive object={built.root} onClick={pick} />;
}

export default function AnatomyViewer(props: Props) {
  const { model } = props;
  return (
    <Canvas
      camera={{ fov: 35, near: 0.01, far: 20, position: model.camera }}
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      onPointerMissed={(e) => e.type === 'click' && props.onPick(null)}
    >
      <color attach="background" args={['#0a0f1a']} />
      <Env />
      <hemisphereLight args={['#cfe8ff', '#0b1220', 0.6]} />
      <directionalLight position={[2, 3, 2]} intensity={1.4} />
      <directionalLight position={[-2, 1, -1]} intensity={0.5} color="#7dd3fc" />
      <Scene {...props} />
      <gridHelper args={[2, 40, '#1f2d45', '#131c2c']} position={[0, model.target[1] - 0.35, 0]} />
      <OrbitControls makeDefault target={model.target} enableDamping minDistance={0.15} maxDistance={3} />
    </Canvas>
  );
}
