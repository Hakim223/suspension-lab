"""
Suspension Lab — Blender export helper (Blender 3.6 / 4.x).

Usage (Blender > Scripting tab, or command line):
  blender my_macpherson.blend --background --python tools/blender/export_suspension_glb.py -- \
      --out frontend/public/models/macpherson.glb --expected expected_macpherson.txt

`expected_macpherson.txt` is produced by:
  npm run glb:expected -w frontend -- macpherson > expected_macpherson.txt

What it does:
  1. Checks object names follow the convention  R_<Part_Name>  or  C_<Part_Name>.
  2. Warns about unapplied scale (rigid parts must have scale 1; stretch parts carry length in Y scale = 1 at rest).
  3. Reports expected nodes that are missing (the app falls back to procedural geometry for those).
  4. Exports GLB: +Y up, metres, selected hierarchy, modifiers applied, custom properties as extras.
See docs/asset-pipeline.md for pivot conventions per part type.
"""
import argparse
import re
import sys

import bpy

NAME_RE = re.compile(r"^(R|C)_[A-Z][A-Za-z0-9_]*$")


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    p.add_argument("--expected", help="file listing expected node names (first column)")
    return p.parse_args(argv)


def main():
    args = parse_args()
    objects = [o for o in bpy.context.scene.objects if o.parent is None or o.parent.name.endswith("_Assembly")]
    problems = 0
    for o in objects:
        if o.name.endswith("_Assembly"):
            continue
        if not NAME_RE.match(o.name):
            print(f"[naming] '{o.name}' does not match R_/C_ convention")
            problems += 1
        if o.type == "MESH" and any(abs(s - 1.0) > 1e-4 for s in o.scale):
            print(f"[scale] '{o.name}' has unapplied scale {tuple(round(s, 4) for s in o.scale)} — apply scale (Ctrl+A) unless it is a stretch part")
    if args.expected:
        with open(args.expected, encoding="utf-8") as fh:
            expected = [line.split()[0] for line in fh if line.strip()]
        present = {o.name for o in bpy.context.scene.objects}
        missing = [n for n in expected if n not in present]
        for n in missing:
            print(f"[missing] {n} (procedural fallback will be used)")
    bpy.ops.export_scene.gltf(
        filepath=args.out,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )
    print(f"Exported {args.out} ({problems} naming problem(s))")


if __name__ == "__main__":
    main()
