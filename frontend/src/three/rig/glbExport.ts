import { Mesh, type Object3D } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { SuspensionModel } from './types';
import type { SpringGeometry } from './parts';

const REST = {
  travel: { L: 0, R: 0 }, vel: { L: 0, R: 0 }, rack: 0, rackVel: 0, time: 0, wheelAngle: 0, explode: 0, damage: null,
};

/**
 * Exports a model (normally the procedural one) in its design pose as a binary GLB that follows the
 * asset conventions: named nodes, metres, Y-up, rigid parts in design pose, stretchable parts
 * (springs, rods, links) authored at UNIT length along +Y. Only R_* and C_* nodes are needed by the
 * loader; L_* nodes are exported too for preview convenience and are ignored on import.
 * Used to create reference templates for Blender artists and to test the GLB loading path.
 */
export async function exportModelToGlb(model: SuspensionModel): Promise<ArrayBuffer> {
  model.update(REST);
  const saved: Array<[Object3D, Record<string, unknown>]> = [];
  // Springs: normalise geometry to unit length; the node's Y scale carries the design length.
  for (const { object } of model.parts) {
    const spring = object.userData.spring as SpringGeometry | undefined;
    if (spring) {
      const len = spring.boundingBox ? spring.boundingBox.max.y - spring.boundingBox.min.y : 1;
      spring.setLength(1);
      object.scale.y = len;
    }
  }
  model.root.traverse((o) => {
    saved.push([o, o.userData]);
    o.userData = o.userData.componentId !== undefined ? { componentId: o.userData.componentId, partName: o.userData.partName } : {};
  });
  // Hidden or ghosted materials should export opaque.
  model.root.traverse((o) => {
    if ((o as Mesh).isMesh) o.visible = true;
  });
  try {
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(model.root, { binary: true, onlyVisible: false });
    return result as ArrayBuffer;
  } finally {
    for (const [o, ud] of saved) o.userData = ud;
    model.update(REST);
  }
}
