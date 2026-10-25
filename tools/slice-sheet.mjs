// 把 3x6 的角色图集（透明底）切成规整帧：node tools/slice-sheet.mjs art/raw/v2/sheet_player.png assets/img/sprites/player
// 连通域 → 按行聚类 → 每行按 x 排序 → 脚底对齐、居中，输出 webp + json。
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
const [,, src, outBase] = process.argv;
const ROWS = parseInt(process.env.ROWS || '3', 10), COLS = parseInt(process.env.COLS || '6', 10);
const png = PNG.sync.read(readFileSync(src)); const { width: W, height: H, data } = png;
const A = (x, y) => data[(y * W + x) * 4 + 3];
const seen = new Uint8Array(W * H); const comps = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (seen[y * W + x] || A(x, y) < 40) continue;
  const st = [[x, y]]; seen[y * W + x] = 1; let x0 = x, x1 = x, y0 = y, y1 = y, n = 0;
  while (st.length) { const [cx, cy] = st.pop(); n++; if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const i = ny * W + nx; if (seen[i] || A(nx, ny) < 40) continue; seen[i] = 1; st.push([nx, ny]); } }
  if (n > 30) comps.push({ x0, x1, y0, y1, n });
}
// 行聚类：按 y 中心
const rowH = H / ROWS; const rows = Array.from({ length: ROWS }, () => []);
for (const c of comps) { const cy = (c.y0 + c.y1) / 2; let r = Math.min(ROWS - 1, Math.floor(cy / rowH)); rows[r].push(c); }
// 行内合并 x 重叠/相邻的域
const frames = rows.map(list => {
  list.sort((a, b) => a.x0 - b.x0); const merged = [];
  for (const c of list) { const m = merged[merged.length - 1]; if (m && c.x0 <= m.x1 + 12) { m.x0 = Math.min(m.x0, c.x0); m.x1 = Math.max(m.x1, c.x1); m.y0 = Math.min(m.y0, c.y0); m.y1 = Math.max(m.y1, c.y1); m.n += c.n; } else merged.push({ ...c }); }
  // 丢掉太小的碎片（比最大者小太多）
  const big = Math.max(...merged.map(m => m.n)); return merged.filter(m => m.n > big * 0.15);
});
frames.forEach((f, r) => console.log('row', r, f.length, 'frames', f.map(m => `${m.x1 - m.x0}x${m.y1 - m.y0}`).join(' ')));
// GRID=1：按固定网格切（船这类相邻会粘连的图）
if (process.env.GRID) {
  const cellW = W / COLS, cellH = H / ROWS;
  for (let r = 0; r < ROWS; r++) { frames[r] = []; for (let c = 0; c < COLS; c++) { let x0 = W, x1 = -1, y0 = H, y1 = -1, n = 0; for (let y = Math.floor(r * cellH); y < Math.floor((r + 1) * cellH); y++) for (let x = Math.floor(c * cellW); x < Math.floor((c + 1) * cellW); x++) { if (A(x, y) < 40) continue; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (n > 30) frames[r].push({ x0, x1, y0, y1, n }); } }
  frames.forEach((f, r) => console.log('grid row', r, f.length, 'frames'));
}
const cols = Math.max(...frames.map(f => f.length));
const cw = Math.max(...frames.flat().map(m => m.x1 - m.x0 + 1)) + 8, ch = Math.max(...frames.flat().map(m => m.y1 - m.y0 + 1)) + 6;
const out = new PNG({ width: cw * cols, height: ch * ROWS });
frames.forEach((list, r) => {
  // 每行脚底：取该行各帧底边的中位数，避免某帧抬脚导致跳动
  list.forEach((m, c) => {
    const fw = m.x1 - m.x0 + 1, fh = m.y1 - m.y0 + 1; const ox = c * cw + ((cw - fw) / 2 | 0), oy = r * ch + (ch - 3 - fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const si = ((m.y0 + y) * W + m.x0 + x) * 4, di = ((oy + y) * out.width + ox + x) * 4; out.data[di] = data[si]; out.data[di + 1] = data[si + 1]; out.data[di + 2] = data[si + 2]; out.data[di + 3] = data[si + 3]; }
  });
});
mkdirSync(dirname(outBase), { recursive: true });
const tmp = outBase + '.tmp.png'; writeFileSync(tmp, PNG.sync.write(out));
execFileSync('magick', [tmp, '-quality', '92', '-define', 'webp:alpha-quality=95', outBase + '.webp']);
execFileSync('rm', [tmp]);
writeFileSync(outBase + '.json', JSON.stringify({ cw, ch, cols, rows: ROWS, frames: Math.min(...frames.map(f => f.length)), feet: 3 }));
console.log('OK', outBase + '.webp', `${cw}x${ch} x ${cols}x${ROWS}`);
