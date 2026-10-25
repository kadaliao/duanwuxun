#!/usr/bin/env bash
# 人物去底：墨线加粗封口 → 从四角泛洪找背景 → 轮廓收回 → 羽化 → 作为透明通道
# 用法: tools/cutout.sh in.png out.webp
set -euo pipefail
IN="$1"; OUT="$2"; R=${CUT_R:-9}
TMP=$(mktemp -d)
magick "$IN" -resize '900x1350>' "$TMP/base.png"
magick "$TMP/base.png" -colorspace Gray -threshold 50% \
  -morphology Erode Disk:$R \
  -bordercolor white -border 12 -fill red -draw "color 0,0 floodfill" -shave 12x12 \
  -alpha off -fill white +opaque red -fill black -opaque red \
  -morphology Erode Disk:$((R-2)) -blur 0x1.6 "$TMP/mask.png"
magick "$TMP/base.png" "$TMP/mask.png" -alpha off -compose CopyOpacity -composite -quality 86 "$OUT"
rm -rf "$TMP"
