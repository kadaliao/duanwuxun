// 人物实体：公告板精灵 + 行走动画 + 简单物理（地面高度、水深减速）。
import * as THREE from 'three';
import { getAtlasTexture, FW, FH, FRAMES } from './sprites.js';
import { findPath } from './pathfind.js';

const PITCH = 38 * Math.PI / 180;
const SPR_H = 1.55 / Math.cos(PITCH); // 竖直立牌；按相机俯仰放大，屏幕上仍是 1.55 的身高
export class Entity {
  constructor(world, lookId, opts = {}) {
    this.world = world; this.lookId = lookId; this.opts = opts;
    const { tex } = getAtlasTexture(lookId, opts.look);
    this.tex = tex.clone(); this.tex.needsUpdate = true;
    this.tex.repeat.set(1 / FRAMES, 1 / 3);
    const h = (opts.scale || 1) * SPR_H, w = h * FW / FH;
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2 - 0.04, 0);
    this.mat = new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, transparent: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true; this.mesh.receiveShadow = false;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.mesh.userData.entity = this;
    // 被遮挡时的剪影：只画在别的东西后面
    this.ghostMat = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.1, transparent: true, opacity: 0.4, depthTest: true, depthWrite: false, depthFunc: THREE.GreaterDepth, color: 0xffe0b0 });
    this.ghost = new THREE.Mesh(geo, this.ghostMat); this.ghost.renderOrder = 5; this.ghost.visible = !!opts.ghost;
    this.x = opts.x || 0; this.z = opts.z || 0; this.y = 0;
    this.dir = 0; this.flip = false; this.frame = 0; this.animT = 0;
    this.speed = opts.speed || 4.2; this.moving = false;
    this.path = null; this.pathI = 0; this.onArrive = null;
    this.name = opts.name || lookId; this.id = opts.id || lookId;
    this.visible = true; this.facing = new THREE.Vector2(0, 1);
    this.bob = 0; this.vy = 0; this.depth = 0; this.stepT = 0; this.onStep = null;
    this.blocked = false; this.sneak = false;
  }
  setFrame(dir, f, flip) {
    this.tex.offset.set(f / FRAMES, 1 - (dir + 1) / 3);
    this.tex.repeat.x = (flip ? -1 : 1) / FRAMES; if (flip) this.tex.offset.x = (f + 1) / FRAMES;
  }
  // 根据面向与相机朝向决定用哪一行
  updateSpriteDir(camYaw) {
    // 面向向量在相机坐标系中的分量
    const fx = this.facing.x, fz = this.facing.y;
    const cf = new THREE.Vector2(-Math.sin(camYaw), -Math.cos(camYaw)); // 相机前向（地面）
    const cr = new THREE.Vector2(-cf.y, cf.x);
    const dotF = fx * cf.x + fz * cf.y, dotR = fx * cr.x + fz * cr.y;
    let dir, flip = false;
    if (Math.abs(dotF) > Math.abs(dotR)) { dir = dotF > 0 ? 2 : 0; }
    else { dir = 1; flip = dotR > 0; }
    this.dir = dir; this.flip = flip;
  }
  moveBy(dx, dz, dt, run) {
    const l = Math.hypot(dx, dz); if (l < 1e-4) { this.moving = false; return; }
    dx /= l; dz /= l; this.facing.set(dx, dz);
    let sp = this.speed * (run ? 1.6 : 1) * (this.sneak ? 0.55 : 1);
    const depth = this.world.depthAt(this.x, this.z); if (depth > 0.15) sp *= Math.max(0.3, 1 - depth * 1.2);
    const nx = this.x + dx * sp * dt, nz = this.z + dz * sp * dt;
    // 轴分离碰撞
    const r = 0.28; let moved = false;
    if (this.canStand(nx, this.z, r)) { this.x = nx; moved = true; }
    if (this.canStand(this.x, nz, r)) { this.z = nz; moved = true; }
    this.moving = moved; this.blocked = !moved;
    if (moved) { this.stepT += sp * dt; if (this.stepT > 0.9) { this.stepT = 0; if (this.onStep) this.onStep(this); } }
  }
  canStand(x, z, r) {
    const w = this.world;
    const pts = [[x - r, z - r], [x + r, z - r], [x - r, z + r], [x + r, z + r]];
    for (const [px, pz] of pts) if (!w.walkable(px, pz)) return false;
    // 坡度过陡不可上（墙体用高差挡）
    const gh = w.groundAt(x, z); if (Math.abs(gh - this.y) > 1.1) return false;
    return true;
  }
  goTo(tx, tz, cb) {
    const p = findPath(this.world, this.x, this.z, tx, tz);
    if (!p) { this.path = null; if (cb) cb(false); return false; }
    // 最后一点用精确目标
    if (p.length) p[p.length - 1] = [tx, tz];
    this.path = p; this.pathI = 0; this.onArrive = cb || null; return true;
  }
  stop() { this.path = null; this.moving = false; }
  followPath(dt, run) {
    if (!this.path) return false;
    if (this.pathI >= this.path.length) { this.path = null; this.moving = false; const cb = this.onArrive; this.onArrive = null; if (cb) cb(true); return false; }
    const [tx, tz] = this.path[this.pathI];
    const dx = tx - this.x, dz = tz - this.z; const d = Math.hypot(dx, dz);
    if (d < 0.12) { this.pathI++; return true; }
    const before = [this.x, this.z];
    this.moveBy(dx, dz, dt, run);
    if (!this.moving || (Math.hypot(this.x - before[0], this.z - before[1]) < 1e-4)) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 0.6) { this.stuck = 0; this.pathI++; } } else this.stuck = 0;
    return true;
  }
  update(dt, camYaw) {
    const gh = this.world.groundAt(this.x, this.z);
    this.y += (gh - this.y) * Math.min(1, dt * 14);
    this.depth = this.world.depthAt(this.x, this.z);
    // 动画
    if (this.moving) { this.animT += dt * (this.sneak ? 5 : 8); this.frame = 1 + (Math.floor(this.animT) % 2); }
    else { this.frame = 0; this.animT = 0; }
    this.updateSpriteDir(camYaw);
    this.setFrame(this.dir, this.frame, this.flip);
    // 水深：下沉
    const sink = Math.min(this.depth * 0.9, 0.9);
    this.mesh.position.set(this.x, this.y - sink + (this.moving ? Math.abs(Math.sin(this.animT * Math.PI)) * 0.04 : 0), this.z);
    this.mesh.visible = this.visible;
    if (this.ghost) { this.ghost.position.copy(this.mesh.position); this.ghost.quaternion.copy(this.mesh.quaternion); this.ghost.visible = this.visible && !!this.opts.ghost; }
  }
  dist(o) { return Math.hypot(this.x - o.x, this.z - o.z); }
  faceTo(o) { const dx = o.x - this.x, dz = o.z - this.z; const l = Math.hypot(dx, dz); if (l > 0.01) this.facing.set(dx / l, dz / l); }
}

// 所有实体绕 Y 轴朝向相机（保持竖直，不会斜着插进墙里）
export function orientSprites(entities, camYaw) { for (const e of entities) e.mesh.rotation.set(0, camYaw, 0); }
