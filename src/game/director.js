// 导演：开场、天数流程、NPC 布置、热点、互动分发。剧情内容在 script/ 下。
// 位置写法：'spotName' | [scene, x, y]（作者坐标，1536 底图像素） | {scene,x,y}
import { Entity } from '../engine/entities.js';
import { CHARS } from './chars.js';
import { SCRIPT } from './script/index.js';
import { Stealth } from './script/stealth.js';
import { SPOTS, SCENES, sceneRoute } from './scenes/index.js';
import { preloadLooks } from '../engine/sprites.js';

export class Director {
  constructor(game) {
    this.g = game; this.hotspots = []; this.timeNote = ''; this.countdown = null; this.danger = false; this.busy = false;
    this.followers = []; this.phase = 'title'; this.triggers = []; this.stealth = new Stealth(this); this.exitsLocked = false; this.sceneHooks = [];
  }
  // 位置解析 → {scene, x, y}（场景像素）
  pos(p, dx = 0, dy = 0) {
    let scene, x, y;
    if (typeof p === 'string') { const s = SPOTS[p]; if (!s) throw new Error('no spot ' + p); [scene, x, y] = s; }
    else if (Array.isArray(p)) [scene, x, y] = p;
    else { scene = p.scene; x = p.x; y = p.y; if (p.px) return { scene, x: x + dx, y: y + dy }; }
    const k = this.g.views[scene].k; return { scene, x: (x + dx) * k, y: (y + dy) * k };
  }
  trigger(id, p, r, fn, { cond = () => true, once = true } = {}) { const q = this.pos(p); this.triggers.push({ id, scene: q.scene, x: q.x, y: q.y, r: r * 2, fn, cond, once, fired: false }); }
  removeTrigger(id) { this.triggers = this.triggers.filter(t => t.id !== id); }
  boot() {
    const g = this.g;
    g.settings = Object.assign({ music: true, volume: 0.8, textSpeed: 1 }, JSON.parse(localStorage.getItem('dwx2_settings') || '{}'));
    g.applySettings = () => { localStorage.setItem('dwx2_settings', JSON.stringify(g.settings)); g.audio.musicOn = g.settings.music; g.audio.volume = g.settings.volume; if (g.audio.master) g.audio.master.gain.value = g.settings.volume; };
    g.applySettings();
    g.hasSave = () => !!localStorage.getItem('dwx2_save');
    g.save = () => { localStorage.setItem('dwx2_save', JSON.stringify({ state: g.state.toJSON(), day: this.day, hour: g.clock.hour, phase: this.phase, scene: g.sceneId, px: g.player?.x, py: g.player?.y, ver: 2 })); };
    g.load = async () => { const s = JSON.parse(localStorage.getItem('dwx2_save') || 'null'); if (!s) return; await this.preload(); g.state.load(s.state); if (s.phase === 'night') { this.day = 4; g.ui.showHUD(true); if (!g.player) g.spawnPlayer('town', 0, 0); g.r.fade(1); this.startNight(); return; } await this.startDay(s.day, { hour: s.hour, scene: s.scene, px: s.px, py: s.py, loaded: true }); };
    g.clock.set(9); g.applyTime(9, 0);
    g.ui.showTitle({ canContinue: g.hasSave(), onStart: () => this.newGame(), onContinue: () => g.load() });
  }
  preload() { const looks = new Set(['player', 'boat', 'soldier_torch', 'villager_m', 'villager_m2', 'villager_f', 'villager_f2', 'villager_old', 'villager_child', 'qijun']); for (const c of Object.values(CHARS)) if (c.look) looks.add(c.look); return preloadLooks([...looks]).then(() => Promise.all(Object.values(this.g.views).map(v => v.load()))); }
  async newGame() {
    const g = this.g; g.state.reset(); this.preload();
    await SCRIPT.intro(this);
    await this.startDay(1, {});
  }
  // ───── 一天的流程 ─────
  async startDay(day, { hour, scene, px, py, loaded } = {}) {
    const g = this.g; this.day = day; g.state.set('day', day); this.phase = 'day'; g.cinematicCam = false;
    g.ui.showHUD(true); this.clearNPCs(); g.flood.stop();
    const start = this.pos('innDoor');
    if (!g.player) g.spawnPlayer(scene || start.scene, px ?? start.x, py ?? start.y);
    g.player.locked = false; g.player.visible = true;
    const names = { 1: '端午前三日', 2: '端午前二日', 3: '端午前一日', 4: '端午' };
    g.ui.setDay(names[day] || '');
    g.clock.rate = 2 / 65; g.clock.set(hour ?? 7.5); g.clock.running = true; g.clock.dark = day === 4 ? 0.5 : 0;
    g.clock.onShichen = (sc, h) => this.onShichen(sc, h);
    g.weather.set(day === 4 ? 0.4 : day === 3 ? 0.15 : 0, false); g.weather.fog = 0.2 + day * 0.06;
    g.audio.setMood(day === 4 ? 'tense' : 'day');
    await SCRIPT.setupDay(this, day, loaded);
    g.ui.refreshQuests(); this.refreshStats();
    await g.goScene(scene || start.scene, px ?? start.x, py ?? start.y, { fade: false });
    this.setAmbience();
    if (!loaded) g.save();
    await g.ui.fadeIn(900);
  }
  setAmbience() { const g = this.g; const h = g.clock.hour; const night = h < 6 || h > 18.5; const amb = g.view?.def.ambience || {}; g.audio.setAmbience({ rain: g.weather.intensity, wind: 0.3 + g.weather.intensity * 0.7, crickets: night && !g.weather.intensity ? 1 : 0, river: amb.river ?? 0.2 }); }
  onScene(id, from) { this.setAmbience(); for (const h of this.sceneHooks) h(id, from); }
  onShichen(sc, h) {
    const g = this.g; if (this.phase === 'day') { g.audio.drum(2); g.ui.banner(sc + '时', ''); }
    if (this.phase === 'day' && h >= 21 && h < 23) this.endDay();
  }
  async endDay() {
    const g = this.g; if (this.dayEnding) return; this.dayEnding = true; g.clock.running = false;
    g.player.locked = true; this.keepLocked = true;
    await SCRIPT.endDay(this, this.day);
    this.dayEnding = false; this.keepLocked = false;
    if (this.day < 3) this.startDay(this.day + 1, {}); else this.startNight();
  }
  async startNight() { const g = this.g; this.phase = 'night'; g.player.locked = false; await SCRIPT.night(this); }
  refreshStats() {
    const v = this.g.state.vars;
    const list = [{ k: '村民信任', v: '●'.repeat(Math.max(0, Math.min(5, v.trust))) + '○'.repeat(Math.max(0, 5 - v.trust)) }];
    if (v.xian > 0) list.push({ k: '树敌', v: '●'.repeat(Math.min(5, v.xian)), red: true });
    if (this.phase === 'night') list.push({ k: '上山的人', v: String(v.huomin) });
    this.g.ui.setStats(list);
  }
  // ───── NPC / 热点 ─────
  clearNPCs() { const g = this.g; for (const e of [...g.entities]) if (e !== g.player) g.removeEntity(e); g.npcs.clear(); this.hotspots = []; this.followers = []; this.triggers = []; this.sceneHooks = []; this.stealth.stop(); this.tick = null; for (const [k, lb] of g.ui.labelMap) lb.el.remove(); g.ui.labelMap.clear(); }
  place(id, p, { look, name, talk, label, face, wander, speed, scale } = {}) {
    const g = this.g; const c = CHARS[id] || {}; const q = this.pos(p);
    const e = g.addNPC(id, look || c.look || 'villager_m', q.scene, q.x, q.y, name || c.name || id, { speed, scale });
    e.interact = talk ? () => talk(e) : null; e.label = label || e.name; e.home = [q.x, q.y];
    if (face) e.facing.set(face[0], face[1]);
    if (wander) e.ai = makeWander(e, wander);
    return e;
  }
  move(e, p) { const q = this.pos(p); e.scene = q.scene; e.x = q.x; e.y = q.y; e.path = null; e.home = [q.x, q.y]; if (q.scene === this.g.sceneId) { if (!e.group.parent) this.g.r.scene.add(e.group); } else this.g.r.scene.remove(e.group); }
  npc(id) { return this.g.npc(id); }
  hotspot(id, p, label, verb, fn, { r = 60, active = () => true, h = 1.0 } = {}) { const q = this.pos(p); const hs = { id, scene: q.scene, x: q.x, y: q.y, label, verb, interact: fn, r: r * 2, active, labelH: h }; this.hotspots.push(hs); return hs; }
  removeHotspot(id) { this.hotspots = this.hotspots.filter(h => h.id !== id); }
  async interact(tgt) {
    if (this.busy || !tgt.interact) return; this.busy = true;
    const g = this.g; g.player.stop();
    if (tgt instanceof Entity) { tgt.faceTo(g.player); g.player.faceTo(tgt); tgt.stop(); tgt.talking = true; }
    g.player.locked = true;
    try { await tgt.interact(tgt); } catch (e) { console.error(e); }
    if (tgt instanceof Entity) tgt.talking = false;
    if (!this.keepLocked) g.player.locked = false;
    g.ui.closeDialogue(); this.busy = false; g.ui.refreshQuests(); this.refreshStats();
  }
  onSubtext(flag, shown, sub, node) {
    const g = this.g; const st = g.state; const CLUES = SCRIPT.clues;
    if (CLUES[flag]) { if (st.addClue(Object.assign({ id: flag }, CLUES[flag]))) { g.ui.toast('<b>记下</b>' + CLUES[flag].title, 'dark'); st.flag(flag); } }
    else st.flag(flag);
  }
  // ───── 对话辅助 ─────
  async say(who, text, opts = {}) { return this.g.ui.say(Object.assign({ who, text }, opts)); }
  async narr(text) { return this.g.ui.say({ who: 'narr', text }); }
  async think(text) { return this.g.ui.say({ who: 'narr', text, thought: true }); }
  async choose(who, text, choices, opts = {}) { const i = await this.g.ui.say(Object.assign({ who, text, choices }, opts)); return choices[i]?.id ?? i; }
  quest(id, title, desc, target) { if (this.g.state.quest(id, title, desc, target)) { this.g.ui.toast('<b>要事</b>' + title); this.g.ui.refreshQuests(); this.g.state.tracked = id; } }
  target(id, target) { this.g.state.setTarget(id, target); }
  // 要事目标 → {scene,x,y,h}；在别的场景时指向通往那里的出口
  resolveTarget(t) {
    const g = this.g; if (!t) return null; let q = null, h = 1.2;
    if (t.npc) { const e = g.npc(t.npc); if (!e || !e.visible) return null; q = { scene: e.scene, x: e.x, y: e.y }; h = 1.25; }
    else if (t.hs) { const hs = this.hotspots.find(h => h.id === t.hs && h.active()); if (!hs) return null; q = { scene: hs.scene, x: hs.x, y: hs.y }; h = 0.9; }
    else if (t.spot) { q = this.pos(t.spot); }
    else if (t.scene) { q = this.pos(t); }
    if (!q) return null;
    if (q.scene === g.sceneId) return { x: q.x, y: q.y, h: g.view.charH(q.y) * h, far: false };
    const route = sceneRoute(g.sceneId, q.scene); if (!route || !route.length) return null;
    const ex = g.view.exits.find(e => e.to === route[0]); if (!ex) return null;
    const cx = ex.poly.reduce((n, p) => n + p[0], 0) / ex.poly.length, cy = ex.poly.reduce((n, p) => n + p[1], 0) / ex.poly.length;
    return { x: cx, y: cy, h: 40, far: true, via: SCENES[route[0]].name };
  }
  trackedQuest() { const st = this.g.state; const qs = Object.values(st.quests).filter(q => !q.done); if (!qs.length) return null; return qs.find(q => q.id === st.tracked) || qs[qs.length - 1]; }
  done(id) { const q = this.g.state.quests[id]; if (this.g.state.done(id)) { q.doneAt = Date.now(); if (this.g.state.tracked === id) this.g.state.tracked = null; this.g.ui.toast('<b>了结</b>' + q.title, 'dark'); this.g.ui.refreshQuests(); this.g.audio.chime(); } }
  ledger(id, kind, who, text) { if (this.g.state.addLedger({ id, kind, who, text })) this.g.ui.toast(`<b>暗账 · ${kind}</b>${who}`, 'red'); }
  clue(id) { const c = SCRIPT.clues[id]; if (c && this.g.state.addClue(Object.assign({ id }, c))) { this.g.ui.toast('<b>记下</b>' + c.title, 'dark'); this.g.state.flag(id); } }
  item(id, name) { this.g.state.give(id); this.g.ui.toast('<b>得到</b>' + name, 'dark'); }
  meet(id) { if (this.g.state.meet(id)) { const c = CHARS[id]; if (c && c.pan) this.g.ui.toast(`<b>初见</b>${c.name}`, ''); } }
  trust(n) { const v = this.g.state.add('trust', n); this.g.ui.toast(n > 0 ? '<b>信任</b>村民更信你了' : '<b>信任</b>村民看你的眼神变了', n > 0 ? 'dark' : 'red'); this.refreshStats(); return v; }
  pass(hours) { this.g.clock.hour += hours; this.g.clock.apply(); }
  // 过场相机：看向某处（同场景）
  async lookAt(p, dur = 1.5) { const g = this.g; const q = this.pos(p); g.cinematicCam = true; g.r.follow(q.x, q.y); await wait(dur * 1000); }
  releaseCam() { this.g.cinematicCam = false; }
  // 把玩家放到某处（可换场景）
  async teleport(p, { fade = true } = {}) { const g = this.g; const q = this.pos(p); if (q.scene !== g.sceneId) await g.goScene(q.scene, q.x, q.y, { fade }); else { g.player.x = q.x; g.player.y = q.y; g.player.path = null; g.r.follow(q.x, q.y - g.view.charH(q.y) * 0.4, true); } }
  update(dt) {
    const g = this.g;
    if (this.tick) this.tick(dt);
    this.stealth.update(dt);
    if (g.player && !this.busy && !g.ui.modal) for (const t of this.triggers) { if (t.fired && t.once) continue; if (t.scene !== g.sceneId || !t.cond()) continue; if (Math.hypot(g.player.x - t.x, (g.player.y - t.y) * 1.3) < t.r) { t.fired = true; this.busy = true; g.player.stop(); Promise.resolve(t.fn()).catch(e => console.error(e)).finally(() => { this.busy = false; g.ui.closeDialogue(); g.ui.refreshQuests(); this.refreshStats(); }); break; } }
    for (const f of this.followers) {
      if (f.dead || f.arrived || f.scene !== g.sceneId) continue;
      const leader = f.leader || g.player; const d = f.dist(leader); const near = g.view.charH(f.y) * 0.9;
      if (d > near) { if (!f.path || f.repathT <= 0) { f.goTo(leader.x + (Math.random() - 0.5) * 60, leader.y + (Math.random() - 0.5) * 40); f.repathT = 0.6; } f.repathT -= dt; }
      else { f.path = null; f.moving = false; }
    }
  }
  useGong() { if (SCRIPT.useGong) SCRIPT.useGong(this); }
}
export const wait = (ms) => new Promise(r => setTimeout(r, ms));
function makeWander(e, { r = 120, pause = 2 }) {
  let t = Math.random() * pause;
  return (dt) => {
    if (e.path) { e.followPath(dt); return; }
    if (e.talking) { e.moving = false; return; }
    t -= dt; if (t <= 0) { t = pause + Math.random() * pause * 2; const [hx, hy] = e.home; const tx = hx + (Math.random() - 0.5) * r * 2, ty = hy + (Math.random() - 0.5) * r; const v = e.sceneView; if (v && v.nav.walkable(tx, ty)) e.goTo(tx, ty); }
    else e.moving = false;
  };
}
