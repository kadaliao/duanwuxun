// 程序化音频：雨、风、雷、脚步、锣、更鼓、古琴/箫式背景乐。全部 WebAudio 合成，无外部文件。
export class Audio {
  constructor() { this.ctx = null; this.master = null; this.rain = null; this.rainGain = null; this.windGain = null; this.musicOn = true; this.started = false; this.musicT = 0; this.mood = 'day'; this.nextNote = 0; this.volume = 0.8; }
  init() {
    if (this.ctx) return;
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = this.volume; this.master.connect(C.destination);
    this.musicGain = C.createGain(); this.musicGain.gain.value = 0.5; this.musicGain.connect(this.master);
    this.sfxGain = C.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(this.master);
    this.ambGain = C.createGain(); this.ambGain.gain.value = 0.8; this.ambGain.connect(this.master);
    // 噪声源
    const len = C.sampleRate * 2; const buf = C.createBuffer(1, len, C.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // 雨：白噪 → 带通
    const rain = C.createBufferSource(); rain.buffer = buf; rain.loop = true;
    const rf = C.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 2400; rf.Q.value = 0.5;
    const rf2 = C.createBiquadFilter(); rf2.type = 'highpass'; rf2.frequency.value = 900;
    this.rainGain = C.createGain(); this.rainGain.gain.value = 0;
    rain.connect(rf); rf.connect(rf2); rf2.connect(this.rainGain); this.rainGain.connect(this.ambGain); rain.start();
    // 风：低通噪声 + 缓慢 LFO
    const wind = C.createBufferSource(); wind.buffer = buf; wind.loop = true; wind.playbackRate.value = 0.5;
    const wf = C.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 400; wf.Q.value = 1.2;
    this.windGain = C.createGain(); this.windGain.gain.value = 0;
    const lfo = C.createOscillator(); lfo.frequency.value = 0.13; const lg = C.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(wf.frequency); lfo.start();
    wind.connect(wf); wf.connect(this.windGain); this.windGain.connect(this.ambGain); wind.start();
    // 虫鸣/水声：高频细噪
    const crick = C.createBufferSource(); crick.buffer = buf; crick.loop = true; const cf = C.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 5200; cf.Q.value = 12;
    this.crickGain = C.createGain(); this.crickGain.gain.value = 0; crick.connect(cf); cf.connect(this.crickGain); this.crickGain.connect(this.ambGain); crick.start();
    const lfo2 = C.createOscillator(); lfo2.frequency.value = 7; const lg2 = C.createGain(); lg2.gain.value = 0.02; lfo2.connect(lg2); lg2.connect(this.crickGain.gain); lfo2.start();
    // 河水：低频噪声
    const river = C.createBufferSource(); river.buffer = buf; river.loop = true; river.playbackRate.value = 0.35; const rvf = C.createBiquadFilter(); rvf.type = 'lowpass'; rvf.frequency.value = 600;
    this.riverGain = C.createGain(); this.riverGain.gain.value = 0; river.connect(rvf); rvf.connect(this.riverGain); this.riverGain.connect(this.ambGain); river.start();
    // 混响（简单卷积）
    const irLen = C.sampleRate * 1.8; const ir = C.createBuffer(2, irLen, C.sampleRate); for (let ch = 0; ch < 2; ch++) { const dd = ir.getChannelData(ch); for (let i = 0; i < irLen; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3); }
    this.reverb = C.createConvolver(); this.reverb.buffer = ir; const rg = C.createGain(); rg.gain.value = 0.35; this.reverb.connect(rg); rg.connect(this.master);
    this.started = true;
  }
  resume() { this.init(); if (this.ctx.state === 'suspended') this.ctx.resume(); }
  setAmbience({ rain = 0, wind = 0, crickets = 0, river = 0 }) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(rain * 0.5, t, 1.5); this.windGain.gain.setTargetAtTime(wind * 0.5, t, 1.5); this.crickGain.gain.setTargetAtTime(crickets * 0.05, t, 2); this.riverGain.gain.setTargetAtTime(river * 0.4, t, 1.5);
  }
  // ── 音效 ──
  env(gainNode, t, a, d, s, r, peak = 1) { const g = gainNode.gain; g.cancelScheduledValues(t); g.setValueAtTime(0, t); g.linearRampToValueAtTime(peak, t + a); g.linearRampToValueAtTime(peak * s, t + a + d); g.linearRampToValueAtTime(0, t + a + d + r); }
  tone(freq, dur, type = 'sine', vol = 0.3, dest = null, detune = 0) {
    if (!this.ctx) return; const C = this.ctx, t = C.currentTime; const o = C.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune; const g = C.createGain(); o.connect(g); g.connect(dest || this.sfxGain); this.env(g, t, 0.01, dur * 0.3, 0.5, dur * 0.7, vol); o.start(t); o.stop(t + dur + 0.1);
  }
  noise(dur, freq, q, vol = 0.3, type = 'bandpass') { if (!this.ctx) return; const C = this.ctx, t = C.currentTime; const s = C.createBufferSource(); s.buffer = this.noiseBuf; const f = C.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = C.createGain(); s.connect(f); f.connect(g); g.connect(this.sfxGain); this.env(g, t, 0.005, dur * 0.2, 0.4, dur * 0.8, vol); s.start(t); s.stop(t + dur + 0.1); }
  step(kind, depth) {
    if (!this.ctx) return;
    if (depth > 0.1) { this.noise(0.18, 900 + Math.random() * 400, 1.5, 0.12); return; }
    if (kind === 3 || kind === 7) this.noise(0.08, 1800 + Math.random() * 600, 3, 0.07); // 石
    else if (kind === 1 || kind === 6) this.noise(0.14, 500 + Math.random() * 200, 1.2, 0.09); // 泥
    else this.noise(0.1, 1100 + Math.random() * 400, 2, 0.06);
  }
  thunder(delay = 1) { if (!this.ctx) return; const C = this.ctx; setTimeout(() => { const t = C.currentTime; const s = C.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 0.3; const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(80, t + 2.5); const g = C.createGain(); s.connect(f); f.connect(g); g.connect(this.sfxGain); g.connect(this.reverb); this.env(g, t, 0.05, 0.6, 0.5, 2.5, 0.7); s.start(t); s.stop(t + 3.5); }, delay * 1000); }
  gong() { if (!this.ctx) return; const C = this.ctx, t = C.currentTime; for (const [f, v, d] of [[196, 0.5, 2.6], [392, 0.25, 1.8], [523, 0.15, 1.2], [1046, 0.08, 0.6], [290, 0.2, 2.0]]) { const o = C.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = C.createGain(); o.connect(g); g.connect(this.sfxGain); g.connect(this.reverb); this.env(g, t, 0.005, 0.1, 0.8, d, v); o.start(t); o.stop(t + d + 0.3); } this.noise(0.15, 3000, 1, 0.3); }
  drum(n = 1) { if (!this.ctx) return; const C = this.ctx; for (let i = 0; i < n; i++) setTimeout(() => { const t = C.currentTime; const o = C.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.3); const g = C.createGain(); o.connect(g); g.connect(this.sfxGain); g.connect(this.reverb); this.env(g, t, 0.005, 0.1, 0.3, 0.5, 0.8); o.start(t); o.stop(t + 0.7); }, i * 600); }
  woodblock() { this.tone(900, 0.08, 'square', 0.12); this.noise(0.05, 2500, 2, 0.1); }
  click() { this.tone(1200, 0.04, 'triangle', 0.08); }
  paper() { this.noise(0.25, 3500, 0.8, 0.12, 'highpass'); }
  chime() { this.tone(1318, 0.9, 'sine', 0.18); setTimeout(() => this.tone(1760, 1.2, 'sine', 0.14), 120); }
  insight() { if (!this.ctx) return; this.tone(523, 0.5, 'sine', 0.15); setTimeout(() => this.tone(784, 0.6, 'sine', 0.15), 90); setTimeout(() => this.tone(1046, 1.0, 'sine', 0.12), 180); }
  bad() { this.tone(180, 0.6, 'sawtooth', 0.12); this.tone(170, 0.6, 'sawtooth', 0.1); }
  splash() { this.noise(0.5, 700, 0.8, 0.35); this.noise(0.3, 2500, 1, 0.2); }
  rumble(dur = 3) { if (!this.ctx) return; const C = this.ctx, t = C.currentTime; const s = C.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.playbackRate.value = 0.2; const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 120; const g = C.createGain(); s.connect(f); f.connect(g); g.connect(this.sfxGain); this.env(g, t, 0.3, dur * 0.3, 0.8, dur * 0.7, 0.9); s.start(t); s.stop(t + dur + 0.2); }
  // 古琴拨弦（Karplus-Strong 近似：短衰减锯齿 + 低通）
  pluck(freq, vol = 0.18, dur = 2.2) { if (!this.ctx) return; const C = this.ctx, t = C.currentTime; const o = C.createOscillator(); o.type = 'triangle'; o.frequency.value = freq; const o2 = C.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01; const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur); const g = C.createGain(); const g2 = C.createGain(); g2.gain.value = 0.25; o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.musicGain); g.connect(this.reverb); this.env(g, t, 0.004, 0.15, 0.5, dur, vol); o.start(t); o2.start(t); o.stop(t + dur + 0.2); o2.stop(t + dur + 0.2); }
  xiao(freq, dur = 1.6, vol = 0.08) { if (!this.ctx) return; const C = this.ctx, t = C.currentTime; const o = C.createOscillator(); o.type = 'sine'; o.frequency.value = freq; const v = C.createOscillator(); v.frequency.value = 5; const vg = C.createGain(); vg.gain.value = 3; v.connect(vg); vg.connect(o.frequency); const n = C.createBufferSource(); n.buffer = this.noiseBuf; const nf = C.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = freq; nf.Q.value = 8; const ng = C.createGain(); ng.gain.value = 0.15; n.connect(nf); nf.connect(ng); const g = C.createGain(); o.connect(g); ng.connect(g); g.connect(this.musicGain); g.connect(this.reverb); this.env(g, t, 0.25, dur * 0.3, 0.7, dur * 0.6, vol); o.start(t); v.start(t); n.start(t); o.stop(t + dur + 0.3); v.stop(t + dur + 0.3); n.stop(t + dur + 0.3); }
  // 生成式配乐：五声音阶，按情绪换调与节奏
  update(dt, game) {
    if (!this.ctx || !this.musicOn) return;
    this.musicT += dt;
    if (this.musicT < this.nextNote) return;
    const mood = this.mood;
    const scales = { day: [220, 246.9, 293.7, 329.6, 392, 440, 493.9, 587.3], night: [196, 220, 261.6, 293.7, 349.2, 392, 440], tense: [164.8, 185, 220, 246.9, 277.2, 329.6, 370], storm: [146.8, 164.8, 196, 220, 261.6, 293.7], sorrow: [174.6, 196, 233.1, 261.6, 311.1, 349.2, 392] };
    const sc = scales[mood] || scales.day;
    const idx = Math.floor(Math.random() * sc.length);
    if (mood === 'storm' || mood === 'tense') { this.pluck(sc[idx] / 2, 0.14, 1.2); if (Math.random() < 0.3) this.pluck(sc[(idx + 2) % sc.length] / 2, 0.1, 0.8); this.nextNote = this.musicT + (mood === 'storm' ? 0.35 + Math.random() * 0.5 : 0.7 + Math.random() * 1.2); }
    else { if (Math.random() < 0.75) this.pluck(sc[idx], 0.16, 2.5); else this.xiao(sc[idx] * 2, 2.2, 0.06); if (Math.random() < 0.25) this.pluck(sc[idx] / 2, 0.12, 3); this.nextNote = this.musicT + 1.2 + Math.random() * 2.6; }
  }
  setMood(m) { this.mood = m; }
}
