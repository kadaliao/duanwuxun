// 收集游戏里用到的全部汉字，把霞鹜文楷裁成子集（woff2）。
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const py = process.env.FONT_PY || '/private/tmp/claude-501/-Users-liaoxingyi-workspace-cc-playground-dmwc2-5d/51fa3c10-420e-43a5-8767-33825a2ab2d3/scratchpad/fontenv/bin/pyftsubset';
const files = [];
const walk = d => readdirSync(d).forEach(f => { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|html|css)$/.test(f)) files.push(p); });
walk(resolve(root, 'src')); files.push(resolve(root, 'index.html'));
let text = ''; files.forEach(f => { text += readFileSync(f, 'utf8'); });
const chars = new Set([...text].filter(c => c.charCodeAt(0) > 0x2000));
'，。、；：？！“”‘’（）《》〔〕【】—…·「」『』0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ●○◆▼✓×'.split('').forEach(c => chars.add(c));
const list = [...chars].join('');
const tf = resolve(root, 'art/fonts/_chars.txt'); writeFileSync(tf, list);
const src = resolve(root, '../dmwc/art/fonts/LXGWWenKai-Regular.ttf');
execFileSync(py, [src, `--text-file=${tf}`, '--flavor=woff2', `--output-file=${resolve(root, 'assets/fonts/wenkai.woff2')}`, '--layout-features=*', '--no-hinting'], { stdio: 'inherit' });
console.log('字数', chars.size, '→ assets/fonts/wenkai.woff2', statSync(resolve(root, 'assets/fonts/wenkai.woff2')).size, 'bytes');
