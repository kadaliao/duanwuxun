// 潜行：守卫视野与火把光照。玩家在守卫面前、且不在潜行/遮蔽时会被发现。
import { pointInPoly } from '../../engine/nav.js';
export class Stealth {
  constructor(d) { this.d = d; this.guards = []; this.meter = 0; this.active = false; this.onCaught = null; this.onClose = null; this.closeFired = false; }
  start(guards, { onCaught, onClose, closeR = 400 }) { this.guards = guards; this.active = true; this.meter = 0; this.onCaught = onCaught; this.onClose = onClose; this.closeR = closeR; this.closeFired = false; this.grace = 0; }
  stop() { this.active = false; this.guards = []; this.d.g.ui.label({ id: 'stealth' }, null); this.d.danger = false; }
  update(dt) {
    if (!this.active) return; const g = this.d.g, p = g.player; if (!p || p.locked) return;
    if (this.grace > 0) { this.grace -= dt; this.meter = 0; return; }
    let seen = 0, near = 0;
    for (const gd of this.guards) {
      if (!gd.visible || gd.scene !== p.scene) continue;
      const dx = p.x - gd.x, dy = (p.y - gd.y) * 1.3; const dist = Math.hypot(dx, dy);
      const r = (gd.viewR || 600) * (p.sneak ? 0.55 : 1) * (this.hidden(p) ? 0.45 : 1);
      if (dist < r) {
        const fx = gd.facing.x, fy = gd.facing.y; const cos = (dx * fx + dy * fy) / (dist || 1);
        if (gd.omni || cos > 0.34 || dist < 120) seen = Math.max(seen, (1 - dist / r) * (gd.omni ? 1.2 : 1));
      }
      if (dist < this.closeR) near = 1;
    }
    if (seen > 0) this.meter = Math.min(1, this.meter + dt * seen * 1.6); else this.meter = Math.max(0, this.meter - dt * 0.5);
    this.d.danger = this.meter > 0.2;
    if (this.meter > 0.25) g.ui.label(p, this.meter > 0.7 ? '要被看见了！' : '有火把……', 'alert', 1.15); else g.ui.label(p, null);
    if (near && !this.closeFired && this.onClose) { this.closeFired = true; this.grace = 3; this.meter = 0; this.onClose(); return; }
    if (this.meter >= 1) { this.meter = 0; this.active = false; g.ui.label(p, null); this.d.danger = false; if (this.onCaught) this.onCaught(); }
  }
  // 遮蔽：场景里的 hides 多边形（柳树、芦苇）
  hidden(p) { const v = this.d.g.view; if (!v || !v.def.hides) return false; const K = v.k; return v.def.hides.some(poly => pointInPoly(p.x / K, p.y / K, poly)); }
}
