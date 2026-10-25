// v2 批量生图：node tools/gen-v2-batch.mjs <manifest.json> [filter]
// manifest: { items: [{ out, shape, prompt (file) , transparent? }] }
import { readFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(readFileSync(resolve(root, process.argv[2]), 'utf8'));
const filter = process.argv[3] || '';
const todo = man.items.filter(it => !existsSync(resolve(root, it.out)) && it.out.includes(filter));
console.log(`待生成 ${todo.length} 张`);
const run = it => new Promise(res => {
  const args = [it.out, it.shape || 'landscape', it.prompt]; if (it.transparent) args.push('transparent');
  execFile(resolve(root, 'tools/gen-v2.sh'), args, { cwd: root, timeout: 15 * 60 * 1000 }, (err) => res(!err && existsSync(resolve(root, it.out))));
});
let i = 0, ok = 0, fail = [];
async function worker() {
  while (i < todo.length) {
    const it = todo[i++]; let good = false;
    for (let t = 0; t < 3 && !good; t++) { good = await run(it); if (!good) { console.log('重试', it.out); await new Promise(r => setTimeout(r, 30000 * (t + 1))); } }
    if (good) { ok++; console.log('OK', it.out); } else { fail.push(it.out); console.log('FAIL', it.out); }
  }
}
await Promise.all(Array.from({ length: parseInt(process.env.CONC || '3', 10) }, worker));
console.log(`完成 ${ok}，失败 ${fail.length}`, fail);
