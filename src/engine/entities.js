// 人物实体：场景像素坐标 (x, y)，脚底在 y。精灵按 y 排序，近大远小，水里下沉。
import * as THREE from 'three';
import { loadLook, META } from './sprites.js';

const SpriteShader = {
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D map; uniform vec2 uOff, uRep; uniform float uFlip, uSubmerge, uAlpha, uDim; uniform vec3 uTint; varying vec2 vUv;
    void main(){
      vec2 uv = vUv; if (uFlip > 0.5) uv.x = 1.0 - uv.x;
      if (vUv.y < uSubmerge) discard;
      vec4 c = texture2D(map, uOff + uv * uRep);
      if (c.a < 0.08) discard;
      c.rgb = mix(c.rgb, c.rgb * uTint, uDim);
      gl_FragColor = vec4(c.rgb, c.a * uAlpha);
    }`,
};
let shadowTex = null;
function getShadowTex() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 32, 2, 64, 32, 60); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.scale(1, 0.5); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, 64, 64, 0, Math.PI * 2); ctx.fill();
  shadowTex = new THREE.CanvasTexture(c); return shadowTex;
}
export const BASE_H = 300; // 图集一帧的标准高度；场景里身高 = 场景 charH * scale(y)
export class Entity {
  constructor(game, lookId, opts = {}) {
    this.g = game; this.lookId = lookId; this.opts = opts;
    this.x = opts.x || 0; this.y = opts.y || 0; this.scene = opts.scene || game.sceneId;
    this.name = opts.name || lookId; this.id = opts.id || lookId;
    this.speed = opts.speed || 1; // 相对速度
    this.facing = new THREE.Vector2(0, 1);
    this.dir = 0; this.flip = false; this.frame = 0; this.animT = 0; this.moving = false; this.sneak = false;
    this.path = null; this.pathI = 0; this.onArrive = null; this.visible = true; this.locked = false;
    this.depth = 0; this.stepT = 0; this.onStep = null; this.talking = false; this.hidden = false;
    this.mat = new THREE.ShaderMaterial({ uniforms: { map: { value: null }, uOff: { value: new THREE.Vector2(0, 0) }, uRep: { value: new THREE.Vector2(1, 1) }, uFlip: { value: 0 }, uSubmerge: { value: 0 }, uAlpha: { value: 1 }, uDim: { value: 0 }, uTint: { value: new THREE.Color(0.4, 0.45, 0.6) } }, vertexShader: SpriteShader.vertexShader, fragmentShader: SpriteShader.fragmentShader, transparent: true, depthTest: false, depthWrite: false });
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.userData.entity = this; this.mesh.frustumCulled = false;
    this.ghostMat = this.mat.clone(); this.ghostMat.uniforms = THREE.UniformsUtils.clone(this.mat.uniforms); this.ghostMat.uniforms.uAlpha.value = 0.32;
    this.ghost = new THREE.Mesh(geo, this.ghostMat); this.ghost.frustumCulled = false; this.ghost.visible = false;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: getShadowTex(), transparent: true, depthTest: false, depthWrite: false, opacity: 0.8 })); this.shadow.frustumCulled = false;
    this.group = new THREE.Group(); this.group.add(this.shadow); this.group.add(this.mesh); this.group.add(this.ghost);
    this.look = META[lookId] || null; this.ready = loadLook(lookId).then(l => { this.look = l; this.mat.uniforms.map.value = l.tex; this.ghostMat.uniforms.map.value = l.tex; });
    if (this.look) { this.mat.uniforms.map.value = this.look.tex; this.ghostMat.uniforms.map.value = this.look.tex; }
    this.height = 1; this.scaleK = 1;
  }
  get sceneView() { return this.g.views[this.scene]; }
  // 身高（场景像素）
  get h() { const v = this.sceneView; return v ? v.charH(this.y) * (this.opts.scale || 1) : 240; }
  setFrame(dir, f, flip) {
    const l = this.look; if (!l) return;
    this.mat.uniforms.uOff.value.set(f / l.cols, 1 - (dir + 1) / l.rows); this.mat.uniforms.uRep.value.set(1 / l.cols, 1 / l.rows); this.mat.uniforms.uFlip.value = flip ? 1 : 0;
    const u = this.ghostMat.uniforms; u.uOff.value.copy(this.mat.uniforms.uOff.value); u.uRep.value.copy(this.mat.uniforms.uRep.value); u.uFlip.value = flip ? 1 : 0;
  }
  updateDir() {
    const fx = this.facing.x, fy = this.facing.y;
    if (Math.abs(fy) >= Math.abs(fx) * 0.9) { this.dir = fy > 0 ? 0 : 1; this.flip = false; }
    else { this.dir = 2; this.flip = fx < 0; }
  }
  moveBy(dx, dy, dt, run) {
    const l = Math.hypot(dx, dy); if (l < 1e-4) { this.moving = false; return; }
    dx /= l; dy /= l; this.facing.set(dx, dy);
    const v = this.sceneView; const sc = v ? v.scale(this.y) : 1;
    let sp = 150 * this.speed * (run ? 1.7 : 1) * (this.sneak ? 0.5 : 1) * sc;
    if (this.depth > 0.12) sp *= Math.max(0.3, 1 - this.depth * 1.2);
    // 画面是斜俯视：竖向移动在屏幕上慢一点（透视压缩）
    const nx = this.x + dx * sp * dt, ny = this.y + dy * sp * dt * 0.75;
    let moved = false; const nav = v && v.nav;
    const can = (x, y) => !nav || (nav.walkable(x, y) && this.canEnter(x, y));
    if (can(nx, this.y)) { this.x = nx; moved = true; }
    if (can(this.x, ny)) { this.y = ny; moved = true; }
    this.moving = moved; this.blocked = !moved;
    if (moved) { this.stepT += sp * dt / sc; if (this.stepT > 95) { this.stepT = 0; if (this.onStep) this.onStep(this); } }
  }
  canEnter(x, y) { return true; }
  goTo(tx, ty, cb) {
    const v = this.sceneView; if (!v) { if (cb) cb(false); return false; }
    const p = v.nav.findPath(this.x, this.y, tx, ty);
    if (!p) { this.path = null; if (cb) cb(false); return false; }
    this.path = p; this.pathI = 0; this.onArrive = cb || null; return true;
  }
  stop() { this.path = null; this.moving = false; }
  followPath(dt, run) {
    if (!this.path) return false;
    if (this.pathI >= this.path.length) { this.path = null; this.moving = false; const cb = this.onArrive; this.onArrive = null; if (cb) cb(true); return false; }
    const [tx, ty] = this.path[this.pathI]; const dx = tx - this.x, dy = ty - this.y; const d = Math.hypot(dx, dy);
    if (d < 6) { this.pathI++; return true; }
    const bx = this.x, by = this.y; this.moveBy(dx, dy, dt, run);
    if (Math.hypot(this.x - bx, this.y - by) < 0.05) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 0.5) { this.stuck = 0; this.pathI++; } } else this.stuck = 0;
    return true;
  }
  update(dt) {
    const v = this.sceneView; if (!v) return;
    this.depth = this.noWater ? 0 : v.depthAt(this.x, this.y);
    if (this.moving) { this.animT += dt * (this.sneak ? 6 : 9) * (this.opts.animRate || 1); const nf = (this.look ? this.look.frames : 6) - 1; this.frame = 1 + (Math.floor(this.animT) % Math.max(1, nf)); }
    else { this.frame = 0; this.animT = 0; }
    this.updateDir(); this.setFrame(this.dir, this.frame, this.flip);
    const h = this.h; const w = h * (this.look ? this.look.cw / this.look.ch : 0.4);
    const feet = this.look ? this.look.feet * h / this.look.ch : 0;
    const bob = this.moving ? Math.abs(Math.sin(this.animT * Math.PI)) * h * 0.012 : 0;
    this.mesh.scale.set(w, h, 1); this.mesh.position.set(this.x, -this.y + feet + bob, 0);
    this.ghost.scale.copy(this.mesh.scale); this.ghost.position.copy(this.mesh.position);
    this.mesh.renderOrder = this.y + (this.orderBias || 0); this.ghost.renderOrder = 1e6;
    this.shadow.scale.set(w * 1.1, w * 0.45, 1); this.shadow.position.set(this.x, -this.y + 2, 0); this.shadow.renderOrder = this.y - 0.5;
    const sub = this.noWater ? 0 : Math.min(0.75, this.depth * 0.8); this.mat.uniforms.uSubmerge.value = sub;
    const behind = v.behindOccluder(this.x, this.y);
    this.ghost.visible = this.visible && behind && !!this.opts.ghost;
    this.mesh.visible = this.visible; this.shadow.visible = this.visible && this.depth < 0.2;
    this.mat.uniforms.uDim.value = this.sneak ? 0.5 : 0;
  }
  dist(o) { if (o.scene && o.scene !== this.scene) return 1e9; return Math.hypot(this.x - o.x, (this.y - o.y) * 1.3); }
  faceTo(o) { const dx = o.x - this.x, dy = o.y - this.y; const l = Math.hypot(dx, dy); if (l > 0.01) this.facing.set(dx / l, dy / l); }
}
