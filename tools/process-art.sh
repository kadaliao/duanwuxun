#!/usr/bin/env bash
# 把 art/raw 下的原图转成游戏用的 webp。
# 场景/CG：最长边 1600，webp q82
# 人物：webp 原尺寸 + 去底版本（-cut.webp，从四角泛洪填充去掉纸色背景）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mk() { mkdir -p "$(dirname "$1")"; }
for f in art/raw/scenes/*.png art/raw/cg/*.png art/raw/ui/*.png; do
  [ -e "$f" ] || continue
  rel="${f#art/raw/}"; out="assets/img/${rel%.png}.webp"
  if [ ! -e "$out" ] || [ "$f" -nt "$out" ]; then
    mk "$out"; magick "$f" -resize '1600x1600>' -quality 82 "$out"; echo "scene $out"
  fi
done
for f in art/raw/portraits/*.png; do
  [ -e "$f" ] || continue
  name="$(basename "${f%.png}")"; out="assets/img/portraits/$name.webp"; cut="assets/img/portraits/$name-cut.webp"
  if [ ! -e "$cut" ] || [ "$f" -nt "$cut" ]; then
    mk "$out"
    magick "$f" -resize '900x1350>' -quality 84 "$out"
    "$ROOT/tools/cutout.sh" "$f" "$cut"
    echo "portrait $out (+cut)"
  fi
done
