#!/usr/bin/env bash
# v2 生图：tools/gen-v2.sh <输出 png> <landscape|portrait|square> <提示词文件> [transparent]
set -euo pipefail
OUT="$1"; SHAPE="$2"; PROMPT_FILE="$3"; TRANS="${4:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
case "$SHAPE" in
  landscape) SIZE="1536x1024 (landscape)";;
  portrait)  SIZE="1024x1536 (portrait)";;
  square)    SIZE="1024x1024 (square)";;
  *) echo "bad shape"; exit 1;;
esac
PROMPT="$(cat "$PROMPT_FILE")"
EXTRA=""
[ "$TRANS" = "transparent" ] && EXTRA="IMPORTANT: call image_gen with its background option set to TRANSPARENT so the saved PNG has a real alpha channel (the subject on fully transparent pixels)."
mkdir -p "$(dirname "$ROOT/$OUT")" "$ROOT/art/logs"
LOG="$ROOT/art/logs/$(basename "$OUT" .png).log"
codex exec --skip-git-repo-check -s workspace-write -C "$ROOT" -o "$LOG.last" \
  "Use your built-in image_gen tool (the imagegen skill, default built-in mode, NOT the CLI fallback) to generate exactly ONE image. Image size: $SIZE. $EXTRA
Use the prompt below verbatim as the image prompt (do not rewrite or add to it):
<<<PROMPT
$PROMPT
PROMPT>>>
After generating, copy the generated PNG file from \$CODEX_HOME/generated_images/... to this exact path: $ROOT/$OUT
Do not generate any other images, do not edit any other files. When done, reply with only the saved path." < /dev/null > "$LOG" 2>&1
if [ -f "$ROOT/$OUT" ]; then echo "OK $OUT"; else echo "FAIL $OUT (see $LOG)"; exit 2; fi
