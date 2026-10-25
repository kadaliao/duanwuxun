// 端午夜：实时。子时决堤。锣、民壮、船、村民、阿秧、腰牌、胡宗宪分洪。
import { wait } from '../director.js';
import { waitUntil } from './minigames.js';
import { HOUSE_DOORS } from './day.js';
import { ending } from './ending.js';
import { SCENES } from '../scenes/index.js';

const PER_HOUSE = 15; // 冯家村 187 口，12 户（冯家 22 口，是个大家）
export async function night(d) {
  const g = d.g, st = g.state, ui = g.ui;
  d.phase = 'night'; d.clearNPCs();
  for (const k of Object.keys(st.quests)) if (!k.startsWith('n_')) delete st.quests[k];
  g.ui.refreshQuests();
  g.weather.set(1, true); g.weather.fog = 0.35; g.clock.dark = 0.75; g.audio.setMood('tense');
  g.ui.setDay('端午夜');
  const knew = st.get('knew');
  const startHour = knew === 2 ? 17.6 : knew === 1 ? 19.6 : 21.4;
  g.clock.rate = 2 / 170; // 1 时辰 ≈ 2.8 分钟
  g.clock.set(startHour); g.clock.running = false;
  g.clock.onShichen = (sc) => { g.audio.drum(3); ui.banner(sc + '时', sc === '亥' ? '江水离堤顶只剩三尺' : sc === '戌' ? '江水涨到了堤腰' : ''); };
  d.timeNote = '';
  // ── 夜里的人 ──
  const N = {};
  N.chang = d.place('changboxi', 'yamen.hall', { face: [0, 1], talk: (e) => talkChangNight(d, e) });
  N.chaiyi = d.place('chaiyi', ['yamen', 640, 470], { look: 'chaiyi', name: '差役', face: [1, 0] });
  d.hotspot('gong_take', 'yamen.gong', '铜锣', '摘下来', async () => {
    if (st.hasItem('gong')) return;
    if (!st.has('chang_refused')) { await d.think('锣在架子上。常伯熙就在堂上。'); const a = await d.choose('narr', '', [{ id: 'take', text: '不跟他废话，自己摘' }, { id: 'ask', text: '先去问常伯熙要' }]); if (a !== 'take') return; }
    await d.narr('你走到大堂，把架子上那面铜锣摘了下来。差役追出来，没敢拦。');
    d.item('gong', '铜锣'); st.flag('got_gong'); g.ui.toast('<b>G</b> 敲锣', 'dark');
    if (!st.has('c_nogong')) d.ledger('chang_nogong', '把柄', '常伯熙', '端午夜，他的锣是你自己从架子上摘的。');
    d.removeHotspot('gong_take');
  }, { r: 70, h: 1.2, active: () => !st.hasItem('gong') });
  N.qian = d.place('qianguanjia', 'pier.qian', { face: [0, 1], talk: (e) => talkQianNight(d, e) });
  // 闸口：蒋千户与兵
  const guards = [];
  N.jiang = d.place('jiang_n', ['sluice', 640, 520], { look: 'jiangqianhu', name: '蒋千户', face: [0, -1] }); N.jiang.viewR = 650; guards.push(N.jiang);
  [[420, 570], [700, 460], [560, 630], [1060, 590], [1110, 480], [480, 660]].forEach(([sx, sy], i) => { const sd = d.place('nsold' + i, ['sluice', sx, sy], { look: i % 2 ? 'soldier_torch' : 'soldier', name: '号衣兵', wander: { r: 50, pause: 1.2 } }); sd.viewR = 560; sd.omni = i % 2 === 1; guards.push(sd); if (i % 2) sd.torch = g.views.sluice.addLight({ x: sx, y: sy - 40, r: 130, color: 0xff9a40, a: 0.9, g: 10 }); });
  // 村民：户
  const doors = HOUSE_DOORS();
  const HH = [];
  doors.forEach((door, i) => { HH.push({ id: door.id, door, x: door.x * 2, y: door.y * 2, count: PER_HOUSE + (door.id === 'feng_home' ? 7 : 0), state: 'home', sprites: [], evac: !!(st.evac && st.evac[door.id]), isFeng: door.id === 'feng_home', slow: i % 4 === 3 }); });
  const totalPeople = HH.reduce((n, h) => n + h.count, 0);
  let saved = 0; for (const h of HH) if (h.evac) { h.state = 'arrived'; saved += h.count; }
  st.set('huomin', saved); st.set('total_people', totalPeople);
  const addSaved = (n, why) => { saved += n; st.set('huomin', saved); d.refreshStats(); if (why) ui.toast(`<b>+${n}</b>${why}`, 'dark'); };
  d.refreshStats();
  for (const h of HH) { if (h.evac) continue; d.hotspot('door_' + h.id, h.door.pos, h.isFeng ? '冯家' : '农家', '拍门', () => knock(d, h, HH, N), { r: 80, h: 1.3, active: () => h.state === 'home' }); }
  if (st.has('hegong_friend')) { N.hegong = d.place('laohegong', ['village', 720, 620], { face: [0, 1], talk: (e) => talkHegongNight(d, e, HH, N) }); }
  N.minzhuang = [];
  d._night = { HH, N, wake };
  // ── 开场 ──
  g.player.locked = true; g.player.visible = true;
  if (knew === 2) {
    await d.teleport('innDoor', { fade: false }); await ui.fadeIn(800);
    await d.narr('常伯熙的宴席，你推说身子不适，没有去。天一黑，你就出了门。');
    if (st.get('evac_n') > 0) await d.narr('昨夜你敲过的那几户，今天一早就走了。门上落了锁。');
  } else {
    g.r.fade(1); await ui.showCG('yamen_night', { ms: 10 }); await ui.fadeIn(800);
    await d.narr('你去了常伯熙的宴席。' + (knew === 1 ? '你没有喝酒。常伯熙一直在看窗外的天，酒洒了两回。' : '常伯熙一直在劝酒，一直在看窗外的天。你喝了几杯，觉得他的笑有些怪，可说不上哪里怪。'));
    await d.say('changboxi', '程大人，[[这雨……今年的雨真大啊::一个知县，端午夜里不看席面，不看酒，一直看天。他在等一个时辰。::c_chang_sky]]。再饮一杯。');
    if (knew === 1) await d.narr('你借口更衣，出了门。'); else await d.narr('等你想明白，已经是亥时了。');
    await ui.fadeOut(500); await ui.hideCG(10); await d.teleport('yamen.court', { fade: false }); await ui.fadeIn(600);
  }
  await d.narr('你站在雨里。新安江的水声，比白天大了一倍。');
  ui.banner(g.clock.label(), '子时之前');
  d.quest('n_people', '把冯家村的人送上龙王庙', '到村里拍门、敲锣，带着人走村南的小路上后山。锣、民壮、船、吴老倌——白天攒下什么，今夜才有什么用。', { spot: 'villageCenter' });
  d.quest('n_sluice', '闸口：看清楚他们在做什么', '火把底下，有人在动闸底的石头。伏在柳树后面（C 潜行），火把照不见你。', { spot: 'sluice.hide' });
  if (st.has('c_grain') || st.has('qian1')) d.quest('n_boat', '渡口：借沈家的粮船', '水起来以后，船比腿有用。渡口在城北门外。', { npc: 'qianguanjia' });
  d.quest('n_gong', '县衙：要锣，要民壮', '锣声在雨里传得很远。常伯熙在县衙大堂。', { npc: 'changboxi' });
  g.player.locked = false; g.clock.running = true;
  g.save(); st.flag('night_started');

  // ── 每帧 ──
  let breached = false, ended = false, ayangEvent = false, huEvent = false, drownT = 0, rescued = false;
  const startT = g.t; const capturedAt = { v: false };
  d.countdown = 1;
  const breachHour = 23.0;
  d.stealth.start(guards, { closeR: 400,
    onClose: async () => {
      if (breached) return; d.busy = true; g.player.stop();
      await d.narr('你伏在柳树后面，往前看。二三十个兵，穿着号衣，打着火把，拿着镐和铁钎，正在凿闸门底下的石头。');
      await d.say('jiangqianhu', '快！子时以前！');
      await d.say('soldier', '蒋千户，底下的石头松了！');
      await d.think('蒋千户。踏苗那天跟在马宁远身后的那个。臬司衙门的人。');
      const a = await d.choose('narr', '', [{ id: 'watch', text: '伏着，看清楚每一张脸' }, { id: 'shout', text: '冲出去，喝止他们' }]);
      if (a === 'watch') { await d.narr('你没有动。雨水灌进你的领口，你也没有动。你看清了蒋千户的脸，看清了号衣上的字，也看清了闸门底下那几块新砌的条石，是怎么被一块一块撬松的。'); st.flag('saw_dike'); d.clue('c_jiang'); d.done('n_sluice'); ui.toast('<b>看清了</b>退下堤去，别被火把照见', 'dark'); }
      else { await captured(); }
      d.busy = false;
    },
    onCaught: async () => { if (breached) return; d.busy = true; g.player.stop(); await d.narr('火把照到了你的脸。两个兵扑上来，把你按在了泥里。'); await captured(); d.busy = false; },
  });
  async function captured() {
    st.flag('saw_dike'); st.flag('captured'); st.add('xian', 3); d.ledger('jiang_saw', '记恨', '蒋千户', '端午夜，你在闸口喝止他，被他捆进了闸房。他看清了你的脸。'); d.done('n_sluice');
    await d.say('jiangqianhu', '户部的？捆起来，扔进闸房。等完了事再说。');
    g.player.locked = true; await ui.fadeOut(600);
    await d.teleport(['sluice', 960, 360], { fade: false });
    g.clock.hour = 22.85; g.clock.apply(); d.stealth.stop();
    await ui.fadeIn(600);
    await d.narr('他们把你捆在闸房的柱子上。从闸房的窗缝里，你看着他们干完了剩下的活。亥时过半，外面的人散了。你磨断了绳子，从闸房里爬出来——脚下的堤，已经在抖。');
    capturedAt.v = true; g.player.locked = false;
  }
  async function drown() {
    if (ended) return; ended = true; g.clock.running = false; g.player.locked = true;
    g.audio.splash();
    if (st.has('hegong_friend') && !rescued && N.hegong && !N.hegong.dead) {
      rescued = true; ended = false;
      await d.narr('水没过了你的头顶。你抓到了什么——是一根竹竿。吴老倌把你拖上了高处。');
      await d.say('laohegong', '官老爷，水里的事，你不行。往山上去！');
      const p = nearestDry(g, g.player.x, g.player.y); g.player.x = p[0]; g.player.y = p[1]; g.player.path = null; g.player.locked = false; g.clock.running = true; drownT = 0; return;
    }
    await ui.fadeOut(1500);
    await ui.chapter('没有活到天亮', '', ['你被水卷走了。', '那一夜，淳安一县、建德半县，成了一片泽国。', '账簿上你的名字后面，写的是：溺。']);
    retryNight(d);
  }
  d.tick = (dt) => {
    const h = g.clock.hour; const toBreach = h >= 12 ? (breachHour - h) : -1;
    d.countdown = breached ? null : Math.max(0, toBreach / (breachHour - startHour));
    d.timeNote = breached ? '决堤' : toBreach < 0.5 ? '堤在抖' : '';
    // 跟随者到庙
    for (const h2 of HH) {
      if (h2.state !== 'following') continue;
      for (const sp of h2.sprites) { if (sp.arrived) continue; if (sp.scene === 'temple') { sp.arrived = true; const yd = d.pos('temple.yard'); sp.goTo(yd.x + (Math.random() - 0.5) * 500, yd.y + (Math.random() - 0.5) * 200); const i = d.followers.indexOf(sp); if (i >= 0) d.followers.splice(i, 1); const share = Math.floor(h2.count / h2.sprites.length); const left = h2.count - share * (h2.sprites.length - 1); const n = h2.sprites.filter(x => x.arrived).length === h2.sprites.length ? left : share; addSaved(n, '上了山'); } }
      if (h2.sprites.every(sp => sp.arrived || sp.dead)) { h2.state = 'arrived'; if (HH.every(x => x.state === 'arrived' || x.state === 'onboat' || x.state === 'roof')) d.done('n_people'); }
      for (const sp of h2.sprites) { if (sp.arrived || sp.dead || sp.scene !== g.sceneId) continue; const dd = sp.dist(g.player); if (dd > 700 && !sp.lost) { sp.lost = true; ui.bubble(sp, '官老爷——等等我们！', { dur: 2500 }); } if (sp.lost && dd < 300) sp.lost = false; if (sp.lost) { sp.path = null; sp.moving = false; } }
    }
    if (breached) {
      for (const e of g.entities) {
        if (e === g.player || e.dead || e.arrived || !e.visible) continue; const v = g.views[e.scene]; const dep = v ? v.depthAt(e.x, e.y) : 0;
        if (dep > 0.72) { e.wT = (e.wT || 0) + dt; if (e.wT > 3) { e.dead = true; e.visible = false; const i = d.followers.indexOf(e); if (i >= 0) d.followers.splice(i, 1); if (e.hh) { ui.toast('<b>有人被水卷走了</b>' + (e.hh.isFeng ? '冯家' : ''), 'red'); } if (e === N.hegong) st.flag('hegong_dead'); } } else e.wT = 0;
      }
      const dep = g.player.depth; if (dep > 0.8 && !boat.on) { drownT += dt; d.danger = true; if (drownT > 0.5) ui.label(g.player, drownT > 2.5 ? '水没到胸口了！' : '水太深', 'alert', 1.15); if (drownT > 4) { ui.label(g.player, null); drown(); } } else { if (drownT > 0) ui.label(g.player, null); drownT = Math.max(0, drownT - dt * 2); if (!d.stealth.active) d.danger = false; }
      boatTick(dt);
    }
    if (!breached && (h >= breachHour || h < 12)) { breached = true; breach(); }
    if (breached && !ayangEvent && g.t - breachT > 25 && !g.ui.modal && !d.busy) { ayangEvent = true; ayangScene(); }
    if (breached && !huEvent && h >= 1.0 && h < 12 && !g.ui.modal && !d.busy) { huEvent = true; huScene(); }
    if (!breached && toBreach < 0.15 && guards[0].visible) { const out = d.pos(['sluice', 1500, 320]); for (const gd of guards) { gd.ai = null; gd.goTo(out.x, out.y, () => gd.visible = false); } d.stealth.stop(); }
  };
  // ── 决堤 ──
  let breachT = 0;
  async function breach() {
    breachT = g.t; d.busy = true; g.player.stop(); g.player.locked = true; d.stealth.stop(); d.countdown = null;
    for (const gd of guards) { gd.visible = false; if (gd.torch) gd.torch.userData.off = true; }
    g.audio.rumble(4); g.r.shake = 0.8;
    ui.banner('子时', '');
    await wait(900);
    g.r.flash(1); g.audio.thunder(0.2); g.r.shake = 1.5;
    await ui.showCG('breach', { ms: 500 });
    g.audio.splash(); g.audio.rumble(6);
    await d.narr('先是一声闷响，从闸口那边传过来，像是地底下有什么东西断了。然后是水声。不是雨声，不是江声，是另一种声音。几十丈宽的水头从堤上的缺口里翻出来，一下子就把堤下的田吞了。');
    await ui.hideCG(900);
    g.flood.rate = 1 / 330; g.flood.start();
    ui.toast('<b>水来了</b>往高处去。田和路很快就走不了了', 'red'); d.target('n_people', { spot: 'temple' });
    if (st.has('saw_dike')) d.quest('n_yaopai', '趁水还没把闸口冲平，回去找证据', '决口边上，他们来不及带走的东西。水一会儿就会把一切冲平。', { spot: 'breach' });
    g.player.locked = false; d.busy = false; g.audio.setMood('storm');
    for (const h2 of HH) if (h2.state === 'home') { h2.state = 'roof'; d.removeHotspot('door_' + h2.id); d.hotspot('roof_' + h2.id, h2.door.pos, '屋顶上有人', '救上船', async () => { if (!boat.on) { await d.think('水太深，没有船过不去。'); return; } if (boat.load + h2.count > boat.cap) { ui.toast('船满了。先送到山脚', 'red'); return; } boat.load += h2.count; h2.state = 'onboat'; d.removeHotspot('roof_' + h2.id); ui.toast(`<b>救上船</b>${h2.count} 人`, 'dark'); g.audio.chime(); }, { r: 110, h: 1.6, active: () => h2.state === 'roof' }); }
    d.hotspot('yaopai', 'breach', '决口', '捡起腰牌', async () => { await d.narr('豁口边上，泥里插着一根铁钎，铁钎旁边，是一块被水冲到石缝里的腰牌。你把腰牌捡起来。上面刻着：浙江按察使司。'); d.item('yaopai', '按察使司腰牌'); st.flag('evidence'); d.done('n_yaopai'); d.ledger('yaopai', '把柄', '何茂才', '决口边上，你捡到一块浙江按察使司的腰牌。'); d.removeHotspot('yaopai'); }, { r: 90, h: 0.8, active: () => g.t - breachT < 150 });
    setTimeout(() => { if (!st.has('evidence')) { d.removeHotspot('yaopai'); d.done('n_yaopai'); } }, 150000);
    if (st.has('boats')) { setTimeout(() => spawnBoat(), 12000); }
    g.weather.wind = 0.9;
  }
  // ── 船 ──
  const boat = { on: false, ent: null, load: 0, cap: 30 };
  function spawnBoat() {
    const b = d.place('boat', ['village', 730, 880], { look: 'boat', name: '粮船', scale: 1.6 }); b.interact = null; b.noWater = true; b.ai = () => { b.moving = false; }; b.orderBias = 0; boat.ent = b;
    ui.toast('<b>沈家的粮船</b>划到了山脚下', 'dark');
    d.hotspot('boat_board', ['village', 730, 880], '粮船', '上船', async () => { boat.on = true; g.player.visible = false; g.player.locked = true; g.player.boatMode = true; ui.toast('<b>撑船</b>WASD 划，靠近屋顶救人，回山脚下放人', 'dark'); }, { r: 110, h: 1.2, active: () => !boat.on && boat.ent && boat.ent.scene === g.sceneId && g.view.depthAt(boat.ent.x, boat.ent.y) > 0.2 });
    boat.hs = d.hotspots.find(x => x.id === 'boat_board');
  }
  function boatTick(dt) {
    const b = boat.ent; if (!b) return; const v = g.views[b.scene];
    if (boat.hs) { boat.hs.x = b.x; boat.hs.y = b.y; boat.hs.scene = b.scene; }
    if (!boat.on) return;
    if (b.scene !== g.sceneId) { boat.on = false; g.player.visible = true; g.player.locked = false; g.player.boatMode = false; return; }
    const { dx, dz } = g.input.axis(); const l = Math.hypot(dx, dz);
    if (l > 0.01) {
      const sp = 220 * dt; const nx = b.x + dx / l * sp, ny = b.y + dz / l * sp * 0.75;
      const ok = (x, y) => x > 40 && y > 40 && x < v.W - 40 && y < v.H - 40 && v.depthAt(x, y) > 0.3;
      if (ok(nx, b.y)) b.x = nx; if (ok(b.x, ny)) b.y = ny;
      b.facing.set(dx, dz); b.moving = true;
      boat.stepT = (boat.stepT || 0) + dt; if (boat.stepT > 0.5) { boat.stepT = 0; g.audio.noise(0.3, 600, 0.8, 0.12); }
    } else b.moving = false;
    g.player.x = b.x; g.player.y = b.y;
    const nearShore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => { const px = b.x + ox * 90, py = b.y + oy * 70; return v.depthAt(px, py) < 0.25 && v.elevAt(px, py) > 0.8; });
    if (nearShore && boat.load > 0) { addSaved(boat.load, '从屋顶上救下来，送上了山'); boat.load = 0; }
    if (nearShore && g.input.hit('space')) { boat.on = false; g.player.visible = true; g.player.locked = false; g.player.boatMode = false; const p = nearestDry(g, b.x, b.y); g.player.x = p[0]; g.player.y = p[1]; }
    ui.label(b, boat.load ? `船上 ${boat.load} 人` + (nearShore ? '　靠岸了' : '') : (nearShore ? '空格 下船' : ''), '', 1.1);
    if (st.has('ayang_roof') && !st.has('ayang_saved') && N.ayang && Math.hypot(b.x - N.ayang.x, b.y - N.ayang.y) < 260) { st.flag('ayang_saved'); st.set('ayang', 'saved'); d.removeHotspot('ayang_roof'); N.ayang.visible = false; boat.load += 1; ui.toast('<b>阿秧</b>在船上了', 'dark'); g.audio.chime(); d.done('n_ayang'); }
  }
  // ── 阿秧 ──
  async function ayangScene() {
    const feng = HH.find(h => h.isFeng); if (!feng) return;
    if (feng.state === 'roof' || feng.state === 'home') return;
    d.busy = true; g.player.stop();
    const fl = d.place('feng_run', { scene: g.sceneId, x: g.player.x + 70, y: g.player.y + 30, px: true }, { look: 'fenglaosi', name: '冯老四', face: [-1, 0] }); fl.interact = null;
    await d.say('fenglaosi', '阿秧！阿秧回去了！她说要回去拿田契——我跟她说过，田契比命要紧……我跟她说过的……');
    await d.narr('庙下面，水已经漫到了山脚。冯家的屋子只剩一道屋脊露在水面上，屋脊上好像有一个小小的影子。');
    st.flag('ayang_roof'); st.set('ayang', 'roof');
    N.ayang = d.place('ayang_roof', ['village', 1190, 440], { look: 'ayang', name: '阿秧' }); N.ayang.interact = null; N.ayang.arrived = true; N.ayang.orderBias = 400; N.ayang.noWater = true;
    ui.label(N.ayang, '阿秧', 'alert', 1.3);
    d.quest('n_ayang', '救阿秧', '她在冯家的屋脊上。水还在涨。' + (st.has('boats') ? '撑船过去。' : '没有船，只能下水。'), { spot: 'fengHome' });
    d.hotspot('ayang_roof', ['village', 1190, 560], '阿秧', '抱下来', async () => {
      st.flag('ayang_saved'); st.set('ayang', 'saved_swim'); d.removeHotspot('ayang_roof'); N.ayang.visible = false; ui.label(N.ayang, null);
      await d.narr('屋脊上真的是阿秧。她趴在那里，怀里死死抱着一个油纸包。你把她抱起来的时候，她还在说：田契……爷爷的田契……');
      if (st.has('hegong_friend') && N.hegong && !N.hegong.dead) { await d.narr('回来的路上，一根冲下来的房梁撞在你背上。你眼前一黑，手松了。是吴老倌拽着绳子，把你们两个拖上了岸。'); rescued = true; }
      d.done('n_ayang'); addSaved(1, '阿秧');
      const p = nearestDry(g, g.player.x, g.player.y); g.player.x = p[0]; g.player.y = p[1]; g.player.path = null; drownT = 0;
      await d.narr('阿秧回到冯老四怀里。老人抱着孙女，跪在泥里，冲你磕头。你没有拉他起来，你已经没有力气了。');
    }, { r: 130, h: 1.0, active: () => !st.has('ayang_saved') && !boat.on });
    setTimeout(() => { fl.visible = false; }, 8000);
    d.busy = false;
  }
  // ── 丑时：胡宗宪 ──
  async function huScene() {
    d.busy = true; ended = true; g.clock.running = false; g.player.locked = true; boat.on = false; g.player.visible = true; g.player.boatMode = false;
    await ui.fadeOut(900);
    d.hotspots = []; for (const e of g.entities) if (e !== g.player) e.visible = false;
    await ui.showCG('hu_dike', { ms: 10 }); await ui.fadeIn(900);
    ui.banner('丑时', '');
    await d.narr('山下的堤上亮起了一长串火把。是兵，打着总督衙门的旗号。一个亲兵爬上山来，扯着嗓子喊你的名字：部堂请程委员上堤！');
    await d.narr('胡宗宪站在堤上，浑身湿透，连蓑衣都没披。戚继光的兵在他身后排成人墙，用身子顶着一处缺口，顶一阵，倒一片，又换一排上去。');
    d.meet('huzongxian');
    await d.say('huzongxian', '九个县的堰口，一夜之间全裂了口子。堵不住。要分洪。在淳安开口子，让水往淳安、建德走。下游七个县，就保住了。[[淹一个半县，保七个半县::这是一道算术题。你是户部的人，这道题，你算得比谁都快。]]。');
    const total = totalPeople;
    const a = await d.choose('huzongxian', '你在淳安核了一个月的田。淳安沿江，还有多少人在下面？', [
      { id: 'truth', text: `照实报数："冯家村${total}口，上山的${saved}。别的村子，下官不知道。"` },
      { id: 'lie', text: '"都上山了。"' },
      { id: 'wait', text: '"求部堂再等半个时辰。"', def: true },
    ], { timer: 15 });
    if (a === 'truth') { await d.narr('胡宗宪闭上眼睛，站了一会儿。'); st.set('fh', 'truth'); st.add('hu', 1); }
    else if (a === 'lie') { await d.say('huzongxian', '你核了一个月的田。这句话，你自己信吗？'); await d.narr('你没有答。'); st.set('fh', 'lie'); st.add('hu', -1); }
    else { await d.say('huzongxian', '半个时辰，下游七个县要多淹几万亩田，多死几千人。你是算账的。你算。'); await d.narr('你算了。你没有再说话。'); st.set('fh', 'wait'); }
    await d.say('huzongxian', '天地不仁呐。');
    await d.narr('他转过身去：开口子。');
    g.audio.rumble(4); g.r.shake = 1.2; g.audio.splash();
    await d.narr('戚继光的兵掘开了淳安段的大堤。水头拐了个弯，往淳安的田里扑过去。冯家村那一片，最后几片屋顶也没了。胡宗宪一直站在堤上看着，一动也没动。');
    d.ledger('sign_hu', '圣心', '胡宗宪', '端午夜，他在淳安开口分洪。他说：天地不仁呐。');
    await ui.fadeOut(1200);
    d.tick = null; d.countdown = null; d.danger = false; d.timeNote = '';
    await ending(d, { saved, total: totalPeople });
  }
}
function nearestDry(g, x, y) {
  const v = g.view;
  for (let r = 20; r < 1200; r += 20) for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2; const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r * 0.7; if (v.nav.walkable(px, py) && v.depthAt(px, py) < 0.3) return [px, py]; }
  return [x, y];
}
async function retryNight(d) {
  const g = d.g;
  const a = await d.choose('narr', '', [{ id: 'retry', text: '回到端午夜的开头' }, { id: 'title', text: '回到标题' }]);
  if (a === 'retry') { const s = JSON.parse(localStorage.getItem('dwx2_save') || 'null'); if (s) { g.state.load(s.state); g.flood.stop(); g.r.fade(0); d.startNight(); return; } }
  location.reload();
}
// ── 常伯熙：要锣 ──
async function talkChangNight(d, e) {
  const g = d.g, st = g.state;
  if (st.hasItem('gong')) { await d.say('changboxi', '程大人……千万别说是下官给的。'); return; }
  await d.narr('客人散了，残席还没撤，常伯熙一个人坐着，面前的酒一口没动。');
  await d.say('player', '常大人，江水快漫堤了。请调民壮，鸣锣，叫沿江各村的百姓上山。');
  await d.say('changboxi', '程大人……上头有令。今夜，[[不许鸣锣::锣，是给百姓报信用的。::c_nogong]]。');
  const ch = [{ id: 'who', text: '"上头是谁？"' }];
  if (st.has('c_zha2')) ch.push({ id: 'bluff', text: '"今夜的事，我知道。子时以前，谁也不许上堤——对吧？"', tag: '听来的' });
  ch.push({ id: 'take', text: '不再跟他废话，自己去拿锣' });
  const a = await d.choose('player', '', ch);
  if (a === 'bluff') {
    await d.narr('常伯熙一下子抬起头来，像是松了一口气。');
    await d.say('changboxi', '程大人既然知道……那就好，那就好。郑大人说了，子时以前，谁也不许上堤。');
    await d.say('player', '田要淹，人不能死。死多了，京里不好交代。锣和民壮，给我。');
    await d.say('changboxi', '这……');
    await d.say('player', '小阁老的意思，你要问清楚？');
    await d.narr('常伯熙哆嗦着，叫来了民壮头目。');
    giveGong(d, true); st.add('xian', 1);
    d.ledger('chang_nogong', '把柄', '常伯熙', '端午夜，他亲口说：上头有令，不许鸣锣；子时以前，谁也不许上堤。');
  } else if (a === 'who') {
    await d.narr('常伯熙不说话，只是摇头，汗顺着脸往下流。');
    const ch2 = [];
    if (st.get('hu') >= 1) ch2.push({ id: 'hu', text: '搬出胡宗宪', tag: '部堂的话' });
    ch2.push({ id: 'take', text: '不再跟他废话，自己去拿锣' });
    const b = await d.choose('player', '', ch2);
    if (b === 'hu') {
      await d.say('player', '胡部堂叫我看着这道堤。今夜堤要是出了事，常大人，你说部堂会先问谁？');
      await d.narr('常伯熙的脸一下子白了。');
      await d.say('changboxi', '程大人，我……我也是奉命……');
      await d.say('player', '锣，民壮。今夜的事，我只当是我自己要的。');
      await d.narr('常伯熙抖着手，把县衙的铜锣交给了你，又叫来十个民壮。');
      await d.say('changboxi', '程大人，千万……千万别说是我给的。');
      giveGong(d, true); st.add('hu', 1);
      d.ledger('chang_nogong', '把柄', '常伯熙', '端午夜，他说：上头有令，今夜不许鸣锣。锣是他抖着手交给你的。');
    } else { st.flag('chang_refused'); await takeGongSelf(d); }
  } else { st.flag('chang_refused'); await takeGongSelf(d); }
}
async function takeGongSelf(d) {
  const g = d.g, st = g.state;
  await d.narr('你推开他，走到大堂，把架子上那面铜锣摘了下来。常伯熙追出来，没敢拦。');
  giveGong(d, false);
  d.ledger('chang_nogong', '把柄', '常伯熙', '端午夜，他说：上头有令，今夜不许鸣锣。');
}
function giveGong(d, withMinzhuang) {
  const g = d.g, st = g.state;
  d.item('gong', '铜锣'); st.flag('got_gong'); d.done('n_gong'); d.removeHotspot('gong_take');
  g.ui.toast('<b>G</b> 敲锣。锣声能叫醒方圆几十丈的人', 'dark');
  if (withMinzhuang) {
    st.flag('minzhuang');
    const gt = SCENES.yamen.spots.gate;
    for (let i = 0; i < 6; i++) { const m = d.place('mz' + i, ['yamen', gt[0] - 90 + i * 36, gt[1] - 60 + (i % 2) * 30], { look: 'minzhuang', name: '民壮', speed: 1.0 }); m.interact = null; m.isMinzhuang = true; d.followers.push(m); }
    g.ui.toast('<b>民壮</b>十个民壮跟着你。到了村里，他们会一家一家把人往外扶', 'dark');
  }
}
// ── 渡口：借船 ──
async function talkQianNight(d, e) {
  const g = d.g, st = g.state;
  if (st.has('boats')) { await d.say('qianguanjia', '船在水里等着。程大人，东家那里，小的替您说。'); return; }
  await d.narr('渡口停着十几条大船，吃水很深。船上盖着油布，油布底下是粮。');
  await d.say('qianguanjia', '程大人，这么大的雨，您怎么来了？');
  await d.say('player', '船，我要借。今夜江水要漫堤，沿江的人要靠船。');
  await d.say('qianguanjia', '程大人，这是东家的粮船，一条也不能动。东家吩咐过，[[过了今夜，粮船要往上游走::粮船停在这里，在等。等过了今夜，上游的田淹了，粮就能换田。::c_grain]]。');
  if (st.has('debt_keep')) {
    await d.say('player', '你回去告诉沈老板，父亲欠他的二千两，我认。今夜这几条船，记在那张借据上。');
    await d.narr('管家看着你，像是看一个怪人。过了一会儿，他叹了口气。');
    await d.say('qianguanjia', '东家说过，程大人是个认账的人。船，您用吧。');
    st.flag('boats'); d.done('n_boat'); d.ledger('shen_boat', '欠人', '沈一石', '端午夜，你借了他的粮船，说记在父亲那张二千两的借据上。'); return;
  }
  await d.say('player', '沈老板烧了我父亲的借据，这份人情我记着。今夜借他的船，算我再欠他一回。');
  await d.say('qianguanjia', '程大人，东家说了，借据一烧，就两清了。');
  const ch = [{ id: 'iou', text: '"船，我立字据借。"' }];
  if (st.has('c_grain')) ch.push({ id: 'threat', text: '拿囤粮的事压他', tag: '线索' });
  ch.push({ id: 'no', text: '算了' });
  const a = await d.choose('player', '', ch);
  if (a === 'iou') { await d.narr('你就着船上的灯笼，写了一张借条，签上了自己的名字。管家把借条叠好，揣进怀里。'); await d.say('qianguanjia', '程大人立了字据，小的就好交代了。船，您用。'); st.flag('boats'); st.flag('shen_iou'); d.item('qianzhuang', '沈家的字据'); d.ledger('shen_iou', '欠人', '沈一石', '端午夜，你立字据借了他的粮船。字据上是你的名字。'); d.done('n_boat'); }
  else if (a === 'threat') { await d.say('player', '丝商在汛期囤粮，囤在九县的码头上，等着过了今夜往上游走——这件事，你要我写进户部的呈文里吗？'); await d.narr('管家的脸白了。'); await d.say('qianguanjia', '程大人……船，您用。可这件事，东家那里……'); await d.say('player', '船用完了，我自己去跟他说。'); st.flag('boats'); d.ledger('shen_threat', '记恨', '沈一石', '端午夜，你拿他囤粮的事，逼他的管家交出了粮船。'); d.done('n_boat'); }
  else await d.narr('你在雨里站了一会儿，转身走了。');
}
// ── 拍门 ──
async function knock(d, h, HH, N) {
  const g = d.g, st = g.state; const t = st.get('trust');
  const helpers = (st.has('minzhuang') ? 0.5 : 0) + (N.hegong && N.hegong.withMe ? 0.6 : 0) + (st.has('gong_rung') ? 0.25 : 0);
  const base = h.isFeng ? (t >= 2 ? 1 : t === 1 ? 0.7 : 0.3) : t >= 3 ? 0.85 : t === 2 ? 0.55 : t === 1 ? 0.35 : 0.15;
  const p = Math.min(1, base + helpers);
  await d.narr('你拍门。' + (h.isFeng ? '冯老四开了门。' : '门开了一条缝，屋里的人看着你身上的官服。'));
  if (Math.random() < p) {
    d.target('n_people', { spot: 'temple' });
    await d.say(h.isFeng ? 'fenglaosi' : 'cunmin_m', h.isFeng ? '官老爷说走，就走。阿秧，拿上你奶奶的拐杖！' : st.has('minzhuang') ? '民壮都来了……走，走！' : t >= 2 ? '官老爷说的，走！' : '……官老爷，真要走？好，走。');
    wake(d, h, true);
  } else {
    await d.say('cunmin_m', '堤年年涨水，年年没事。这么大的雨，往山上跑，老人孩子要淋出病来的。' + (h.slow ? '我娘七十多了，走不动。' : ''));
    g.ui.toast('没有应。敲锣，或者带上能说动他们的人', 'red');
    h.refused = (h.refused || 0) + 1;
  }
}
function wake(d, h, follow) {
  const g = d.g; if (h.state !== 'home') return;
  h.state = follow ? 'following' : 'out';
  const looks = h.isFeng ? ['fenglaosi', 'ayang'] : h.slow ? ['villager_m', 'villager_old'] : [['villager_m', 'villager_m2'][h.id.length % 2], ['villager_f', 'villager_f2', 'villager_child'][h.id.charCodeAt(h.id.length - 1) % 3]];
  looks.forEach((lk, i) => { const sp = d.place(h.id + '_p' + i, ['village', h.door.x + (i - 0.5) * 40, h.door.y + 20], { look: lk, name: h.isFeng ? (i ? '阿秧' : '冯老四') : '村民', speed: lk === 'villager_old' ? 0.45 : lk === 'ayang' || lk === 'villager_child' ? 0.7 : 0.8 }); const v = g.views.village; const w = v.nav.nearestWalkable(sp.x, sp.y, 300); if (w) { sp.x = w[0]; sp.y = w[1]; } sp.hh = h; sp.interact = follow ? null : () => { h.state = 'following'; for (const s2 of h.sprites) { s2.interact = null; d.followers.push(s2); } g.ui.toast('<b>跟上了</b>', 'dark'); }; sp.label = '带他们走'; sp.verb = '带走'; h.sprites.push(sp); if (follow) d.followers.push(sp); });
  d.removeHotspot('door_' + h.id);
}
// ── 锣 ──
export function useGong(d) {
  const g = d.g, st = g.state; if (!st.hasItem('gong') || d.phase !== 'night' || g.ui.modal) return;
  g.audio.gong(); g.r.shake = 0.3; st.flag('gong_rung');
  const p = g.player; g.ui.bubble(p, '当——！', { dur: 1200, h: 1.3 });
  const night = d._night; if (!night) return;
  let n = 0;
  if (g.sceneId === 'village') for (const h of night.HH) { if (h.state !== 'home') continue; if (Math.hypot(h.x - p.x, (h.y - p.y) * 1.3) < 900) { const auto = st.get('trust') >= 2 || st.has('minzhuang') || (night.N.hegong && night.N.hegong.withMe); wake(d, h, auto); n++; } }
  if (n && d.followers.length) d.target('n_people', { spot: 'temple' });
  if (n) g.ui.toast(`<b>锣声</b>${n} 户人家开了门` + (st.get('trust') >= 2 || st.has('minzhuang') ? '，跟着你走' : '。还得去跟他们说'), 'dark');
  else if (g.sceneId !== 'village') g.ui.toast('锣声在雨里传得很远。可这里没有人家', '');
}
// ── 吴老倌 ──
async function talkHegongNight(d, e, HH, N) {
  const g = d.g, st = g.state;
  if (e.withMe) { await d.say('laohegong', '走！都走！上龙王庙！'); return; }
  await d.say('laohegong', '官老爷！我刚才听堤，闸那一段，声音全空了。走！都走！上龙王庙！');
  await d.narr('村里人不信官老爷，信吴老倌。');
  e.withMe = true; e.interact = null; d.followers.push(e); e.speed = 0.8;
  let n = 0; for (const h of HH) { if (h.state === 'home' && Math.hypot(h.x - e.x, (h.y - e.y) * 1.3) < 600) { wake(d, h, true); n++; } else if (h.state === 'out') { h.state = 'following'; for (const s2 of h.sprites) { s2.interact = null; d.followers.push(s2); } } }
  if (n) g.ui.toast(`<b>吴老倌</b>${n} 户人家跟着他出来了`, 'dark');
  d.ledger('hegong_night', '人欠', '吴老倌', '端午夜，他把半个村子的人从屋里喊了出来。');
}
