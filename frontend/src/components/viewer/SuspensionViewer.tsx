import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Box3, PMREMGenerator, Vector3 } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import type { DamageScenario } from '@suspension-lab/shared';
import { useLab } from '../../state/labStore';
import { getModelEntry } from '../../three/models/registry';
import { useSuspensionModel } from '../../hooks/useSuspensionModel';
import { useTimeline } from '../../hooks/useTimeline';
import { SuspensionRig } from './SuspensionRig';
import { RoadSurface } from './RoadSurface';
import { ComponentLabels } from './ComponentLabels';
import type { RigFrame, SuspensionModel } from '../../three/rig/types';

export interface ViewerProps {
  modelKey: string;
  steerable: boolean;
  names: Map<string, string>;
  includes: Map<string, string[] | undefined>;
  damageScenario: DamageScenario | null;
  onModel?: (m: SuspensionModel | null) => void;
  onFrame?: (f: RigFrame) => void;
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return null;
}

function CameraRig({ modelKey, model, includes }: { modelKey: string; model: SuspensionModel | null; includes: Map<string, string[] | undefined> }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const token = useLab((s) => s.cameraResetToken);
  const entry = getModelEntry(modelKey);

  const framing = useMemo(() => {
    const c = entry?.camera ?? { position: [1.6, 1.1, 2] as [number, number, number], target: [0, 0.4, 0] as [number, number, number] };
    const aspect = size.width / Math.max(1, size.height);
    // Portrait screens need the camera further back to fit the full axle width.
    const k = aspect < 0.8 ? 1.75 : aspect < 1.2 ? 1.3 : 1;
    const target = new Vector3(...c.target);
    const pos = new Vector3(...c.position).sub(target).multiplyScalar(k).add(target);
    return { pos, target };
  }, [entry, size.width, size.height]);

  const first = useRef(true);
  useEffect(() => {
    const ctl = controls.current;
    if (!ctl) return;
    if (first.current) {
      camera.position.copy(framing.pos);
      ctl.target.copy(framing.target);
      ctl.update();
      first.current = false;
      return;
    }
    const tl = gsap.timeline();
    tl.to(camera.position, { x: framing.pos.x, y: framing.pos.y, z: framing.pos.z, duration: 0.8, ease: 'power2.inOut' }, 0);
    tl.to(ctl.target, { x: framing.target.x, y: framing.target.y, z: framing.target.z, duration: 0.8, ease: 'power2.inOut', onUpdate: () => ctl.update() }, 0);
    return () => {
      tl.kill();
    };
  }, [token, framing, camera]);

  // Focus on the selected component (right/centre instance), keeping the current viewing direction.
  const focusToken = useLab((s) => s.focusToken);
  useEffect(() => {
    const ctl = controls.current;
    const id = useLab.getState().selectedComponentId;
    if (!ctl || !model || !id || focusToken === 0) return;
    const ids = new Set([id, ...(includes.get(id) ?? [])]);
    const box = new Box3();
    for (const p of model.parts) if (p.def.side !== 'L' && p.def.componentId && ids.has(p.def.componentId) && p.object.visible) box.expandByObject(p.object);
    if (box.isEmpty()) return;
    const center = box.getCenter(new Vector3());
    const radius = box.getSize(new Vector3()).length() / 2;
    const dir = camera.position.clone().sub(ctl.target).normalize();
    const dist = Math.max(1.0, radius * 4.2) * (size.width / Math.max(1, size.height) < 1 ? 1.5 : 1);
    const pos = center.clone().addScaledVector(dir, dist);
    const tl = gsap.timeline();
    tl.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: 0.9, ease: 'power2.inOut' }, 0);
    tl.to(ctl.target, { x: center.x, y: center.y, z: center.z, duration: 0.9, ease: 'power2.inOut', onUpdate: () => ctl.update() }, 0);
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      minDistance={0.5}
      maxDistance={6}
      maxPolarAngle={Math.PI * 0.6}
      rotateSpeed={0.8}
      panSpeed={0.8}
    />
  );
}

function Scene({ modelKey, steerable, names, includes, damageScenario, onModel, onFrame }: ViewerProps) {
  const { model } = useSuspensionModel(modelKey);
  const timeline = useTimeline(damageScenario);
  useEffect(() => {
    onModel?.(model);
  }, [model, onModel]);
  return (
    <>
      <color attach="background" args={['#0a0f1a']} />
      <fog attach="fog" args={['#0a0f1a', 4, 9]} />
      <Environment />
      <hemisphereLight args={['#cfe8ff', '#0b1220', 0.55]} />
      <directionalLight
        position={[2.5, 4, 3]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#7dd3fc" />
      {model && (
        <SuspensionRig
          model={model}
          includes={includes}
          damageScenario={damageScenario}
          steerable={steerable}
          timeline={timeline}
          onFrame={onFrame}
        />
      )}
      {model && <ComponentLabels model={model} names={names} />}
      <RoadSurface timeline={timeline} trackHalf={0.76} />
      <ContactShadows position={[0, -0.002, 0]} scale={4} opacity={0.45} blur={2.4} far={1.2} resolution={512} />
      <gridHelper args={[8, 32, '#1f2d45', '#131c2c']} position={[0, -0.006, 0]} />
      <CameraRig modelKey={modelKey} model={model} includes={includes} />
    </>
  );
}

export default function SuspensionViewer(props: ViewerProps) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 38, near: 0.05, far: 30, position: [1.6, 1.1, 2] }}
      onPointerMissed={(e) => {
        if (e.type === 'click') useLab.getState().select(null);
      }}
      data-testid="viewer-canvas"
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
