// 游戏时钟：十二时辰。白天 1 时辰 = 50 秒实时。
export const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export function hourToShichen(h) { const i = Math.floor(((h + 1) % 24) / 2); return SHICHEN[i]; }
export class Clock {
  constructor(game) { this.g = game; this.hour = 8; this.day = 1; this.running = false; this.rate = 2 / 65; /* 小时/秒 */ this.dark = 0; this.onHour = null; this.lastShichen = ''; }
  set(hour) { this.hour = hour; this.apply(); }
  apply() { this.g.applyTime(this.hour, this.dark); }
  update(dt) {
    if (!this.running) return;
    const prev = this.hour;
    this.hour += this.rate * dt * this.g.timeScale;
    if (this.hour >= 24) this.hour -= 24;
    const sc = hourToShichen(this.hour);
    if (sc !== this.lastShichen) { this.lastShichen = sc; if (this.onShichen) this.onShichen(sc, this.hour); }
    if (this.onHour && Math.floor(prev) !== Math.floor(this.hour)) this.onHour(Math.floor(this.hour));
    this.apply();
  }
  label() { return hourToShichen(this.hour) + '时'; }
}
