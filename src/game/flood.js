// 洪水：决堤后全局水位 0→1 上涨；每个场景按自己的 flood 定义换算成水面高度。
export class Flood {
  constructor(game) { this.g = game; this.active = false; this.level = 0; this.rate = 1 / 360; this.max = 1; }
  start() { this.active = true; this.level = 0.02; for (const v of Object.values(this.g.views)) this.applyScene(v); }
  stop() { this.active = false; this.level = 0; for (const v of Object.values(this.g.views)) v.setWater(0); }
  applyScene(v) { if (!this.active || !v.flood) { v.setWater(0); return; } const f = v.flood; const lv = Math.max(0, this.level * (f.max ?? 1) - (f.offset ?? 0)); v.setWater(lv); }
  update(dt) {
    if (!this.active) return;
    if (this.level < this.max) this.level = Math.min(this.max, this.level + this.rate * dt * this.g.timeScale);
    for (const v of Object.values(this.g.views)) if (v.loaded) this.applyScene(v);
  }
  depthAt(x, y) { return this.g.view ? this.g.view.depthAt(x, y) : 0; }
}
