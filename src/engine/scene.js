// 场景视图：底图、遮挡层、高程图（洪水）、水面、灯光、可走区域、出口。
import * as THREE from 'three';
import { Nav, pointInPoly } from './nav.js';

const texLoader = new THREE.TextureLoader();
export function loadTex(url) {
  return new Promise((res) => texLoader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; res(t); }, undefined, () => {
    console.warn('场景图缺失，用灰底代替：' + url);
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#4a4740'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#3c3a35'; x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 16); res(t);
  }));
}

const WaterShader = {
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tBg, tElev; uniform float uLevel, uTime, uRain, uNight, uFlow; uniform vec2 uSize; uniform vec3 uColor, uColor2; varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ return noise(p)*0.5 + noise(p*2.1+3.7)*0.3 + noise(p*4.3+1.3)*0.2; }
    void main(){
      float h = texture2D(tElev, vUv).r;
      float d = uLevel - h;
      if (d <= 0.0) discard;
      float depth = clamp(d * 5.0, 0.0, 1.0);
      vec2 p = vUv * uSize * 0.006;
      float n1 = fbm(p + vec2(uTime*0.05*uFlow, uTime*0.12)); float n2 = fbm(p*1.7 - vec2(uTime*0.08, uTime*0.06*uFlow));
      vec2 dist = (vec2(n1, n2) - 0.5) * 0.012 * (0.4 + depth);
      vec3 bg = texture2D(tBg, vUv + dist).rgb;
      vec3 wc = mix(uColor, uColor2, depth);
      vec3 col = mix(bg * (0.95 - depth * 0.3), wc, 0.3 + depth * 0.5);
      // 流动的亮纹
      float streak = pow(noise(p*3.0 + vec2(uTime*0.25*uFlow, uTime*0.5)), 6.0);
      col += streak * 0.10 * (1.0 - uNight*0.6);
      // 岸边泡沫
      float foam = smoothstep(0.035, 0.0, d) * (0.3 + 0.7 * noise(p*8.0 + uTime*0.7));
      col = mix(col, vec3(0.45,0.42,0.36), foam * 0.5);
      // 雨点涟漪
      if (uRain > 0.01) {
        vec2 rp = vUv * uSize * 0.03; vec2 cell = floor(rp); vec2 f = fract(rp) - 0.5;
        float t = fract(uTime * 0.8 + hash(cell)); float r = length(f + (vec2(hash(cell+1.3), hash(cell+2.7)) - 0.5) * 0.6);
        float ring = smoothstep(0.03, 0.0, abs(r - t * 0.45)) * (1.0 - t) * step(0.4, hash(cell + 9.1)) * uRain;
        col += ring * 0.12;
      }
      col += vec3(0.10, 0.11, 0.13) * uNight * (0.35 + 0.65 * noise(p * 2.0 + vec2(uTime * 0.3, -uTime * 0.2))) * (0.5 + 0.5 * depth);
      float a = smoothstep(0.0, 0.015, d) * (0.82 + depth * 0.18);
      gl_FragColor = vec4(col, a);
    }`,
};
let glowTex = null;
function getGlowTex() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); glowTex = new THREE.CanvasTexture(c); return glowTex;
}

export class SceneView {
  constructor(game, def) {
    this.g = game; this.def = def; this.id = def.id; this.k = def.unit || 2; // 作者坐标 → 场景像素
    this.W = def.size[0] * this.k; this.H = def.size[1] * this.k;
    this.group = new THREE.Group(); this.lightGroup = new THREE.Group(); this.loaded = false; this.lights = [];
    const K = this.k; const sp = (poly) => poly.map(([x, y]) => [x * K, y * K]);
    this.walk = (def.walk || []).map(sp); this.block = (def.block || []).map(sp);
    this.nav = new Nav(this.W, this.H, this.walk, this.block, 10);
    this.occ = (def.occluders || []).map(o => ({ poly: sp(o.poly), base: o.base * K }));
    this.exits = (def.exits || []).map(e => ({ ...e, poly: sp(e.poly), spawn: e.spawn ? [e.spawn[0] * K, e.spawn[1] * K] : null }));
    this.spots = {}; for (const [k, v] of Object.entries(def.spots || {})) this.spots[k] = [v[0] * K, v[1] * K];
    this.waterLevel = 0; this.elevData = null; this.flood = def.flood || null;
  }
  // 近大远小
  scale(y) { const s = this.def.scale || { y0: 0, s0: 0.7, y1: 1, s1: 1.1 }; const t = Math.max(0, Math.min(1, (y / this.H - s.y0) / (s.y1 - s.y0))); return s.s0 + (s.s1 - s.s0) * t; }
  charH(y) { return (this.def.charH || 130) * this.k * this.scale(y); }
  async load() {
    if (this.loaded) return; this.loaded = true;
    const tex = await loadTex(`assets/img/scenes/${this.def.img || this.id}.webp`);
    this.tex = tex;
    const geo = new THREE.PlaneGeometry(this.W, this.H); geo.translate(this.W / 2, -this.H / 2, 0);
    const bg = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, depthTest: false, depthWrite: false })); bg.renderOrder = -100; bg.frustumCulled = false; this.group.add(bg); this.bg = bg;
    // 遮挡层：底图的一块，按基线 y 排序
    for (const o of this.occ) {
      const shape = new THREE.Shape(o.poly.map(([x, y]) => new THREE.Vector2(x, -y)));
      const g2 = new THREE.ShapeGeometry(shape); const pos = g2.attributes.position; const uv = g2.attributes.uv;
      for (let i = 0; i < pos.count; i++) { uv.setXY(i, pos.getX(i) / this.W, 1 + pos.getY(i) / this.H); }
      const m = new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true })); m.renderOrder = o.base; m.frustumCulled = false; this.group.add(m);
    }
    // 高程图 + 水面
    this.buildElev();
    this.waterMat = new THREE.ShaderMaterial({ uniforms: { tBg: { value: tex }, tElev: { value: this.elevTex }, uLevel: { value: 0 }, uTime: { value: 0 }, uRain: { value: 0 }, uNight: { value: 0 }, uFlow: { value: 1 }, uSize: { value: new THREE.Vector2(this.W, this.H) }, uColor: { value: new THREE.Color(0.11, 0.09, 0.06) }, uColor2: { value: new THREE.Color(0.03, 0.035, 0.03) } }, vertexShader: WaterShader.vertexShader, fragmentShader: WaterShader.fragmentShader, transparent: true, depthTest: false, depthWrite: false });
    const wg = new THREE.PlaneGeometry(this.W, this.H); wg.translate(this.W / 2, -this.H / 2, 0);
    this.water = new THREE.Mesh(wg, this.waterMat); this.water.renderOrder = -50; this.water.visible = false; this.water.frustumCulled = false; this.group.add(this.water);
    // 灯光
    for (const l of this.def.lights || []) this.addLight(l);
  }
  addLight(l) {
    const K = this.k; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTex(), color: new THREE.Color(l.color || 0xffa040), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, opacity: l.a ?? 0.9 }));
    const r = (l.r || 160) * K; s.scale.set(r * 2, r * 2, 1); s.position.set(l.x * K, -l.y * K, 1); s.userData = { ...l, r, baseA: l.a ?? 0.9, phase: Math.random() * 10 }; this.lightGroup.add(s); this.lights.push(s);
    if (l.glow !== false) { // 画面里的灯笼亮点（小）
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTex(), color: new THREE.Color(l.color || 0xffb050), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, opacity: 0 })); const gr = (l.g || 18) * K; g.scale.set(gr * 2, gr * 2, 1); g.position.set(l.x * K, -l.y * K + (l.gy || 0) * K, 1); g.renderOrder = 1e5; this.group.add(g); s.userData.glow = g;
    }
    return s;
  }
  setLights(on, t) { for (const s of this.lights) { const u = s.userData; const fl = u.flicker === false ? 1 : 0.85 + 0.15 * Math.sin(t * 7 + u.phase) * Math.sin(t * 3.3 + u.phase * 2); s.material.opacity = u.baseA * on * fl * (u.off ? 0 : 1); if (u.glow) u.glow.material.opacity = on * 0.9 * fl * (u.off ? 0 : 1); } }
  buildElev() {
    const K = this.k; const c = document.createElement('canvas'); const sw = Math.ceil(this.W / 8), sh = Math.ceil(this.H / 8); c.width = sw; c.height = sh; const ctx = c.getContext('2d');
    const f = this.flood; const base = f ? f.base ?? 0.5 : 1;
    ctx.fillStyle = `rgb(${base * 255},${base * 255},${base * 255})`; ctx.fillRect(0, 0, sw, sh);
    if (f) for (const z of f.zones || []) { const v = Math.round(Math.max(0, Math.min(1, z.h)) * 255); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.beginPath(); z.poly.forEach(([x, y], i) => i ? ctx.lineTo(x * K / 8, y * K / 8) : ctx.moveTo(x * K / 8, y * K / 8)); ctx.closePath(); ctx.fill(); }
    if (f && f.blur !== 0) { const c2 = document.createElement('canvas'); c2.width = sw; c2.height = sh; const x2 = c2.getContext('2d'); x2.filter = `blur(${f.blur || 3}px)`; x2.drawImage(c, 0, 0); ctx.clearRect(0, 0, sw, sh); ctx.drawImage(c2, 0, 0); }
    this.elevData = ctx.getImageData(0, 0, sw, sh); this.elevW = sw; this.elevH = sh;
    this.elevTex = new THREE.CanvasTexture(c); this.elevTex.minFilter = THREE.LinearFilter; this.elevTex.magFilter = THREE.LinearFilter;
  }
  elevAt(x, y) { if (!this.elevData) return 1; const sx = Math.max(0, Math.min(this.elevW - 1, (x / 8) | 0)), sy = Math.max(0, Math.min(this.elevH - 1, (y / 8) | 0)); return this.elevData.data[(sy * this.elevW + sx) * 4] / 255; }
  depthAt(x, y) { if (!this.water || !this.water.visible) return 0; return Math.max(0, (this.waterLevel - this.elevAt(x, y)) * 5); }
  setWater(level) { this.waterLevel = level; if (!this.water) return; this.water.visible = level > 0.001; this.waterMat.uniforms.uLevel.value = level; }
  update(t, rain, night) { if (this.waterMat) { this.waterMat.uniforms.uTime.value = t; this.waterMat.uniforms.uRain.value = rain; this.waterMat.uniforms.uNight.value = night; } }
  behindOccluder(x, y) { for (const o of this.occ) if (y < o.base && pointInPoly(x, y, o.poly)) return true; return false; }
  exitAt(x, y) { for (const e of this.exits) if (pointInPoly(x, y, e.poly)) return e; return null; }
  spot(name) { return this.spots[name]; }
}
