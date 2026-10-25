// 洪水：从决口开始按格扩散，水位逐步上涨。
export class Flood {
  constructor(game) { this.g = game; this.active = false; this.level = -99; this.front = []; this.reached = new Uint8Array(game.map.W * game.map.D); this.tick = 0; this.targetLevel = 1.0; this.rate = 0.012; this.spreadT = 0; this.openTiles = []; }
  start(bx, bz) {
    this.active = true; const m = this.g.map; this.level = 0.1;
    this.reached.fill(0); this.front = [[bx | 0, bz | 0]]; this.reached[m.idx(bx | 0, bz | 0)] = 1; this.openTiles = [];
    this.spread(400);
  }
  // 扩散：把前沿相邻、地面高度 < 当前水位 + 容差 的格加入
  spread(n) {
    const m = this.g.map, w = this.g.world; let count = 0;
    const next = [];
    while (this.front.length && count < n) {
      const [x, z] = this.front.shift(); count++;
      this.openTiles.push([x, z]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz; if (!m.inb(nx, nz)) continue; const i = m.idx(nx, nz);
        if (this.reached[i]) continue;
        if (m.h[i] < this.level - 0.02 || (m.water[i] > -90 && m.water[i] < 0.5)) { this.reached[i] = 1; this.front.push([nx, nz]); }
        else next.push([nx, nz]); // 以后水位高了再试
      }
    }
    this.pending = (this.pending || []).concat(next);
  }
  update(dt) {
    if (!this.active) return;
    const m = this.g.map, w = this.g.world;
    if (this.level < this.targetLevel) this.level += this.rate * dt * this.g.timeScale;
    this.spreadT += dt;
    if (this.spreadT > 0.25) {
      this.spreadT = 0;
      // 重新检查待定格
      if (this.pending && this.pending.length) { const p = this.pending; this.pending = []; for (const [x, z] of p) { const i = m.idx(x, z); if (this.reached[i]) continue; if (m.h[i] < this.level - 0.02) { this.reached[i] = 1; this.front.push([x, z]); } else this.pending.push([x, z]); } }
      this.spread(300);
      // 写入水位
      for (const [x, z] of this.openTiles) { const i = m.idx(x, z); if (m.h[i] < this.level) w.floodLevel[i] = Math.max(w.floodLevel[i], this.level); }
      w.refreshWater();
      w.waterUniforms.uFlood.value = 1;
    }
  }
  depthAt(x, z) { return this.g.world.depthAt(x, z); }
}
