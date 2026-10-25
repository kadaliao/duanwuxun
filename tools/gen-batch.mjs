// 按 art/manifest.json 批量生图（并发 4，失败重试 2 次），已存在的跳过。
// 用法: node tools/gen-batch.mjs [过滤关键词]
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(readFileSync(resolve(root, 'art/manifest.json'), 'utf8'));
const style = readFileSync(resolve(root, 'art/style.txt'), 'utf8').trim();
const filter = process.argv[2] || '';
const todo = man.items.filter(it => !existsSync(resolve(root, it.out)) && it.out.includes(filter));
console.log(`待生成 ${todo.length} 张`);
mkdirSync(resolve(root, 'art/prompts'), { recursive: true });
const run = it => new Promise(res => {
  const isPortrait = it.out.includes('/portraits/');
  const prompt = ['SUBJECT: ' + it.subject, isPortrait ? man.portrait_comp : '', it.accent || '', style].filter(Boolean).join('\n');
  const pf = resolve(root, 'art/prompts', basename(it.out, '.png') + '.txt');
  writeFileSync(pf, prompt);
  execFile(resolve(root, 'tools/gen-image.sh'), [it.out, it.shape, pf], { cwd: root, timeout: 15 * 60 * 1000 }, (err, out) => res(!err && existsSync(resolve(root, it.out))));
});
let i = 0, ok = 0, fail = [];
async function worker() {
  while (i < todo.length) {
    const it = todo[i++];
    let good = false;
    for (let t = 0; t < 4 && !good; t++) { good = await run(it); if (!good) { console.log('重试', it.out); await new Promise(r => setTimeout(r, 45000 * (t + 1))); } }
    if (good) { ok++; console.log('OK', it.out); } else { fail.push(it.out); console.log('FAIL', it.out); }
  }
}
const CONC = parseInt(process.env.CONC || '2', 10);
await Promise.all(Array.from({ length: CONC }, worker));
console.log(`完成 ${ok}，失败 ${fail.length}`, fail);
