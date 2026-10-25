#!/usr/bin/env bash
# v2 资源处理：场景 2x 放大转 webp；角色图集切帧；CG 转 webp。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
mkdir -p assets/img/scenes assets/img/sprites assets/img/cg
for f in art/raw/v2/scene_*.png; do
  [ -e "$f" ] || continue; name="$(basename "${f%.png}")"; name="${name#scene_}"; out="assets/img/scenes/$name.webp"
  if [ ! -e "$out" ] || [ "$f" -nt "$out" ]; then magick "$f" -filter Lanczos -resize 200% -quality 86 "$out"; echo "scene $out"; fi
done
for f in art/raw/v2/sheet_*.png; do
  [ -e "$f" ] || continue; name="$(basename "${f%.png}")"; name="${name#sheet_}"; out="assets/img/sprites/$name.webp"
  if [ ! -e "$out" ] || [ "$f" -nt "$out" ]; then node tools/slice-sheet.mjs "$f" "assets/img/sprites/$name"; fi
done
for f in art/raw/v2/cg_*.png; do
  [ -e "$f" ] || continue; name="$(basename "${f%.png}")"; name="${name#cg_}"; out="assets/img/cg/$name.webp"
  if [ ! -e "$out" ] || [ "$f" -nt "$out" ]; then magick "$f" -quality 84 "$out"; echo "cg $out"; fi
done
