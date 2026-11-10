/**
 * GLB asset tools.
 *   npx tsx scripts/glb-tools.ts export-reference [outDir]
 *       Exports every procedural model as a reference GLB template (naming, pivots, scale).
 *   npx tsx scripts/glb-tools.ts expected <modelKey>
 *       Lists the node names (R_/C_) a GLB must provide, with their component ids.
 *   npx tsx scripts/glb-tools.ts validate <file.glb> <modelKey>
 *       Checks a Blender-exported GLB against the naming convention expected by the rig.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal browser shims for three's GLTFExporter in Node.
class FileReaderShim {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); });
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader ??= FileReaderShim;

const { MODEL_REGISTRY } = await import('../src/three/models/registry');
const { exportModelToGlb } = await import('../src/three/rig/glbExport');

function glbNodeNames(buf: Buffer): string[] {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB file (bad magic)');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as { nodes?: Array<{ name?: string }> };
  return (json.nodes ?? []).map((n) => n.name ?? '').filter(Boolean);
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'export-reference') {
  const out = resolve(a ?? 'public/models/reference');
  mkdirSync(out, { recursive: true });
  for (const [key, entry] of Object.entries(MODEL_REGISTRY)) {
    const buf = await exportModelToGlb(entry.build());
    writeFileSync(resolve(out, `${key}.glb`), Buffer.from(buf));
    console.log(`${key}.glb  ${(buf.byteLength / 1024).toFixed(0)} KB`);
  }
} else if (cmd === 'validate' && a && b) {
  const entry = MODEL_REGISTRY[b];
  if (!entry) throw new Error(`Unknown model key '${b}'. Known: ${Object.keys(MODEL_REGISTRY).join(', ')}`);
  const names = new Set(glbNodeNames(readFileSync(a)));
  const expected = entry.build().parts.map((p) => p.def.name).filter((n) => !n.startsWith('L_'));
  const missing = expected.filter((n) => !names.has(n));
  const selectable = entry.build().parts.filter((p) => p.def.componentId && !p.def.name.startsWith('L_')).map((p) => p.def.name);
  console.log(`GLB nodes: ${names.size}. Expected R_/C_ parts: ${expected.length}.`);
  if (missing.length) {
    console.log(`Missing (procedural fallback will be used):\n  ${missing.join('\n  ')}`);
    const missingSelectable = missing.filter((m) => selectable.includes(m));
    if (missingSelectable.length) process.exitCode = 1;
  } else console.log('All expected nodes present ✔');
} else if (cmd === 'expected' && a) {
  const entry = MODEL_REGISTRY[a];
  if (!entry) throw new Error(`Unknown model key '${a}'`);
  for (const p of entry.build().parts) {
    if (p.def.name.startsWith('L_')) continue;
    console.log(`${p.def.name.padEnd(30)} ${p.def.componentId ?? '(context, optional)'}`);
  }
} else {
  console.log('Usage: glb-tools.ts export-reference [outDir] | expected <modelKey> | validate <file.glb> <modelKey>');
  process.exitCode = 2;
}
