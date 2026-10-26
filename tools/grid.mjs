// 给原图叠 100px 网格与坐标，便于手写可走区域：node tools/grid.mjs art/raw/v2/scene_fields.png out.png
import { execFileSync } from 'node:child_process';
const [,, inp, out] = process.argv;
const [W, H] = execFileSync('magick', ['identify', '-format', '%w %h', inp]).toString().trim().split(' ').map(Number);
const draw = [];
for (let x = 0; x < W; x += 100) draw.push(`line ${x},0 ${x},${H}`);
for (let y = 0; y < H; y += 100) draw.push(`line 0,${y} ${W},${y}`);
const args = [inp, '-stroke', 'rgba(255,255,0,0.6)', '-strokewidth', '1'];
for (const d of draw) args.push('-draw', d);
args.push('-stroke', 'none', '-fill', 'yellow', '-font', '/System/Library/Fonts/Supplemental/Arial.ttf', '-pointsize', '20', '-undercolor', 'rgba(0,0,0,0.5)');
for (let x = 0; x < W; x += 200) for (let y = 0; y < H; y += 200) args.push('-draw', `text ${x + 3},${y + 20} '${x},${y}'`);
args.push(out);
execFileSync('magick', args);
console.log('OK', out);
