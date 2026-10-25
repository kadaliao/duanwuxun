// 网格 A*（八向，禁止切角），支持动态可走性回调。
export function findPath(world, sx, sz, tx, tz, maxIter = 20000) {
  const W = world.W, D = world.D;
  sx |= 0; sz |= 0; tx |= 0; tz |= 0;
  if (!world.walkable(tx + 0.5, tz + 0.5)) { const n = nearestWalkable(world, tx, tz); if (!n) return null; tx = n[0]; tz = n[1]; }
  const key = (x, z) => z * W + x;
  const open = new MinHeap(); const came = new Map(); const gScore = new Map();
  const h = (x, z) => { const dx = Math.abs(x - tx), dz = Math.abs(z - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const sk = key(sx, sz); gScore.set(sk, 0); open.push([h(sx, sz), sx, sz]);
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let iter = 0;
  while (open.size && iter++ < maxIter) {
    const [, x, z] = open.pop();
    if (x === tx && z === tz) {
      const path = []; let k = key(x, z);
      while (came.has(k)) { path.push([k % W + 0.5, Math.floor(k / W) + 0.5]); k = came.get(k); }
      path.reverse(); return path;
    }
    const g = gScore.get(key(x, z));
    for (const [dx, dz, cost] of dirs) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
      if (!world.walkable(nx + 0.5, nz + 0.5)) continue;
      if (dx && dz && (!world.walkable(x + dx + 0.5, z + 0.5) || !world.walkable(x + 0.5, z + dz + 0.5))) continue;
      // 坡度惩罚 + 水深惩罚
      const dh = Math.abs(world.map.h[key(nx, nz)] - world.map.h[key(x, z)]); if (dh > 1.3) continue;
      const depth = world.depthAt(nx + 0.5, nz + 0.5);
      const ng = g + cost + dh * 0.8 + depth * 3;
      const nk = key(nx, nz);
      if (!gScore.has(nk) || ng < gScore.get(nk)) { gScore.set(nk, ng); came.set(nk, key(x, z)); open.push([ng + h(nx, nz), nx, nz]); }
    }
  }
  return null;
}
export function nearestWalkable(world, x, z, r = 6) {
  for (let d = 1; d <= r; d++) for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== d) continue; if (world.walkable(x + dx + 0.5, z + dz + 0.5)) return [x + dx, z + dz]; }
  return null;
}
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v) { const a = this.a; a.push(v); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
}
