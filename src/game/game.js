// 游戏主循环与世界装配。
import * as THREE from 'three';
import { Renderer } from '../engine/renderer.js';
import { World } from '../engine/world.js';
import { Builder } from '../engine/buildings.js';
import { Nature } from '../engine/nature.js';
import { Weather } from '../engine/weather.js';
import { Input } from '../engine/input.js';
import { Entity, orientSprites } from '../engine/entities.js';
import { buildMap } from './map.js';
import { Audio } from '../engine/audio.js';
import { UI } from './ui.js';
import { State } from './state.js';
import { Clock } from './clock.js';
import { Director } from './director.js';
import { Flood } from './flood.js';

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas; this.uiRoot = uiRoot;
    this.r = new Renderer(canvas);
    this.input = new Input(canvas);
    this.map = buildMap();
    this.world = new World(this.map);
    this.r.scene.add(this.world.group);
    const b = new Builder(this.world);
    for (const bl of this.map.buildings) b.build(bl);
    for (const p of this.map.props) b.prop(p);
    this.builder = b; this.r.scene.add(b.finish());
    this.nature = new Nature(this.world, this.map.trees); this.r.scene.add(this.nature.group);
    this.weather = new Weather(this.r.scene, this.r);
    this.audio = new Audio();
    this.weather.thunderCb = (d) => this.audio.thunder(d);
    // 灯光（点光源，夜里亮）
    this.lamps = [];
    for (const l of this.map.lights) {
      const pl = new THREE.PointLight(l.color, 0, l.dist * 1.6, 1.8); pl.position.set(l.x, this.world.groundAt(l.x, l.z) + l.y, l.z); pl.userData = l; this.r.scene.add(pl); this.lamps.push(pl);
    }
    this.entities = []; this.npcs = new Map();
    this.state = new State();
    this.clock = new Clock(this);
    this.ui = new UI(this);
    this.flood = new Flood(this);
    this.director = new Director(this);
    this.paused = false; this.t = 0; this.last = performance.now(); this.interactCooldown = 0;
    this.camYawGoal = this.r.yaw;
    this.raycaster = new THREE.Raycaster(); this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hoverEntity = null;
    this.timeScale = 1;
  }
  spawnPlayer(x, z) {
    const p = new Entity(this.world, 'player', { x, z, name: '程知白', id: 'player', speed: 4.6, ghost: true });
    p.onStep = () => this.audio.step(this.world.kindAt(p.x, p.z), p.depth);
    this.player = p; this.addEntity(p);
    this.r.follow(x, this.world.groundAt(x, z), z, true);
    return p;
  }
  addEntity(e) { this.entities.push(e); this.r.scene.add(e.mesh); if (e.ghost) this.r.scene.add(e.ghost); e.update(0, this.r.yaw); return e; }
  removeEntity(e) { const i = this.entities.indexOf(e); if (i >= 0) this.entities.splice(i, 1); this.r.scene.remove(e.mesh); if (e.ghost) this.r.scene.remove(e.ghost); }
  addNPC(id, lookId, x, z, name, opts = {}) {
    const e = new Entity(this.world, lookId, Object.assign({ x, z, name, id, speed: 2.8 }, opts));
    e.npc = true; e.look = lookId; this.npcs.set(id, e); this.addEntity(e); return e;
  }
  npc(id) { return this.npcs.get(id); }

  start() {
    this.director.boot();
    const loop = () => {
      requestAnimationFrame(loop);
      const now = performance.now(); let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      this.frame(dt);
    };
    loop();
  }
  frame(dt) {
    this.t += dt;
    const ui = this.ui;
    const modal = ui.modal; // 对话 / 面板时世界暂停
    if (!modal && !this.paused) {
      this.director.update(dt);
      this.clock.update(dt);
      this.updatePlayer(dt);
      for (const e of this.entities) { if (e !== this.player) { if (e.ai) e.ai(dt); else e.followPath(dt); } e.update(dt, this.r.yaw); }
      this.flood.update(dt);
    } else { for (const e of this.entities) e.update(0, this.r.yaw); }
    // 相机
    if (this.input.hit('q')) this.camYawGoal += Math.PI / 2; if (this.input.hit('e')) this.camYawGoal -= Math.PI / 2;
    if (this.input.hit('m') && !this.ui.modal) this.ui.toggleBigMap();
    if (this.input.wheelDelta) { this.r.zoom = THREE.MathUtils.clamp(this.r.zoom + this.input.wheelDelta * 1.2, 7, 22); this.r.updateCamera(); }
    const dy = this.camYawGoal - this.r.yaw; if (Math.abs(dy) > 1e-4) { this.r.yaw += dy * Math.min(1, dt * 6); this.nature.faceCamera(this.r.camera.quaternion); }
    if (this.player && !this.cinematicCam) this.r.follow(this.player.x, this.player.y, this.player.z);
    this.r.update(dt, this.t);
    orientSprites(this.entities, this.r.yaw);
    if (this.natureNeedsFace) { this.nature.faceCamera(this.r.camera.quaternion); this.natureNeedsFace = false; }
    this.world.update(this.t);
    this.nature.update(this.t, this.weather.intensity > 0 ? 0.6 + this.weather.intensity : 0.25);
    this.weather.update(dt, this.t, this.r.target);
    this.audio.update(dt, this);
    ui.update(dt);
    this.r.render();
    this.input.endFrame();
  }
  // 光照与灯笼随时间
  applyTime(hour, dark) {
    const { lightsOn } = this.r.setTime(hour, dark);
    for (const pl of this.lamps) pl.intensity = lightsOn * pl.userData.dist * 3.2 * (pl.userData.off ? 0 : 1);
    this.builder.mats.window.emissiveIntensity = lightsOn * 1.2; this.builder.mats.lantern.emissiveIntensity = lightsOn * 2.2;
    this.world.waterUniforms.uLight.value = 0.22 + (1 - lightsOn) * 0.85;
    this.world.waterUniforms.uFog.value.copy(this.r.scene.fog.color); this.world.waterUniforms.uFogNear.value = this.r.scene.fog.near; this.world.waterUniforms.uFogFar.value = this.r.scene.fog.far;
  }
  updatePlayer(dt) {
    const p = this.player; if (!p) return;
    if (p.locked) { if (p.path) p.followPath(dt); else p.moving = false; return; }
    const inp = this.input;
    const { dx, dz, run } = inp.axis();
    p.sneak = inp.down('control') || inp.down('c');
    if (dx || dz) {
      p.path = null;
      const { forward, right } = this.r.groundAxes();
      const mx = forward.x * -dz + right.x * dx, mz = forward.z * -dz + right.z * dx;
      p.moveBy(mx, mz, dt, run);
    } else if (p.path) p.followPath(dt, run);
    else p.moving = false;
    // 点击移动
    if (inp.mouse.clicked && !this.ui.pointerOnUI) {
      const hit = this.pickGround(inp.mouse.x, inp.mouse.y);
      if (hit) { const ent = this.pickEntity(inp.mouse.x, inp.mouse.y); if (ent && ent.interact) { this.walkToAndInteract(ent); } else { p.goTo(hit.x, hit.z); this.ui.clickMarker(hit); } }
    }
    // 互动（对话刚关掉的一小段时间里不响应，免得同一下空格连着触发）
    if (this.interactCooldown > 0) { this.interactCooldown -= dt; inp.hit('space'); inp.hit('enter'); inp.hit('f'); }
    else if (inp.hit('space') || inp.hit('enter') || inp.hit('f')) { const tgt = this.nearestInteractable(); if (tgt) this.director.interact(tgt); }
    // 跟随者
    if (inp.hit('g')) this.director.useGong();
  }
  walkToAndInteract(ent) {
    const p = this.player; const d = p.dist(ent);
    if (d < 1.8) { this.director.interact(ent); return; }
    const dx = ent.x - p.x, dz = ent.z - p.z, l = Math.hypot(dx, dz); const tx = ent.x - dx / l * 1.2, tz = ent.z - dz / l * 1.2;
    p.goTo(tx, tz, (ok) => { if (ok && p.dist(ent) < 2.2) this.director.interact(ent); });
  }
  nearestInteractable() {
    let best = null, bd = 2.0;
    for (const e of this.entities) { if (e === this.player || !e.interact || !e.visible) continue; const d = e.dist(this.player); if (d < bd) { bd = d; best = e; } }
    for (const h of this.director.hotspots) { if (!h.active()) continue; const d = Math.hypot(h.x - this.player.x, h.z - this.player.z); if (d < (h.r || 1.6) && d < bd) { bd = d; best = h; } }
    return best;
  }
  pickGround(mx, my) {
    const ndc = new THREE.Vector2((mx / window.innerWidth) * 2 - 1, -(my / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.r.camera);
    const hit = this.raycaster.intersectObject(this.world.terrain, false)[0];
    if (hit) return hit.point; return null;
  }
  pickEntity(mx, my) {
    const ndc = new THREE.Vector2((mx / window.innerWidth) * 2 - 1, -(my / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.r.camera);
    const meshes = this.entities.filter(e => e !== this.player && e.visible).map(e => e.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.entity : null;
  }
  // 世界坐标 → 屏幕
  toScreen(x, y, z) { const v = new THREE.Vector3(x, y, z).project(this.r.camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, behind: v.z > 1 }; }
}
