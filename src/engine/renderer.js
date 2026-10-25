// 渲染：正交相机看一张手绘场景（像素坐标，y 向下），灯光图、水、后期（调色 + 雨 + 泛光 + 暗角 + 颗粒）。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, tLight: { value: null }, uNight: { value: 0 }, uTime: { value: 0 },
    uAmbient: { value: new THREE.Color(0.30, 0.34, 0.46) }, uTint: { value: new THREE.Color(1, 1, 1) }, uSat: { value: 1 },
    uFog: { value: 0.0 }, uFogColor: { value: new THREE.Color(0.72, 0.76, 0.78) }, uView: { value: new THREE.Vector4(0, 0, 1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse, tLight; uniform float uNight, uTime, uSat, uFog; uniform vec3 uAmbient, uTint, uFogColor; uniform vec4 uView; varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      vec3 light = texture2D(tLight, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, uSat);
      // 夜：环境色压暗，灯光图把局部提亮并染暖
      vec3 nightCol = col * uAmbient * 1.1 + col * light * 2.4 + light * light * 0.3 + vec3(0.004, 0.006, 0.012);
      col = mix(col, nightCol, uNight);
      col *= uTint;
      // 雾/湿气：缓慢漂移的低频噪声
      if (uFog > 0.001) {
        vec2 wp = (uView.xy + vUv * uView.zw) * 0.0022;
        float f = noise(wp + vec2(uTime*0.02, uTime*0.008)) * 0.6 + noise(wp*2.3 - vec2(uTime*0.03, 0.)) * 0.4;
        f = smoothstep(0.35, 0.8, f) * uFog;
        col = mix(col, uFogColor * mix(1.0, 0.35, uNight), f * 0.55);
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.42 }, uGrain: { value: 0.035 }, uFlash: { value: 0 }, uFade: { value: 0 }, uRain: { value: 0 }, uWind: { value: 0.25 }, uNight: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uFlash, uFade, uRain, uWind, uNight; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float rainLayer(vec2 uv, float scale, float speed, float seed, float thick){
      vec2 p = uv * vec2(uRes.x/uRes.y, 1.0) * scale;
      p.x += p.y * uWind * 0.6;
      p.y += uTime * speed;
      vec2 cell = floor(p); vec2 f = fract(p);
      float r = hash(cell + seed);
      if (r < 0.80) return 0.0;
      float cx = hash(cell * 1.7 + seed) * 0.6 + 0.2;
      float streak = smoothstep(thick, 0.0, abs(f.x - cx)) * smoothstep(0.0, 0.25, f.y) * smoothstep(1.0, 0.55, f.y);
      return streak * (0.5 + 0.5 * hash(cell * 3.1 + seed));
    }
    void main(){
      vec2 uv = vUv;
      vec3 col = texture2D(tDiffuse, uv).rgb;
      if (uRain > 0.001) {
        float r = rainLayer(uv, 18.0, -1.4, 1.0, 0.035) * 0.55 + rainLayer(uv, 32.0, -2.2, 7.0, 0.03) * 0.35 + rainLayer(uv, 60.0, -3.2, 13.0, 0.025) * 0.25;
        vec3 rc = mix(vec3(0.75,0.8,0.85), vec3(0.55,0.62,0.72), uNight);
        col = mix(col, rc, clamp(r * uRain, 0.0, 0.6));
      }
      float d = distance(uv, vec2(0.5)); col *= 1.0 - smoothstep(0.35, 0.95, d) * uVignette;
      col += (hash(uv * uRes + uTime) - 0.5) * uGrain;
      col = mix(col, vec3(1.0), uFlash);
      col = mix(col, vec3(0.0), uFade);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.lightScene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    this.camera.position.set(0, 0, 500);
    this.cx = 0; this.cy = 0; this.viewW = 2000; this.bounds = null; this.shake = 0; this.t = 0;
    this.target = { x: 0, y: 0 }; this.targetGoal = { x: 0, y: 0 };
    this.lightRT = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
    this.composer = new EffectComposer(this.gl);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.grade = new ShaderPass(GradeShader); this.composer.addPass(this.grade);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.6, 0.86); this.composer.addPass(this.bloom);
    this.final = new ShaderPass(FinalShader); this.composer.addPass(this.final);
    this.composer.addPass(new OutputPass());
    this.resize(); window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.gl.setSize(w, h, false); this.composer.setSize(w, h);
    this.lightRT.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
    this.final.uniforms.uRes.value.set(w * this.gl.getPixelRatio(), h * this.gl.getPixelRatio());
    this.updateCamera();
  }
  get viewH() { return this.viewW * window.innerHeight / window.innerWidth; }
  updateCamera() {
    const vw = this.viewW, vh = this.viewH;
    let cx = this.cx, cy = this.cy;
    if (this.bounds) { const [W, H] = this.bounds; cx = Math.max(Math.min(vw / 2, W / 2), Math.min(W - vw / 2, cx)); cy = Math.max(Math.min(vh / 2, H / 2), Math.min(H - vh / 2, cy)); }
    this.cx = cx; this.cy = cy;
    const sx = (Math.random() - 0.5) * this.shake * 18, sy = (Math.random() - 0.5) * this.shake * 18;
    this.camera.left = cx - vw / 2 + sx; this.camera.right = cx + vw / 2 + sx; this.camera.top = -(cy - vh / 2 + sy); this.camera.bottom = -(cy + vh / 2 + sy);
    this.camera.updateProjectionMatrix();
    this.grade.uniforms.uView.value.set(cx - vw / 2, cy - vh / 2, vw, vh);
  }
  // 相机跟随（场景像素坐标）
  follow(x, y, snap) { this.targetGoal.x = x; this.targetGoal.y = y; if (snap) { this.target.x = x; this.target.y = y; this.cx = x; this.cy = y; this.updateCamera(); } }
  update(dt, t) {
    this.t = t;
    const k = Math.min(1, dt * 4.5);
    this.target.x += (this.targetGoal.x - this.target.x) * k; this.target.y += (this.targetGoal.y - this.target.y) * k;
    this.cx = this.target.x; this.cy = this.target.y;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.2);
    this.updateCamera();
    this.grade.uniforms.uTime.value = t; this.final.uniforms.uTime.value = t;
  }
  setTime(hour, dark = 0) {
    // 白天 → 夜：uNight 0..1。天色由色调 + 饱和度表达。
    const h = hour;
    let night = 0;
    if (h < 5) night = 1; else if (h < 7) night = 1 - (h - 5) / 2; else if (h < 17.5) night = 0; else if (h < 19.5) night = (h - 17.5) / 2; else night = 1;
    night = Math.max(night, dark);
    const dusk = Math.max(0, 1 - Math.abs(h - 18.2) / 1.6) * (1 - dark);
    const tint = new THREE.Color(1, 1, 1).lerp(new THREE.Color(1.08, 0.92, 0.78), dusk * 0.6);
    this.grade.uniforms.uNight.value = night; this.grade.uniforms.uTint.value.copy(tint); this.grade.uniforms.uSat.value = 1 - night * 0.25 + dusk * 0.1;
    this.final.uniforms.uNight.value = night; this.final.uniforms.uVignette.value = 0.42 + night * 0.25;
    this.bloom.strength = 0.25 + night * 0.55;
    return { lightsOn: Math.min(1, Math.max(0, (night - 0.15) / 0.5)) };
  }
  fade(v) { this.final.uniforms.uFade.value = v; }
  flash(v) { this.final.uniforms.uFlash.value = v; }
  render() {
    // 灯光图
    this.gl.setRenderTarget(this.lightRT); this.gl.setClearColor(0x000000, 1); this.gl.clear(); this.gl.render(this.lightScene, this.camera); this.gl.setRenderTarget(null);
    this.grade.uniforms.tLight.value = this.lightRT.texture;
    if (this.final.uniforms.uFlash.value > 0) this.final.uniforms.uFlash.value = Math.max(0, this.final.uniforms.uFlash.value - 0.08);
    this.composer.render();
  }
  // 屏幕 → 场景像素
  toScene(mx, my) { const vw = this.viewW, vh = this.viewH; return { x: this.cx - vw / 2 + mx / window.innerWidth * vw, y: this.cy - vh / 2 + my / window.innerHeight * vh }; }
  toScreen(x, y) { const vw = this.viewW, vh = this.viewH; return { x: (x - (this.cx - vw / 2)) / vw * window.innerWidth, y: (y - (this.cy - vh / 2)) / vh * window.innerHeight }; }
}
