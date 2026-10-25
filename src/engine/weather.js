// 天气：雨强、风、闪电（闪白 + 雷声回调）。
export class Weather {
  constructor(r) { this.r = r; this.intensity = 0; this.goal = 0; this.wind = 0.25; this.lightning = false; this.nextBolt = 5; this.thunderCb = null; this.fog = 0.25; }
  set(v, lightning = false) { this.goal = v; this.lightning = lightning; }
  update(dt, t) {
    this.intensity += (this.goal - this.intensity) * Math.min(1, dt * 0.6);
    this.r.final.uniforms.uRain.value = this.intensity; this.r.final.uniforms.uWind.value = this.wind;
    this.r.grade.uniforms.uFog.value = this.fog + this.intensity * 0.25;
    if (this.lightning) { this.nextBolt -= dt; if (this.nextBolt <= 0) { this.nextBolt = 6 + Math.random() * 14; this.r.flash(0.7 + Math.random() * 0.3); if (this.thunderCb) this.thunderCb(0.6 + Math.random() * 2); } }
  }
}
