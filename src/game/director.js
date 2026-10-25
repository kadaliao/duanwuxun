// 导演：开场、天数流程、NPC 布置、热点、互动分发。剧情内容在 script/ 下。
import { Entity } from '../engine/entities.js';
import { CHARS } from './chars.js';
import { SCRIPT } from './script/index.js';
import { Stealth } from './script/stealth.js';

export class Director {
  constructor(game) {
    this.g = game; this.hotspots = []; this.timeNote = ''; this.countdown = null; this.danger = false; this.busy = false;
    this.followers = []; this.phase = 'title'; this.triggers = []; this.stealth = new Stealth(this);
  }
  trigger(id, x, z, r, fn, { cond = () => true, once = true } = {}) { this.triggers.push({ id, x, z, r, fn, cond, once, fired: false }); }
  removeTrigger(id) { this.triggers = this.triggers.filter(t => t.id !== id); }
  boot() {
    const g = this.g;
    g.settings = Object.assign({ music: true, volume: 0.8, textSpeed: 1, tilt: 0.55 }, JSON.parse(localStorage.getItem('dwx_settings') || '{}'));
    g.applySettings = () => { localStorage.setItem('dwx_settings', JSON.stringify(g.settings)); g.audio.musicOn = g.settings.music; g.audio.volume = g.settings.volume; if (g.audio.master) g.audio.master.gain.value = g.settings.volume; g.r.final.uniforms.uTilt.value = g.settings.tilt; };
    g.applySettings();
    g.hasSave = () => !!localStorage.getItem('dwx_save');
    g.save = () => { localStorage.setItem('dwx_save', JSON.stringify({ state: g.state.toJSON(), day: this.day, hour: g.clock.hour, phase: this.phase, px: g.player?.x, pz: g.player?.z, ver: 1 })); };
    g.load = () => { const s = JSON.parse(localStorage.getItem('dwx_save') || 'null'); if (!s) return; g.state.load(s.state); if (s.phase === 'night') { this.day = 4; g.cinematicCam = false; this.titlePan = false; g.ui.showHUD(true); if (!g.player) g.spawnPlayer(g.map.spots.innDoor[0], g.map.spots.innDoor[1]); g.r.fade(1); this.startNight(); return; } this.startDay(s.day, { hour: s.hour, px: s.px, pz: s.pz, loaded: true }); };
    g.clock.set(9);
    g.applyTime(9, 0);
    g.ui.showTitle({ canContinue: g.hasSave(), onStart: () => this.newGame(), onContinue: () => g.load() });
    // 标题画面：相机慢慢扫过村子
    g.r.follow(34, 0.3, 44, true); g.cinematicCam = true;
    this.titlePan = true;
  }
  async newGame() {
    const g = this.g; g.state.reset(); this.titlePan = false;
    await SCRIPT.intro(this);
    this.startDay(1, {});
  }
  // ───── 一天的流程 ─────
  async startDay(day, { hour, px, pz, loaded } = {}) {
    const g = this.g; this.day = day; g.state.set('day', day); this.phase = 'day';
    g.cinematicCam = false; this.titlePan = false;
    g.ui.showHUD(true);
    this.clearNPCs();
    if (!g.player) g.spawnPlayer(px ?? g.map.spots.innDoor[0], pz ?? g.map.spots.innDoor[1]);
    else { g.player.x = px ?? g.map.spots.innDoor[0]; g.player.z = pz ?? g.map.spots.innDoor[1]; g.player.path = null; g.r.follow(g.player.x, g.player.y, g.player.z, true); }
    g.player.locked = false; g.player.visible = true;
    g.flood.active = false;
    const names = { 1: '端午前三日', 2: '端午前二日', 3: '端午前一日', 4: '端午' };
    g.ui.setDay(names[day] || '');
    g.clock.rate = 2 / 65; g.clock.set(hour ?? 7.5); g.clock.running = true; g.clock.dark = day === 4 ? 0.5 : 0;
    g.clock.onShichen = (sc, h) => this.onShichen(sc, h);
    g.weather.set(day === 4 ? 0.4 : 0, false);
    g.audio.setMood(day === 4 ? 'tense' : 'day');
    this.setAmbience();
    await SCRIPT.setupDay(this, day, loaded); this.placeLabels();
    g.ui.refreshQuests(); this.refreshStats();
    if (!loaded) g.save();
    await g.ui.fadeIn(900);
  }
  setAmbience() { const g = this.g; const h = g.clock.hour; const night = h < 6 || h > 18.5; g.audio.setAmbience({ rain: g.weather.intensity, wind: 0.3 + g.weather.intensity * 0.7, crickets: night && !g.weather.intensity ? 1 : 0, river: g.world.zoneAt(g.player?.x || 0, g.player?.z || 0) === 2 || g.world.zoneAt(g.player?.x || 0, g.player?.z || 0) === 7 ? 1 : 0.3 }); }
  onShichen(sc, h) {
    const g = this.g; if (this.phase === 'day') { g.audio.drum(2); g.ui.banner(sc + '时', ''); }
    if (this.phase === 'day' && h >= 21 && h < 23) this.endDay();
  }
  async endDay() {
    const g = this.g; if (this.dayEnding) return; this.dayEnding = true; g.clock.running = false;
    g.player.locked = true; this.keepLocked = true;
    await SCRIPT.endDay(this, this.day);
    this.dayEnding = false; this.keepLocked = false;
    if (this.day < 3) this.startDay(this.day + 1, {});
    else this.startNight();
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
  clearNPCs() { const g = this.g; for (const e of [...g.entities]) if (e !== g.player) g.removeEntity(e); g.npcs.clear(); this.hotspots = []; this.followers = []; this.triggers = []; this.stealth.stop(); this.tick = null; for (const [k, lb] of g.ui.labelMap) { lb.el.remove(); } g.ui.labelMap.clear(); }
  place(id, x, z, { look, name, talk, label, face, idle, wander, speed } = {}) {
    const g = this.g; const c = CHARS[id] || {}; const e = g.addNPC(id, look || c.look || 'villager_m', x, z, name || c.name || id, { speed });
    e.interact = talk ? () => talk(e) : null; e.label = label || e.name; e.home = [x, z];
    if (face) e.facing.set(face[0], face[1]);
    if (wander) e.ai = makeWander(e, wander);
    return e;
  }
  npc(id) { return this.g.npc(id); }
  hotspot(id, x, z, label, verb, fn, { r = 1.8, active = () => true, h = 1.2 } = {}) { const hs = { id, x, z, label, verb, interact: fn, r, active, labelH: h, y: this.g.world.groundAt(x, z) }; this.hotspots.push(hs); return hs; }
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
  // 听音：潜台词被点开
  onSubtext(flag, shown, sub, node) {
    const g = this.g; const st = g.state;
    const CLUES = SCRIPT.clues;
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
  // 把要事的目标解析成世界坐标：{npc:'id'} | {hs:'id'} | {spot:'name'} | {x,z}
  resolveTarget(t) {
    const g = this.g; if (!t) return null;
    if (t.npc) { const e = g.npc(t.npc); return e && e.visible ? { x: e.x, z: e.z, y: e.y + 2.2 } : null; }
    if (t.hs) { const h = this.hotspots.find(h => h.id === t.hs && h.active()); return h ? { x: h.x, z: h.z, y: h.y + 1.6 } : null; }
    if (t.spot) { const sp = g.map.spots[t.spot]; return sp ? { x: sp[0], z: sp[1], y: g.world.groundAt(sp[0], sp[1]) + 1.6 } : null; }
    if (t.x != null) return { x: t.x, z: t.z, y: g.world.groundAt(t.x, t.z) + 1.6 };
    return null;
  }
  trackedQuest() {
    const st = this.g.state; const qs = Object.values(st.quests).filter(q => !q.done);
    if (!qs.length) return null;
    return qs.find(q => q.id === st.tracked) || qs[qs.length - 1];
  }
  done(id) { const q = this.g.state.quests[id]; if (this.g.state.done(id)) { q.doneAt = Date.now(); if (this.g.state.tracked === id) this.g.state.tracked = null; this.g.ui.toast('<b>了结</b>' + q.title, 'dark'); this.g.ui.refreshQuests(); this.g.audio.chime(); } }
  ledger(id, kind, who, text) { if (this.g.state.addLedger({ id, kind, who, text })) this.g.ui.toast(`<b>暗账 · ${kind}</b>${who}`, 'red'); }
  clue(id) { const c = SCRIPT.clues[id]; if (c && this.g.state.addClue(Object.assign({ id }, c))) { this.g.ui.toast('<b>记下</b>' + c.title, 'dark'); this.g.state.flag(id); } }
  item(id, name) { this.g.state.give(id); this.g.ui.toast('<b>得到</b>' + name, 'dark'); }
  meet(id) { if (this.g.state.meet(id)) { const c = CHARS[id]; if (c && c.pan) this.g.ui.toast(`<b>初见</b>${c.name}`, ''); } }
  trust(n) { const v = this.g.state.add('trust', n); this.g.ui.toast(n > 0 ? '<b>信任</b>村民更信你了' : '<b>信任</b>村民看你的眼神变了', n > 0 ? 'dark' : 'red'); this.refreshStats(); return v; }
  // 时间推进（谈话、做事耗时）
  pass(hours) { this.g.clock.hour += hours; this.g.clock.apply(); }
  // 过场相机
  async lookAt(x, z, dur = 1.5) { const g = this.g; g.cinematicCam = true; g.r.follow(x, g.world.groundAt(x, z), z); await wait(dur * 1000); }
  releaseCam() { this.g.cinematicCam = false; }
  placeLabels() {
    const g = this.g; const L = [['县衙', 99, 43.5, 3.2], ['客栈', 82, 55.5, 3.6], ['闸口', 45.5, 19.5, 4.2], ['冯家村', 33.5, 41.5, 4.2], ['渡口', 98.5, 17, 3.6], ['龙王庙', 19, 98, 4.6], ['西门', 73, 45.5, 5.2], ['米行', 83.5, 42, 3.2]];
    for (const [name, x, z, h] of L) g.ui.label({ id: 'place_' + name, x, z, y: g.world.groundAt(x, z) }, name, 'place', h);
  }
  update(dt) {
    const g = this.g;
    if (this.titlePan) { g.r.targetGoal.x = 34 + Math.sin(g.t * 0.08) * 18; g.r.targetGoal.z = 40 + Math.cos(g.t * 0.06) * 6; }
    if (this.tick) this.tick(dt);
    this.stealth.update(dt);
    if (g.player && !this.busy && !g.ui.modal) for (const t of this.triggers) { if (t.fired && t.once) continue; if (!t.cond()) continue; if (Math.hypot(g.player.x - t.x, g.player.z - t.z) < t.r) { t.fired = true; this.busy = true; g.player.stop(); Promise.resolve(t.fn()).catch(e => console.error(e)).finally(() => { this.busy = false; g.ui.closeDialogue(); g.ui.refreshQuests(); this.refreshStats(); }); break; } }
    // 跟随者
    for (const f of this.followers) {
      if (f.dead || f.arrived) continue;
      const leader = f.leader || g.player; const d = f.dist(leader);
      if (d > 2.2) { if (!f.path || f.repathT <= 0) { f.goTo(leader.x + (Math.random() - 0.5) * 1.5, leader.z + (Math.random() - 0.5) * 1.5); f.repathT = 0.6; } f.repathT -= dt; }
      else { f.path = null; f.moving = false; }
    }
  }
  useGong() { if (SCRIPT.useGong) SCRIPT.useGong(this); }
}
export const wait = (ms) => new Promise(r => setTimeout(r, ms));
function makeWander(e, { r = 3, pause = 2 }) {
  let t = Math.random() * pause;
  return (dt) => {
    if (e.path) { e.followPath(dt); return; }
    if (e.talking) { e.moving = false; return; }
    t -= dt; if (t <= 0) { t = pause + Math.random() * pause * 2; const [hx, hz] = e.home; const tx = hx + (Math.random() - 0.5) * r * 2, tz = hz + (Math.random() - 0.5) * r * 2; if (e.world.walkable(tx, tz)) e.goTo(tx, tz); }
    else e.moving = false;
  };
}
