// 界面：标题、HUD、对话、账簿、过场、提示、调试层。
import { PORTRAITS, CHARS } from './chars.js';
import { META, frameDataURL } from '../engine/sprites.js';
import { SCENES } from './scenes/index.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export class UI {
  constructor(game) {
    this.g = game; this.root = game.uiRoot; this.modal = false; this.pointerOnUI = false;
    this.root.innerHTML = `
      <div id="hud" style="display:none">
        <div class="hud-time"><div class="day">端午前三日</div><div class="clock"><div class="sc">辰时<small></small></div><div class="place">淳安</div><div class="incense"><i></i></div></div></div>
        <div class="hud-right"><button data-act="journal">账簿<span class="k">J</span></button><button data-act="map">舆图<span class="k">M</span></button><button data-act="menu">卷宗<span class="k">Esc</span></button></div>
        <div class="hud-quests"></div>
        <div class="hud-stats"></div>
        <div class="hud-hint"><kbd>WASD</kbd>走 <kbd>Shift</kbd>跑 <kbd>C</kbd>潜行 <kbd>空格</kbd>互动 <kbd>滚轮</kbd>远近 <kbd>M</kbd>舆图 <kbd>J</kbd>账簿</div>
        <div id="prompt"><div class="name"></div><div class="key">互动</div></div>
        <div id="qmark"><div class="qm-title"></div><div class="qm-dia">◆</div></div>
        <div id="qarrow"><div class="qa-body"><span class="qa-t"></span><span class="qa-d"></span></div><div class="qa-tip"></div></div>
        <div id="exits"></div>
        <div id="marker"></div>
        <div id="labels"></div>
        <div id="danger"></div>
      </div>
      <div id="banner"></div>
      <div id="toasts"></div>
      <div id="dlg"><div class="portrait"></div><div class="box"><div class="who"></div><div class="text"></div><div class="pi" style="display:none"></div><div class="choices"></div><div class="next">▼ 空格</div><div class="hintkey"></div><div class="timer" style="width:0"></div></div></div>
      <div id="cg"></div>
      <div id="overlay"></div>
      <div id="panels"></div>
      <div id="bigmap"></div>
      <canvas id="debug"></canvas>
      <div id="stick"><i></i></div><div id="actbtn">互动</div>`;
    this.$ = (s) => this.root.querySelector(s);
    this.hud = this.$('#hud'); this.dlg = this.$('#dlg'); this.overlay = this.$('#overlay'); this.panels = this.$('#panels'); this.cg = this.$('#cg');
    this.root.addEventListener('pointerdown', e => { this.pointerOnUI = !!e.target.closest('#ui > *:not(#hud):not(#debug)') || !!e.target.closest('.hud-right, .hud-quests, .hud-stats, #stick, #actbtn'); });
    this.root.addEventListener('pointerup', () => setTimeout(() => this.pointerOnUI = false, 0));
    this.$('.hud-right').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.act === 'journal') this.openJournal(); if (b.dataset.act === 'menu') this.openMenu(); if (b.dataset.act === 'map') this.toggleBigMap(); });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (this.bigMapOpen) this.toggleBigMap(false); else if (this.panelOpen) this.closePanel(); else if (!this.modal && this.hud.style.display !== 'none') this.openMenu(); }
      if ((e.key === 'j' || e.key === 'J') && !this.modal) this.openJournal();
      if (e.key === '`') { this.debug = !this.debug; this.$('#debug').style.display = this.debug ? 'block' : 'none'; }
    });
    this.labels = this.$('#labels'); this.labelMap = new Map();
    this.$('.hud-quests').addEventListener('click', e => { const q = e.target.closest('.q'); if (q && q.dataset.id) { this.g.state.tracked = q.dataset.id; this.refreshQuests(); this.g.audio.click(); } });
    this.$('#bigmap').addEventListener('click', e => { if (e.target === this.$('#bigmap')) this.toggleBigMap(false); });
    this.setupTouch(); this.dlgState = null; this.debug = false;
  }
  // ───── 标题 ─────
  showTitle({ canContinue, onStart, onContinue }) {
    const t = el('div', '', `
      <div class="t-left"><div class="t-main">端午汛</div><div class="t-seal">一五六六</div></div>
      <div class="t-menu"><button data-a="start">开　卷</button><button data-a="cont" ${canContinue ? '' : 'disabled'}>续　卷</button><button data-a="how">玩　法</button></div>
      <div class="t-note">《大明王朝1566》同人游戏 · 编剧刘和平 原著 · 本作人物程知白等为原创<br>键盘 WASD / 鼠标点击 均可游玩</div>`);
    t.id = 'title'; t.style.backgroundImage = 'url(assets/img/ui/title.webp)';
    t.querySelector('[data-a=start]').onclick = () => { this.g.audio.resume(); t.remove(); onStart(); };
    t.querySelector('[data-a=cont]').onclick = () => { this.g.audio.resume(); t.remove(); onContinue(); };
    t.querySelector('[data-a=how]').onclick = () => this.openHow();
    this.root.appendChild(t); this.title = t;
  }
  openHow() {
    this.showPanel('玩法', `
      <h3>你是谁</h3>你是户部观政进士程知白，嘉靖四十年五月，奉命到浙江淳安核田。三天之后是端午。
      <h3>三天</h3>白天在淳安城、大堤、冯家村、渡口之间走动。和人说话，<b>留心字下带红点的话</b>——点开它，能听出话里的话，记进账簿。帮人做事，攒下村民的信任；夜里有些地方，去了才看得见。
      <h3>端午夜</h3>到那一夜，一切都是实时的：你要在子时之前把能做的事做完。锣、民壮、船、村里的人——白天攒下什么，夜里才有什么用。
      <h3>往哪儿走</h3>右上角是要事，点一条就追着它走：画面里有金色的 ◆ 标记；要去别处时，标记会指着该走的出口。走到画面边上的出口，就到下一处。按 <b>M</b> 看舆图。
      <h3>操作</h3>WASD / 方向键 走动，Shift 跑，C 潜行（蹲下，不容易被火把照见），空格 / 鼠标点人 互动，滚轮 远近，J 账簿，M 舆图，Esc 卷宗（存档、设置）。手机上用左下摇杆和右下按钮。
      <h3>改不了的</h3>堤会决，严党会倒，嘉靖会在四十五年腊月驾崩。你能改的，是多少人活下来，和你自己最后成了什么样的人。`);
  }
  // ───── HUD ─────
  showHUD(v) { this.hud.style.display = v ? '' : 'none'; }
  setDay(txt) { this.$('.hud-time .day').textContent = txt; }
  setPlace(txt) { this.$('.hud-time .place').textContent = txt; }
  heightOf(e) { return e.h != null && typeof e.h === 'number' ? e.h : (this.g.view ? this.g.view.charH(e.y) : 200); }
  update(dt) {
    const g = this.g; if (this.hud.style.display === 'none') return;
    this.$('.hud-time .sc').innerHTML = g.clock.label() + '<small>' + (g.director.timeNote || '') + '</small>';
    const tgt = g.player && !this.modal ? g.nearestInteractable() : null;
    const p = this.$('#prompt');
    if (tgt && g.view) { const h = tgt.labelH != null && !tgt.look ? g.view.charH(tgt.y) * tgt.labelH : this.heightOf(tgt) * (tgt.labelH || 1.12); const s = g.toScreen(tgt.x, tgt.y, h); p.style.display = 'flex'; p.style.left = s.x + 'px'; p.style.top = s.y + 'px'; p.querySelector('.name').textContent = tgt.label || tgt.name; p.querySelector('.key').textContent = tgt.verb || '说话'; }
    else p.style.display = 'none';
    for (const [key, lb] of this.labelMap) {
      if (lb.until && performance.now() > lb.until) { lb.el.remove(); this.labelMap.delete(key); continue; }
      const e = lb.ent; if (e.scene && e.scene !== g.sceneId) { lb.el.style.display = 'none'; continue; }
      const s = g.toScreen(e.x, e.y, this.heightOf(e) * (lb.h || 1.08)); lb.el.style.left = s.x + 'px'; lb.el.style.top = s.y + 'px'; lb.el.style.display = s.behind ? 'none' : '';
    }
    // 要事目标
    const q = g.director.trackedQuest(); const t = q && g.view && g.director.resolveTarget(q.target);
    const qm = this.$('#qmark'), qa = this.$('#qarrow');
    if (t && g.player && !this.modal) {
      const sc = g.toScreen(t.x, t.y, t.h); const W = window.innerWidth, H = window.innerHeight; const pad = 70;
      const dist = Math.hypot(t.x - g.player.x, t.y - g.player.y);
      const inView = sc.x > pad && sc.x < W - pad && sc.y > pad && sc.y < H - pad;
      if (inView && dist > 120) { qm.style.display = 'flex'; qm.style.left = sc.x + 'px'; qm.style.top = sc.y + 'px'; qm.querySelector('.qm-title').textContent = t.far ? `${q.title} · 往${t.via}` : q.title; qa.style.display = 'none'; }
      else if (!inView) {
        qm.style.display = 'none'; qa.style.display = 'flex';
        const cx = W / 2, cy = H / 2; const dx = sc.x - cx, dy = sc.y - cy; const ang = Math.atan2(dy, dx);
        const rx = (W / 2 - pad) / Math.max(1e-3, Math.abs(Math.cos(ang))), ry = (H / 2 - pad) / Math.max(1e-3, Math.abs(Math.sin(ang))); const r = Math.min(rx, ry);
        qa.style.left = (cx + Math.cos(ang) * r) + 'px'; qa.style.top = (cy + Math.sin(ang) * r) + 'px';
        qa.querySelector('.qa-tip').style.transform = `rotate(${ang}rad)`; qa.querySelector('.qa-t').textContent = q.title; qa.querySelector('.qa-d').textContent = t.far ? '往' + t.via : '';
      } else { qm.style.display = 'none'; qa.style.display = 'none'; }
    } else { qm.style.display = 'none'; qa.style.display = 'none'; }
    // 出口标签
    const ex = this.$('#exits'); if (g.view && !this.modal) { if (this._exitScene !== g.sceneId) { this._exitScene = g.sceneId; ex.innerHTML = g.view.exits.map((e, i) => `<div class="exit" data-i="${i}">${SCENES[e.to].name}</div>`).join(''); } g.view.exits.forEach((e, i) => { const d = ex.children[i]; if (!d) return; const cx = e.poly.reduce((n, p) => n + p[0], 0) / e.poly.length, cy = e.poly.reduce((n, p) => n + p[1], 0) / e.poly.length; const s = g.toScreen(cx, cy, 0); d.style.left = Math.max(40, Math.min(window.innerWidth - 40, s.x)) + 'px'; d.style.top = Math.max(60, Math.min(window.innerHeight - 40, s.y)) + 'px'; d.style.opacity = s.behind ? 0 : 1; }); } else ex.innerHTML = '';
    const inc = this.$('.incense'); if (g.director.countdown != null) { inc.style.display = 'block'; inc.firstElementChild.style.width = Math.max(0, Math.min(100, g.director.countdown * 100)) + '%'; } else inc.style.display = 'none';
    this.$('#danger').classList.toggle('on', !!g.director.danger);
    if (this.debug) this.drawDebug();
  }
  drawDebug() {
    const g = this.g, c = this.$('#debug'); if (c.width !== window.innerWidth) { c.width = window.innerWidth; c.height = window.innerHeight; } const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); if (!g.view) return;
    const v = g.view; const poly = (p, col, fill) => { ctx.beginPath(); p.forEach(([x, y], i) => { const s = g.r.toScreen(x, y); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.closePath(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } };
    for (const p of v.walk) poly(p, '#4f4', 'rgba(80,255,80,0.12)'); for (const p of v.block) poly(p, '#f44', 'rgba(255,60,60,0.2)'); for (const o of v.occ) poly(o.poly, '#4af'); for (const e of v.exits) poly(e.poly, '#ff0', 'rgba(255,255,0,0.2)');
    ctx.font = '12px monospace'; for (const [k, [x, y]] of Object.entries(v.spots)) { const s = g.r.toScreen(x, y); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 2, s.y - 2, 4, 4); ctx.fillText(k, s.x + 4, s.y - 4); }
    for (const h of g.director.hotspots) if (h.scene === g.sceneId) { const s = g.r.toScreen(h.x, h.y); ctx.strokeStyle = '#fa0'; ctx.beginPath(); ctx.arc(s.x, s.y, h.r / v.k * (window.innerWidth / g.r.viewW) * v.k, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fa0'; ctx.fillText(h.id, s.x + 4, s.y); }
    const m = g.input.mouse; const sp = g.r.toScene(m.x, m.y); ctx.fillStyle = '#fff'; ctx.fillText(`${(sp.x / v.k).toFixed(0)}, ${(sp.y / v.k).toFixed(0)}  walk=${v.nav.walkable(sp.x, sp.y)} elev=${v.elevAt(sp.x, sp.y).toFixed(2)}`, m.x + 12, m.y + 20);
    if (g.player) ctx.fillText(`player ${(g.player.x / v.k).toFixed(0)},${(g.player.y / v.k).toFixed(0)} depth ${g.player.depth.toFixed(2)}`, 20, c.height - 60);
  }
  setStats(list) { this.$('.hud-stats').innerHTML = list.map(s => `<div class="st ${s.red ? 'red' : ''}">${s.k}<b>${s.v}</b></div>`).join(''); }
  refreshQuests() {
    const qs = Object.values(this.g.state.quests).filter(q => !q.done || Date.now() - (q.doneAt || 0) < 6000).slice(-5);
    const tracked = this.g.director.trackedQuest();
    this.$('.hud-quests').innerHTML = qs.map(q => `<div class="q ${q.done ? 'done' : ''} ${tracked && tracked.id === q.id ? 'on' : ''}" data-id="${q.id}"><b>${tracked && tracked.id === q.id ? '◆ ' : ''}${q.title}</b>${q.desc}</div>`).join('');
  }
  bubble(ent, text, { think = false, dur = 3000, h = 1.1 } = {}) { const key = ent.id + ':b'; this.labelMap.get(key)?.el.remove(); const d = el('div', 'bubble' + (think ? ' think' : ''), text); this.labels.appendChild(d); this.labelMap.set(key, { el: d, ent, until: performance.now() + dur, h }); }
  label(ent, text, cls = '', h = 1.08) { const key = ent.id + ':l'; if (!text) { const o = this.labelMap.get(key); if (o) { o.el.remove(); this.labelMap.delete(key); } return; } let o = this.labelMap.get(key); if (!o) { o = { el: el('div', 'worldlabel ' + cls, text), ent, h }; this.labels.appendChild(o.el); this.labelMap.set(key, o); } else { o.el.textContent = text; o.el.className = 'worldlabel ' + cls; o.h = h; } }
  clickMarker(x, y) { const m = this.$('#marker'); const s = this.g.toScreen(x, y, 0); m.style.display = 'block'; m.style.left = s.x + 'px'; m.style.top = s.y + 'px'; m.style.animation = 'none'; void m.offsetWidth; m.style.animation = ''; }
  toast(text, cls = '') { const t = el('div', 'toast ' + cls, text); this.$('#toasts').appendChild(t); setTimeout(() => t.remove(), 4000); }
  banner(text, sub = '', dur = 2600) { const b = this.$('#banner'); b.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); b.classList.add('show'); clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('show'), dur); }
  // 全屏 CG（对话在其上）
  showCG(name, { ms = 900 } = {}) { const c = this.cg; c.style.backgroundImage = name ? `url(assets/img/cg/${name}.webp)` : ''; c.style.transition = `opacity ${ms}ms`; c.classList.toggle('show', !!name); return new Promise(r => setTimeout(r, ms)); }
  hideCG(ms = 700) { return this.showCG(null, { ms }); }

  // ───── 对话 ─────
  say(node) {
    return new Promise(resolve => {
      clearTimeout(this._hideT); this.modal = true; this.dlg.classList.add('show');
      const who = node.who; const ch = CHARS[who];
      const por = this.dlg.querySelector('.portrait');
      if (who && who !== 'narr' && ch) {
        if (PORTRAITS[who]) { por.className = 'portrait'; por.style.backgroundImage = `url(assets/img/portraits/${PORTRAITS[who]}-cut.webp)`; por.style.display = ''; }
        else if (ch.look && META[ch.look]) { por.className = 'portrait sprite'; por.style.backgroundImage = `url(${frameDataURL(META[ch.look], 0, 0)})`; por.style.display = ''; }
        else por.style.display = 'none';
      } else por.style.display = 'none';
      const w = this.dlg.querySelector('.who'); w.textContent = who === 'narr' || !who ? '' : (ch ? ch.name : who); w.style.display = w.textContent ? '' : 'none'; w.classList.toggle('player', who === 'player');
      const textEl = this.dlg.querySelector('.text'); const piEl = this.dlg.querySelector('.pi'); piEl.style.display = 'none'; piEl.innerHTML = '';
      const chEl = this.dlg.querySelector('.choices'); chEl.innerHTML = '';
      const nextEl = this.dlg.querySelector('.next'); nextEl.style.display = 'none';
      const timerEl = this.dlg.querySelector('.timer'); timerEl.style.width = '0';
      this.dlg.querySelector('.hintkey').textContent = '';
      const parts = []; let subs = []; const raw = node.text || '';
      raw.replace(/\[\[(.+?)::(.+?)(?:::(.+?))?\]\]|([^\[]+|\[)/g, (m, a, b, c, plain) => { if (plain != null) parts.push({ t: plain }); else { parts.push({ t: a, sub: b, flag: c, i: subs.length }); subs.push({ a, b, c }); } });
      textEl.innerHTML = ''; textEl.classList.toggle('thought', !!node.thought);
      const spans = parts.map(p => { const s = el('span', p.sub != null ? 'sub' : '', ''); s.dataset.full = p.t; if (p.sub != null) s.dataset.sub = p.sub, s.dataset.flag = p.flag || ''; textEl.appendChild(s); return s; });
      let done = false, ti = 0, total = parts.reduce((n, p) => n + p.t.length, 0); const speed = this.g.settings.textSpeed || 1;
      const typeTick = () => { if (done) return; ti += speed * 1.2; let left = Math.floor(ti); for (let k = 0; k < spans.length; k++) { const full = spans[k].dataset.full; const show = Math.min(full.length, left); spans[k].textContent = full.slice(0, show); left -= show; if (left <= 0) break; } if (ti >= total) finishType(); else this._typeT = setTimeout(typeTick, 16); };
      const finishType = () => { done = true; clearTimeout(this._typeT); spans.forEach(s => s.textContent = s.dataset.full); showChoices(); };
      const showChoices = () => {
        if (node.choices && node.choices.length) {
          node.choices.forEach((c, i) => { const b = el('button', c.locked ? 'locked' : '', `<span class="n">${'一二三四五六'[i]}</span><span>${c.text}</span>${c.tag ? `<span class="tag">${c.tag}</span>` : ''}`); b.onclick = () => pick(i); chEl.appendChild(b); });
          this.dlg.querySelector('.hintkey').textContent = subs.length ? '点带红点的话可以琢磨' : '';
          if (node.timer) { const t0 = performance.now(); const tick = () => { if (!this.dlgState || this.dlgState.node !== node) return; const el2 = (performance.now() - t0) / 1000; timerEl.style.width = Math.max(0, 100 * (1 - el2 / node.timer)) + '%'; if (el2 >= node.timer) { const di = node.choices.findIndex(c => c.def); pick(di >= 0 ? di : 0); } else requestAnimationFrame(tick); }; tick(); }
        } else { nextEl.style.display = ''; this.dlg.querySelector('.hintkey').textContent = subs.length ? '点带红点的话可以琢磨' : ''; }
      };
      const pick = (i) => { if (!this.dlgState || this.dlgState.node !== node) return; if (node.choices && node.choices[i] && node.choices[i].locked) return; this.g.audio.click(); cleanup(); resolve(i); };
      const advance = () => { if (!done) { finishType(); return; } if (node.choices && node.choices.length) return; this.g.audio.paper(); cleanup(); resolve(null); };
      const cleanup = () => { clearTimeout(this._typeT); window.removeEventListener('keydown', onKey); this.dlg.removeEventListener('click', onClick); this.dlgState = null; clearTimeout(this._hideT); this._hideT = setTimeout(() => { if (!this.dlgState) this.closeDialogue(); }, 80); };
      const onKey = (e) => { if (e.repeat) return; if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); } const n = '123456'.indexOf(e.key); if (n >= 0 && done && node.choices && node.choices[n]) pick(n); };
      const onClick = (e) => { const s = e.target.closest('.sub'); if (s && done) { e.stopPropagation(); this.openSub(s, node); return; } if (e.target.closest('.choices')) return; advance(); };
      this.dlgState = { node };
      window.addEventListener('keydown', onKey); this.dlg.addEventListener('click', onClick);
      typeTick();
    });
  }
  openSub(span, node) {
    const piEl = this.dlg.querySelector('.pi'); if (span.classList.contains('open')) return;
    this.dlg.querySelectorAll('.sub.open').forEach(s => s.classList.remove('open'));
    span.classList.add('open'); piEl.style.display = ''; piEl.textContent = span.dataset.sub; this.g.audio.insight();
    const flag = span.dataset.flag; if (flag) this.g.director.onSubtext(flag, span.dataset.full, span.dataset.sub, node);
  }
  closeDialogue() { this.dlg.classList.remove('show'); this.modal = this.panelOpen || this.overlay.classList.contains('show') || false; this.g.input.pressed.clear(); this.g.interactCooldown = 0.35; }
  // ───── 过场 ─────
  async chapter(title, sub, lines = []) {
    const o = this.overlay; o.innerHTML = `<div class="chap">${title}${sub ? `<small>${sub}</small>` : ''}</div>${lines.length ? `<div class="lines">${lines.join('<br>')}</div>` : ''}<div class="cont">— 空格继续 —</div>`;
    o.classList.add('show'); this.modal = true;
    await new Promise(res => { const h = (e) => { if (e.type === 'click' || e.key === ' ' || e.key === 'Enter') { window.removeEventListener('keydown', h); o.removeEventListener('click', h); res(); } }; setTimeout(() => { window.addEventListener('keydown', h); o.addEventListener('click', h); }, 600); });
    o.classList.remove('show'); this.modal = this.panelOpen || false; this.g.input.pressed.clear(); this.g.interactCooldown = 0.35;
  }
  async fadeOut(ms = 800) { const r = this.g.r; const from = r.final.uniforms.uFade.value; const t0 = performance.now(); await new Promise(res => { const tick = () => { const k = Math.min(1, (performance.now() - t0) / ms); r.fade(from + (1 - from) * k); if (k < 1) requestAnimationFrame(tick); else res(); }; tick(); }); }
  async fadeIn(ms = 800) { const r = this.g.r; const from = r.final.uniforms.uFade.value; const t0 = performance.now(); await new Promise(res => { const tick = () => { const k = Math.min(1, (performance.now() - t0) / ms); r.fade(from * (1 - k)); if (k < 1) requestAnimationFrame(tick); else res(); }; tick(); }); }
  // ───── 面板 ─────
  showPanel(title, html, { tabs = null, cls = '' } = {}) {
    this.closePanel();
    const p = el('div', 'panel ' + cls); const tabHtml = tabs ? tabs.map((t, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}">${t.title}</button>`).join('') : `<button class="on">${title}</button>`;
    p.innerHTML = `<div class="sheet"><div class="tabs">${tabHtml}<button class="close">关 ✕</button></div><div class="body">${tabs ? tabs[0].html : html}</div></div>`;
    p.querySelector('.close').onclick = () => this.closePanel();
    p.addEventListener('click', e => { if (e.target === p && !cls.includes('ending')) this.closePanel(); const b = e.target.closest('.tabs button[data-i]'); if (b && tabs) { p.querySelectorAll('.tabs button').forEach(x => x.classList.remove('on')); b.classList.add('on'); p.querySelector('.body').innerHTML = tabs[b.dataset.i].html; if (tabs[b.dataset.i].bind) tabs[b.dataset.i].bind(p.querySelector('.body')); } });
    this.panels.appendChild(p); this.panel = p; this.panelOpen = true; this.modal = true;
    if (tabs && tabs[0].bind) tabs[0].bind(p.querySelector('.body'));
    this.g.audio.paper(); return p;
  }
  closePanel() { if (this.panel) { this.panel.remove(); this.panel = null; } this.panelOpen = false; this.g.input.pressed.clear(); this.g.interactCooldown = 0.35; this.modal = this.dlg.classList.contains('show') || this.overlay.classList.contains('show'); if (this._panelResolve) { const r = this._panelResolve; this._panelResolve = null; r(); } }
  panelPromise() { return new Promise(res => this._panelResolve = res); }
  openJournal() {
    const st = this.g.state; const row = (k, v, tag) => `<div class="row"><div class="k ${tag ? 'tag' : ''}">${k}</div><div class="v">${v}</div></div>`;
    const clues = st.clues.length ? st.clues.map(c => row(c.kind || '线索', `<b>${c.title}</b>　${c.text}`)).join('') : '<div class="empty">还没有记下什么。留心别人说的话。</div>';
    const ledger = st.ledger.length ? st.ledger.map(l => row(l.kind, `<b>${l.who}</b>　${l.text}`, true)).join('') : '<div class="empty">暗账空着。欠了谁、谁欠你、谁的把柄在你手里——都记在这里。</div>';
    const items = st.items.length ? st.items.map(i => row('物', ITEMS[i] ? `<b>${ITEMS[i].name}</b>　${ITEMS[i].desc}` : i)).join('') : '<div class="empty">身上没有什么。</div>';
    const people = st.people.length ? `<div class="people">${st.people.map(id => { const c = CHARS[id]; if (!c) return ''; const pic = PORTRAITS[id] ? `style="background-image:url(assets/img/portraits/${PORTRAITS[id]}.webp)"` : c.look && META[c.look] ? `class="pic sprite" style="background-image:url(${frameDataURL(META[c.look], 0, 0)})"` : ''; return `<div class="person"><div class="pic" ${pic}></div><b>${c.name}</b><small>${c.title || ''}</small><i>${c.pan || ''}</i></div>`; }).join('')}</div>` : '<div class="empty">还没见过谁。</div>';
    const v = st.vars; const stats = row('村民信任', '●'.repeat(Math.max(0, v.trust)) + '○'.repeat(Math.max(0, 5 - v.trust)) + `　${trustWord(v.trust)}`) + row('胡部堂', '●'.repeat(Math.max(0, v.hu)) + '○'.repeat(Math.max(0, 4 - v.hu))) + row('树敌', '●'.repeat(Math.max(0, v.xian)) + `　${v.xian >= 3 ? '已经有人记着你了' : v.xian > 0 ? '有人看你不顺眼' : '没人注意你'}`);
    this.showPanel('账簿', '', { tabs: [{ title: '线索', html: stats + '<h3>记下的事</h3>' + clues }, { title: '暗账', html: ledger }, { title: '随身', html: items }, { title: '人物', html: people }] });
  }
  openMenu() {
    const g = this.g; const s = g.settings;
    const html = `<div class="btnrow"><button data-a="save">存档</button><button data-a="load" ${g.hasSave() ? '' : 'disabled'}>读档</button><button data-a="title">回到标题</button></div>
      <h3>设置</h3>
      <label><input type="checkbox" data-s="music" ${s.music ? 'checked' : ''}> 配乐</label>
      <label>音量 <input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-s="volume"></label>
      <label>文字速度 <input type="range" min="0.5" max="3" step="0.25" value="${s.textSpeed}" data-s="textSpeed"></label>
      <h3>操作</h3>WASD / 方向键 走　Shift 跑　C 潜行　空格 互动　滚轮 远近　J 账簿　M 舆图　G 鸣锣（有锣时）`;
    const p = this.showPanel('卷宗', html);
    p.querySelector('[data-a=save]').onclick = () => { g.save(); this.toast('已存档'); };
    p.querySelector('[data-a=load]').onclick = () => { this.closePanel(); g.load(); };
    p.querySelector('[data-a=title]').onclick = () => { if (confirm('回到标题？未存档的进度会丢失。')) location.reload(); };
    p.querySelectorAll('[data-s]').forEach(inp => inp.oninput = () => { const k = inp.dataset.s; s[k] = inp.type === 'checkbox' ? inp.checked : parseFloat(inp.value); g.applySettings(); });
  }
  // 舆图：各处与去路
  toggleBigMap(force) {
    const on = force != null ? force : !this.bigMapOpen; this.bigMapOpen = on; const bm = this.$('#bigmap'); bm.classList.toggle('show', on); this.modal = on || this.panelOpen || this.dlg.classList.contains('show');
    if (on) { this.g.audio.paper(); const g = this.g; const here = g.sceneId; bm.innerHTML = `<div class="bm-sheet"><div class="bm-title">淳安舆图</div><div class="bm-grid">${Object.entries(SCENES).map(([id, s]) => `<div class="bm-item ${id === here ? 'here' : ''}">${s.name}${id === here ? '<small>你在这里</small>' : ''}</div>`).join('')}</div><div class="bm-foot">M / Esc 关</div></div>`; }
  }
  setupTouch() {
    const stick = this.$('#stick'), knob = stick.firstElementChild; const inp = this.g.input; let active = null;
    const setFrom = (e) => { const r = stick.getBoundingClientRect(); let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dz = (e.clientY - (r.top + r.height / 2)) / (r.height / 2); const l = Math.hypot(dx, dz); if (l > 1) { dx /= l; dz /= l; } knob.style.transform = `translate(${dx * 35}px, ${dz * 35}px)`; inp.touchStick = { dx, dz }; };
    stick.addEventListener('pointerdown', e => { active = e.pointerId; stick.setPointerCapture(e.pointerId); setFrom(e); });
    stick.addEventListener('pointermove', e => { if (active === e.pointerId) setFrom(e); });
    const end = e => { if (active === e.pointerId) { active = null; inp.touchStick = null; knob.style.transform = ''; } };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    this.$('#actbtn').addEventListener('pointerdown', e => { e.preventDefault(); inp.pressed.add('space'); });
  }
}
function trustWord(t) { return t <= 0 ? '不认识你' : t === 1 ? '见过你' : t === 2 ? '肯听你说话' : t === 3 ? '信你' : '把你当自己人'; }
export const ITEMS = {
  gong: { name: '铜锣', desc: '县衙的报警锣。按 G 敲响，方圆几十丈都听得见。' },
  zhafu: { name: '户部札付', desc: '户部派你核田的公文。拿它能唬住一些人。' },
  yaopai: { name: '按察使司腰牌', desc: '决口边捡到的。上面刻着：浙江按察使司。' },
  jiejv: { name: '借据', desc: '父亲二十年前立给沈一石的二千两借据。' },
  zongzi: { name: '粽子', desc: '阿秧塞给你的。还是温的。' },
  liangzhang: { name: '粮账', desc: '九县改桑之后一年少多少粮，灾年要赈多少。你算了三遍。' },
  tianqi: { name: '田契', desc: '冯家两亩水田的田契。' },
  hegongzhang: { name: '河工账', desc: '新安江堤二百万两的用料明细。石头的数目对不上。' },
  qianzhuang: { name: '沈家的字据', desc: '你立字据借了粮船。字据上是你的名字。' },
};
