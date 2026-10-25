// 渲染：正交等距相机、光照与昼夜、后期（泛光 + 移轴景深 + 暗角 + 纸纹颗粒）。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uTilt: { value: 0.55 }, uVignette: { value: 0.45 }, uGrain: { value: 0.05 }, uSat: { value: 1.0 }, uFlash: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) }, uFade: { value: 0 },
    uWet: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uTilt, uVignette, uGrain, uSat, uFlash, uFade, uWet; uniform vec2 uRes; uniform vec3 uTint; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      // 移轴：离画面中线越远越糊
      float band = abs(vUv.y - 0.5);
      float blur = smoothstep(0.12, 0.5, band) * uTilt;
      vec2 px = blur * 3.0 / uRes;
      vec4 c = texture2D(tDiffuse, vUv) * 0.28;
      c += texture2D(tDiffuse, vUv + vec2(px.x, 0.0)) * 0.12; c += texture2D(tDiffuse, vUv - vec2(px.x, 0.0)) * 0.12;
      c += texture2D(tDiffuse, vUv + vec2(0.0, px.y)) * 0.12; c += texture2D(tDiffuse, vUv - vec2(0.0, px.y)) * 0.12;
      c += texture2D(tDiffuse, vUv + px) * 0.06; c += texture2D(tDiffuse, vUv - px) * 0.06;
      c += texture2D(tDiffuse, vUv + vec2(px.x, -px.y)) * 0.06; c += texture2D(tDiffuse, vUv + vec2(-px.x, px.y)) * 0.06;
      vec3 col = c.rgb;
      // 饱和度
      float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, uSat);
      col *= uTint;
      // 暗角
      float d = distance(vUv, vec2(0.5)); col *= 1.0 - uVignette * smoothstep(0.35, 0.9, d);
      // 颗粒
      float g = hash(vUv * uRes * 0.5 + fract(uTime)) - 0.5; col += g * uGrain;
      // 闪电
      col = mix(col, vec3(1.0, 1.0, 1.05), uFlash);
      col = mix(col, vec3(0.0), uFade);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc8c0a8, 70, 140);
    // 相机
    this.zoom = 14; // 可见高度（世界单位）的一半
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -60, 160);
    this.yaw = Math.PI / 4; this.pitch = THREE.MathUtils.degToRad(38);
    this.target = new THREE.Vector3(60, 0, 60); this.targetGoal = this.target.clone();
    this.shake = 0;
    // 光
    this.hemi = new THREE.HemisphereLight(0xcfd8e8, 0x6a5a40, 0.6); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 1.6); this.sun.castShadow = true;
    const s = this.sun.shadow; s.mapSize.set(2048, 2048); s.camera.near = -80; s.camera.far = 120; s.bias = -0.0008; s.normalBias = 0.03;
    s.camera.left = -34; s.camera.right = 34; s.camera.top = 34; s.camera.bottom = -34;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.moonDir = new THREE.Vector3(-0.4, 0.8, 0.3).normalize();
    // 后期
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera); this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.85); this.composer.addPass(this.bloom);
    this.final = new ShaderPass(FinalShader); this.composer.addPass(this.final);
    this.composer.addPass(new OutputPass());
    this.pointLights = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.timeOfDay = 10; // 小时
    this.weatherDark = 0; // 0..1 阴雨压暗
    this.lightsOn = 0;
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio); this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pixelRatio); this.composer.setSize(w, h);
    this.final.uniforms.uRes.value.set(w * this.pixelRatio, h * this.pixelRatio);
    this.aspect = w / h; this.updateCamera();
  }
  updateCamera() {
    const c = this.camera, z = this.zoom; c.left = -z * this.aspect; c.right = z * this.aspect; c.top = z; c.bottom = -z; c.updateProjectionMatrix();
  }
  // 相机朝向的单位向量（从目标指向相机）
  camOffset() { return new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  // 相机坐标系的"前"与"右"在地面上的投影（用于键盘移动）
  groundAxes() { const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); const r = new THREE.Vector3(-f.z, 0, f.x); return { forward: f, right: r }; }
  follow(x, y, z, immediate) { this.targetGoal.set(x, y, z); if (immediate) this.target.copy(this.targetGoal); }
  update(dt, t) {
    this.target.lerp(this.targetGoal, 1 - Math.pow(0.001, dt));
    const off = this.camOffset().multiplyScalar(60);
    const p = this.target.clone().add(off);
    if (this.shake > 0) { p.x += (Math.random() - 0.5) * this.shake; p.y += (Math.random() - 0.5) * this.shake; this.shake *= Math.pow(0.02, dt); if (this.shake < 0.01) this.shake = 0; }
    this.camera.position.copy(p); this.camera.lookAt(this.target);
    // 阴影相机跟随
    this.sun.target.position.copy(this.target); this.sun.position.copy(this.target).add(this.sunDir.clone().multiplyScalar(50));
    this.final.uniforms.uTime.value = t;
    if (this.final.uniforms.uFlash.value > 0) this.final.uniforms.uFlash.value = Math.max(0, this.final.uniforms.uFlash.value - dt * 4);
  }
  get sunDir() { return this._sunDir ||= new THREE.Vector3(0.5, 0.8, 0.3).normalize(); }
  // 昼夜：hour 0..24；dark = 阴雨程度
  setTime(hour, dark = 0) {
    this.timeOfDay = hour; this.weatherDark = dark;
    const dayness = THREE.MathUtils.smoothstep(hour, 5.0, 7.5) * (1 - THREE.MathUtils.smoothstep(hour, 17.0, 19.5)); // 1 白天 0 夜
    const dusk = Math.max(THREE.MathUtils.smoothstep(hour, 16.5, 18.2) * (1 - THREE.MathUtils.smoothstep(hour, 18.2, 19.8)), THREE.MathUtils.smoothstep(hour, 5.0, 6.3) * (1 - THREE.MathUtils.smoothstep(hour, 6.3, 7.8)));
    const ang = ((hour - 6) / 12) * Math.PI; // 日出到日落
    const sunDir = dayness > 0.02 ? new THREE.Vector3(Math.cos(ang) * 0.7, 0.45 + 0.6 * Math.max(0, Math.sin(ang)), 0.4).normalize() : this.moonDir.clone();
    this._sunDir = sunDir;
    const dayCol = new THREE.Color(0xfff2dc), duskCol = new THREE.Color(0xffa060), nightCol = new THREE.Color(0x8aa0d8);
    const sunCol = dayCol.clone().lerp(duskCol, dusk).lerp(nightCol, 1 - dayness);
    this.sun.color.copy(sunCol);
    this.sun.intensity = (0.9 + 1.6 * dayness) * (1 - dark * 0.45);
    this.hemi.intensity = (0.6 + 0.35 * dayness) * (1 - dark * 0.3);
    this.hemi.color.set(0xcfd8e8).lerp(new THREE.Color(0x46557a), 1 - dayness);
    this.hemi.groundColor.set(0x6a5a40).lerp(new THREE.Color(0x1c2028), 1 - dayness);
    const fogDay = new THREE.Color(0xc8c0a8), fogNight = new THREE.Color(0x141a26), fogRain = new THREE.Color(0x5a6068);
    const fog = fogDay.clone().lerp(fogRain, dark * 0.8).lerp(fogNight, 1 - dayness);
    this.scene.fog.color.copy(fog); this.renderer.setClearColor(fog);
    this.scene.fog.near = 66 - dark * 8; this.scene.fog.far = 150 - dark * 50 - (1 - dayness) * 30;
    this.renderer.toneMappingExposure = 1.05 - (1 - dayness) * 0.1 - dark * 0.05;
    this.final.uniforms.uSat.value = 1.0 - dark * 0.35 - (1 - dayness) * 0.2;
    this.final.uniforms.uTint.value.set(1, 1, 1).lerp(new THREE.Color(0.85, 0.9, 1.1), 1 - dayness).lerp(new THREE.Color(0.9, 0.95, 1.0), dark * 0.5);
    this.lightsOn = Math.min(1, (1 - dayness) + dark * 0.6);
    this.bloom.strength = 0.22 + this.lightsOn * 0.33;
    return { dayness, lightsOn: this.lightsOn, fog };
  }
  flash(v = 1) { this.final.uniforms.uFlash.value = v; }
  fade(v) { this.final.uniforms.uFade.value = v; }
  render() { this.composer.render(); }
}
