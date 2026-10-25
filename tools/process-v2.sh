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
  if [ ! -e "$out" ] || [ "$f" -nt "$out" ]; then if [ "$name" = boat ]; then GRID=1 node tools/slice-sheet.mjs "$f" "assets/img/sprites/$name"; else node tools/slice-sheet.mjs "$f" "assets/img/sprites/$name"; fi; fi
done
for f in art/raw/v2/cg_*.png; do
  [ -e "$f" ] || continue; name="$(basename "${f%.png}")"; name="${name#cg_}"; out="assets/img/cg/$name.webp"
  if [ ! -e "$out" ] || [ "$f" -nt "$out" ]; then magick "$f" -quality 84 "$out"; echo "cg $out"; fi
done
# 彩绘绣像（透明底）→ assets/img/portraits2/<id>.webp + index.json
mkdir -p assets/img/portraits2
for f in art/raw/v2/portrait_*.png; do
  [ -e "$f" ] || continue; name="$(basename "${f%.png}")"; name="${name#portrait_}"; out="assets/img/portraits2/$name.webp"
  if [ ! -e "$out" ] || [ "$f" -nt "$out" ]; then magick "$f" -trim +repage -resize '700x1000>' -quality 88 -define webp:alpha-quality=95 "$out"; echo "portrait $out"; fi
done
ls assets/img/portraits2/*.webp 2>/dev/null | sed 's|.*/||; s|\.webp||' | node -e "const l=require('fs').readFileSync(0,'utf8').trim().split('\n').filter(Boolean); require('fs').writeFileSync('assets/img/portraits2/index.json', JSON.stringify(l));"
# 舆图
[ -e art/raw/v2/map_county.png ] && { out=assets/img/ui/map.webp; if [ ! -e "$out" ] || [ art/raw/v2/map_county.png -nt "$out" ]; then magick art/raw/v2/map_county.png -quality 86 "$out"; echo "map $out"; fi; }
exit 0
