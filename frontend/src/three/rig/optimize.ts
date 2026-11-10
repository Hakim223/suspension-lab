import { Group, Mesh, MeshStandardMaterial, type BufferGeometry, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function signature(m: MeshStandardMaterial) {
  return [m.color.getHexString(), m.metalness, m.roughness, m.opacity, m.transparent, m.side].join('|');
}

/**
 * Reduces draw calls: within a group, unnamed static Mesh children that share an identical
 * material appearance are merged into one mesh. Named children, nested Groups and anything with
 * userData are left alone (they are animated or addressed individually). Recurses into groups.
 */
export function mergeStaticMeshes(root: Object3D) {
  const visit = (g: Object3D) => {
    const buckets = new Map<string, Mesh[]>();
    for (const c of g.children) {
      const m = c as Mesh;
      if (m.isMesh && !m.name && Object.keys(m.userData).length === 0 && !Array.isArray(m.material) && m.geometry.index) {
        const key = signature(m.material as MeshStandardMaterial);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(m);
      }
    }
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const geos: BufferGeometry[] = list.map((m) => {
        m.updateMatrix();
        const geo = m.geometry.clone().applyMatrix4(m.matrix);
        for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
        return geo;
      });
      if (!geos.every((x) => x.attributes.uv)) continue;
      const merged = mergeGeometries(geos, false);
      geos.forEach((x) => x.dispose());
      if (!merged) continue;
      const out = new Mesh(merged, list[0]!.material);
      out.castShadow = list[0]!.castShadow;
      out.receiveShadow = list[0]!.receiveShadow;
      for (const m of list) {
        g.remove(m);
        m.geometry.dispose();
        if (m.material !== out.material) (m.material as MeshStandardMaterial).dispose();
      }
      g.add(out);
    }
    for (const c of g.children) if ((c as Group).isGroup || (c as Object3D).type === 'Object3D') visit(c);
  };
  visit(root);
}
