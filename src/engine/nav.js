// 可走区域：多边形（可走 - 阻挡）光栅化成格子；A* 寻路 + 拉直。
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export class Nav {
  constructor(W, H, walkPolys, blockPolys, cell = 10) {
    this.W = W; this.H = H; this.cell = cell; this.cw = Math.ceil(W / cell); this.ch = Math.ceil(H / cell);
    this.grid = new Uint8Array(this.cw * this.ch);
    this.blocks = blockPolys || [];
    for (let gy = 0; gy < this.ch; gy++) for (let gx = 0; gx < this.cw; gx++) {
      const x = (gx + 0.5) * cell, y = (gy + 0.5) * cell;
      let ok = walkPolys.some(p => pointInPoly(x, y, p));
      if (ok && this.blocks.some(p => pointInPoly(x, y, p))) ok = false;
      this.grid[gy * this.cw + gx] = ok ? 1 : 0;
    }
    this.dyn = []; // 动态阻挡 {x,y,r}
  }
  walkable(x, y) {
    const gx = (x / this.cell) | 0, gy = (y / this.cell) | 0;
    if (gx < 0 || gy < 0 || gx >= this.cw || gy >= this.ch) return false;
    if (!this.grid[gy * this.cw + gx]) return false;
    for (const d of this.dyn) if (Math.hypot(d.x - x, d.y - y) < d.r) return false;
    return true;
  }
  setBlocked(x, y, r, blocked) { this.dyn = this.dyn.filter(d => !(d.x === x && d.y === y)); if (blocked) this.dyn.push({ x, y, r }); }
  nearestWalkable(x, y, maxR = 300) {
    if (this.walkable(x, y)) return [x, y];
    for (let r = this.cell; r < maxR; r += this.cell) for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2; const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r; if (this.walkable(px, py)) return [px, py]; }
    return null;
  }
  los(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (this.cell * 0.5)) + 1;
    for (let i = 0; i <= n; i++) { const t = i / n; if (!this.walkable(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }
  findPath(x0, y0, x1, y1) {
    const c = this.cell, cw = this.cw, ch = this.ch;
    const s = this.nearestWalkable(x0, y0), e = this.nearestWalkable(x1, y1); if (!s || !e) return null;
    if (this.los(s[0], s[1], e[0], e[1])) return [[e[0], e[1]]];
    const sx = (s[0] / c) | 0, sy = (s[1] / c) | 0, ex = (e[0] / c) | 0, ey = (e[1] / c) | 0;
    const N = cw * ch; const g = new Float32Array(N).fill(Infinity); const f = new Float32Array(N).fill(Infinity); const from = new Int32Array(N).fill(-1); const closed = new Uint8Array(N);
    const open = []; const si = sy * cw + sx, ei = ey * cw + ex; g[si] = 0; f[si] = Math.hypot(ex - sx, ey - sy); open.push(si);
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414]];
    let iter = 0;
    while (open.length && iter++ < 60000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (cur === ei) break; closed[cur] = 1;
      const cx = cur % cw, cy = (cur / cw) | 0;
      for (const [dx, dy, cost] of dirs) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue; const ni = ny * cw + nx;
        if (!this.grid[ni] || closed[ni]) continue;
        if (dx && dy && (!this.grid[cy * cw + nx] || !this.grid[ny * cw + cx])) continue;
        const ng = g[cur] + cost; if (ng < g[ni]) { g[ni] = ng; f[ni] = ng + Math.hypot(ex - nx, ey - ny); from[ni] = cur; if (!open.includes(ni)) open.push(ni); }
      }
    }
    if (from[ei] < 0 && ei !== si) return null;
    const cells = []; let cur = ei; while (cur >= 0 && cur !== si) { cells.push(cur); cur = from[cur]; } cells.reverse();
    let pts = cells.map(i => [((i % cw) + 0.5) * c, (((i / cw) | 0) + 0.5) * c]); pts.push([e[0], e[1]]);
    // 拉直
    const out = []; let cx0 = s[0], cy0 = s[1]; let i = 0;
    while (i < pts.length) { let j = pts.length - 1; while (j > i && !this.los(cx0, cy0, pts[j][0], pts[j][1])) j--; out.push(pts[j]); cx0 = pts[j][0]; cy0 = pts[j][1]; i = j + 1; }
    return out;
  }
}
