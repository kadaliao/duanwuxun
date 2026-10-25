// 游戏主循环与场景装配（v2：手绘场景）。
import * as THREE from 'three';
import { Renderer } from '../engine/renderer.js';
import { SceneView } from '../engine/scene.js';
import { Weather } from '../engine/weather.js';
import { Input } from '../engine/input.js';
import { Entity } from '../engine/entities.js';
import { Audio } from '../engine/audio.js';
import { SCENES, SPOTS, sceneRoute } from './scenes/index.js';
import { UI } from './ui.js';
import { State } from './state.js';
import { Clock } from './clock.js';
import { Director } from './director.js';
import { Flood } from './flood.js';

const GROUND_KIND = { stone: 3, mud: 1, grass: 0, wood: 7, earth: 1 };
export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas; this.uiRoot = uiRoot;
    this.r = new Renderer(canvas);
    this.input = new Input(canvas);
    this.weather = new Weather(this.r);
    this.audio = new Audio();
    this.weather.thunderCb = (d) => this.audio.thunder(d);
    this.views = {}; for (const [id, def] of Object.entries(SCENES)) this.views[id] = new SceneView(this, { id, ...def });
    this.sceneId = null; this.view = null; this.exitArmed = false;
    this.entities = []; this.npcs = new Map();
    this.state = new State();
    this.clock = new Clock(this);
    this.ui = new UI(this);
    this.flood = new Flood(this);
    this.director = new Director(this);
    this.paused = false; this.t = 0; this.last = performance.now(); this.interactCooldown = 0; this.timeScale = 1; this.hour = 9; this.dark = 0;
    this.lightsOn = 0; this.cinematicCam = false; this.switching = false;
  }
  // ───── 场景 ─────
  async goScene(id, x, y, { snap = true, fade = true } = {}) {
    const view = this.views[id]; if (!view) { console.error('no scene', id); return; }
    const from = this.sceneId;
    if (fade && from) await this.ui.fadeOut(350);
    this.switching = true;
    await view.load();
    if (this.view) { this.r.scene.remove(this.view.group); this.r.lightScene.remove(this.view.lightGroup); for (const e of this.entities) if (e.scene === from) this.r.scene.remove(e.group); }
    this.sceneId = id; this.view = view; this.r.bounds = [view.W, view.H];
    this.r.scene.add(view.group); this.r.lightScene.add(view.lightGroup);
    if (this.player) { this.player.scene = id; if (x != null) { this.player.x = x; this.player.y = y; } this.player.path = null; this.player.moving = false; for (const f of this.director.followers) { if (f.dead || f.arrived) continue; f.scene = id; f.x = this.player.x + (Math.random() - 0.5) * 80; f.y = this.player.y + 20 + Math.random() * 30; f.path = null; } }
    for (const e of this.entities) if (e.scene === id) { this.r.scene.add(e.group); e.update(0); }
    view.setLights(this.lightsOn, this.t); this.flood.applyScene(view);
    if (this.player) this.r.follow(this.player.x, this.player.y - view.charH(this.player.y) * 0.4, true);
    this.exitArmed = false; this.switching = false;
    this.director.onScene(id, from);
    this.ui.setPlace(view.def.name || '');
    if (fade && from) await this.ui.fadeIn(450);
  }
  spawnPlayer(scene, x, y) {
    const p = new Entity(this, 'player', { x, y, scene, name: '程知白', id: 'player', speed: 1.05, ghost: true });
    p.onStep = () => this.audio.step(GROUND_KIND[this.view?.def.ground] ?? 0, p.depth);
    this.player = p; this.addEntity(p); return p;
  }
  addEntity(e) { this.entities.push(e); if (e.scene === this.sceneId) this.r.scene.add(e.group); e.update(0); return e; }
  removeEntity(e) { const i = this.entities.indexOf(e); if (i >= 0) this.entities.splice(i, 1); this.r.scene.remove(e.group); }
  addNPC(id, lookId, scene, x, y, name, opts = {}) {
    const e = new Entity(this, lookId, Object.assign({ x, y, scene, name, id, speed: 0.6 }, opts));
    e.npc = true; e.look = lookId; this.npcs.set(id, e); this.addEntity(e); return e;
  }
  npc(id) { return this.npcs.get(id); }
  // ───── 主循环 ─────
  start() {
    this.director.boot();
    const loop = () => { requestAnimationFrame(loop); const now = performance.now(); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.frame(dt); };
    loop();
  }
  frame(dt) {
    this.t += dt; const ui = this.ui; const modal = ui.modal;
    if (!modal && !this.paused && !this.switching && this.view) {
      this.director.update(dt); this.clock.update(dt); this.updatePlayer(dt);
      for (const e of this.entities) { if (e.scene !== this.sceneId) continue; if (e !== this.player) { if (e.ai) e.ai(dt); else e.followPath(dt); } e.update(dt); }
      this.flood.update(dt);
    } else if (this.view) { for (const e of this.entities) if (e.scene === this.sceneId) e.update(0); }
    if (this.input.hit('m') && !ui.modal) ui.toggleBigMap();
    if (this.input.wheelDelta && this.view) { this.r.viewW = THREE.MathUtils.clamp(this.r.viewW + this.input.wheelDelta * 160, 1300, Math.min(3200, this.view.W)); }
    if (this.player && !this.cinematicCam && this.view) this.r.follow(this.player.x, this.player.y - this.view.charH(this.player.y) * 0.4);
    this.r.update(dt, this.t);
    if (this.view) { this.view.update(this.t, this.weather.intensity, this.r.grade.uniforms.uNight.value); this.view.setLights(this.lightsOn, this.t); this.updateLantern(); }
    this.weather.update(dt, this.t);
    this.audio.update(dt, this);
    ui.update(dt);
    this.r.render();
    this.input.endFrame();
  }
  // 玩家手里的灯笼（夜里亮）
  updateLantern() {
    const v = this.view, p = this.player; if (!v || !p) return;
    if (!v.lantern) { v.lantern = v.addLight({ x: 0, y: 0, r: 150, color: 0xffb870, a: 0.75, glow: false }); v.lantern.userData.flicker = true; }
    const l = v.lantern; const on = p.visible && !p.boatMode ? 1 : 0.5; l.userData.off = !on; const h = p.h;
    l.position.set(p.x, -p.y + h * 0.45, 1); const rr = 150 * v.k * (p.sneak ? 0.6 : 1) * (0.9 + 0.1 * Math.sin(this.t * 5.3)); l.scale.set(rr * 2, rr * 2, 1);
  }
  applyTime(hour, dark) {
    this.hour = hour; this.dark = dark;
    const { lightsOn } = this.r.setTime(hour, dark); this.lightsOn = lightsOn;
  }
  updatePlayer(dt) {
    const p = this.player; if (!p) return;
    if (p.locked) { if (p.path) p.followPath(dt); else p.moving = false; return; }
    const inp = this.input; const { dx, dz, run } = inp.axis();
    p.sneak = inp.down('control') || inp.down('c');
    if (dx || dz) { p.path = null; p.moveBy(dx, dz, dt, run); }
    else if (p.path) p.followPath(dt, run);
    else p.moving = false;
    if (inp.mouse.clicked && !this.ui.pointerOnUI) {
      const pt = this.r.toScene(inp.mouse.x, inp.mouse.y);
      const ent = this.pickEntity(pt.x, pt.y);
      if (ent && ent.interact) this.walkToAndInteract(ent);
      else { const hs = this.pickHotspot(pt.x, pt.y); if (hs) this.walkToAndInteract(hs); else { const tgt = this.view.nav.nearestWalkable(pt.x, pt.y, 400); if (tgt) { p.goTo(tgt[0], tgt[1]); this.ui.clickMarker(tgt[0], tgt[1]); } } }
    }
    if (this.interactCooldown > 0) { this.interactCooldown -= dt; inp.hit('space'); inp.hit('enter'); inp.hit('f'); }
    else if (inp.hit('space') || inp.hit('enter') || inp.hit('f')) { const tgt = this.nearestInteractable(); if (tgt) this.director.interact(tgt); }
    if (inp.hit('g')) this.director.useGong();
    // 出口
    const ex = this.view.exitAt(p.x, p.y);
    if (!ex) this.exitArmed = true;
    else if (this.exitArmed && !this.director.busy && !this.director.exitsLocked) { this.exitArmed = false; this.useExit(ex); }
  }
  async useExit(ex) {
    if (ex.cond && !ex.cond(this)) { this.exitArmed = true; return; }
    const target = SCENES[ex.to]; const k = this.views[ex.to].k;
    const at = ex.at ? [ex.at[0] * k, ex.at[1] * k] : (target.spots && target.spots.enter ? [target.spots.enter[0] * k, target.spots.enter[1] * k] : [this.views[ex.to].W / 2, this.views[ex.to].H * 0.8]);
    this.player.locked = true;
    await this.goScene(ex.to, at[0], at[1]);
    if (ex.face) this.player.facing.set(ex.face[0], ex.face[1]);
    this.player.locked = false;
  }
  walkToAndInteract(ent) {
    const p = this.player; const d = p.dist(ent); const reach = this.view.charH(p.y) * 0.55;
    if (d < reach) { this.director.interact(ent); return; }
    const dx = ent.x - p.x, dy = ent.y - p.y, l = Math.hypot(dx, dy); const tx = ent.x - dx / l * reach * 0.6, ty = ent.y - dy / l * reach * 0.6;
    const tgt = this.view.nav.nearestWalkable(tx, ty, 300); if (!tgt) return;
    p.goTo(tgt[0], tgt[1], (ok) => { if (ok && p.dist(ent) < reach * 1.5) this.director.interact(ent); });
  }
  nearestInteractable() {
    const p = this.player; if (!p || !this.view) return null; let best = null, bd = this.view.charH(p.y) * 0.65;
    for (const e of this.entities) { if (e === p || !e.interact || !e.visible || e.scene !== this.sceneId) continue; const d = e.dist(p); if (d < bd) { bd = d; best = e; } }
    for (const h of this.director.hotspots) { if (h.scene !== this.sceneId || !h.active()) continue; const d = Math.hypot(h.x - p.x, (h.y - p.y) * 1.3); if (d < h.r && d < bd + h.r * 0.5) { bd = d; best = h; } }
    return best;
  }
  pickEntity(x, y) {
    let best = null, by = -1;
    for (const e of this.entities) { if (e === this.player || !e.visible || e.scene !== this.sceneId) continue; const h = e.h, w = h * (e.look ? e.look.cw / e.look.ch : 0.4); if (x > e.x - w / 2 && x < e.x + w / 2 && y < e.y && y > e.y - h && e.y > by) { by = e.y; best = e; } }
    return best;
  }
  pickHotspot(x, y) { for (const h of this.director.hotspots) if (h.scene === this.sceneId && h.active() && Math.hypot(h.x - x, h.y - y) < h.r) return h; return null; }
  // 场景坐标 → 屏幕（h：脚底以上的像素高度）
  toScreen(x, y, h = 0) { const s = this.r.toScreen(x, y - h); const W = window.innerWidth, H = window.innerHeight; return { x: s.x, y: s.y, behind: s.x < -200 || s.x > W + 200 || s.y < -200 || s.y > H + 200 }; }
}
