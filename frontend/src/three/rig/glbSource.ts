import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { PartSource } from './builder';

const BASE = ((import.meta.env.VITE_MODEL_BASE_URL as string | undefined) || '/models').replace(/\/+$/, '');

export function modelUrl(file: string) {
  return /^https?:\/\//.test(file) ? file : `${BASE}/${file}`;
}

/**
 * Loads a GLB (optionally meshopt-compressed via gltfpack) and exposes its named nodes as a PartSource.
 * Nodes are matched by exact name (e.g. "R_Lower_Arm", "C_Stabilizer_Bar"). Each lookup returns a clone,
 * so the mirrored left corner can reuse right-side nodes.
 */
export async function loadGlbSource(file: string): Promise<PartSource & { nodeNames: string[] }> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(modelUrl(file));
  const nodes = new Map<string, Object3D>();
  gltf.scene.traverse((o) => {
    if (o.name && !nodes.has(o.name)) nodes.set(o.name, o);
  });
  return {
    kind: 'glb',
    nodeNames: [...nodes.keys()],
    lookup(name) {
      const n = nodes.get(name);
      if (!n) return null;
      const c = n.clone(true);
      // Detach from the GLB hierarchy: the rig positions parts in corner-local space.
      c.position.copy(n.position);
      c.quaternion.copy(n.quaternion);
      c.scale.copy(n.scale);
      c.traverse((o) => {
        const m = o as unknown as { isMesh?: boolean; material?: { clone(): unknown } };
        if (m.isMesh && m.material) (o as unknown as { material: unknown }).material = m.material.clone();
      });
      return c;
    },
  };
}
