// 自动试玩：node tools/playtest.mjs [scenario]
// 注入自动应答：对话有选项就选（可按偏好），没选项就按空格；章节牌按空格；面板点第 4 行或关掉。
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
const exe = '/Users/liaoxingyi/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const scenario = process.argv[2] || 'full';
const prefer = process.env.PREFER || 'first'; // first | random | best
mkdirSync('tools/shots/play', { recursive: true });
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });
page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) { errors.push(m.text()); console.log('CONSOLE', m.text()); } });
await page.goto('http://127.0.0.1:8567/index.html'); await page.waitForTimeout(1200);
let shotN = 0; const shot = async (name) => { await page.screenshot({ path: `tools/shots/play/${String(++shotN).padStart(2, '0')}-${name}.png` }); };
// 自动应答
await page.evaluate((prefer) => {
  window.__auto = true; window.__picks = [];
  const BEST = ['站到兵', '以户部', '教教下官', '结实吗', '伏着', '搬出胡', '照实', '端午', '起身', '写。', '田契留着', '把算好', '交出腰牌', '人祸', '一口干', '让他烧', '抱下来', '空的', '户部核田', '不跟他', '伏着，看', '上头是谁', '把看见的'];
  setInterval(() => {
    if (!window.__auto) return;
    const dlg = document.querySelector('#dlg.show'); const ov = document.querySelector('#overlay.show');
    if (ov) { window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return; }
    if (dlg) {
      const btns = [...dlg.querySelectorAll('.choices button:not(.locked)')];
      if (btns.length) {
        let b = btns[0];
        if (prefer === 'random') b = btns[Math.floor(Math.random() * btns.length)];
        if (prefer === 'best') { const f = btns.find(x => BEST.some(k => x.textContent.includes(k))); if (f) b = f; }
        window.__picks.push(b.textContent.trim().slice(0, 30)); b.click(); return;
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return;
    }
    const panel = document.querySelector('.panel'); if (panel && !panel.classList.contains('ending')) { const row = panel.querySelector('.row2[data-i="3"]'); if (row) { row.click(); return; } const c = panel.querySelector('.close'); if (c && !panel.querySelector('.tabs button[data-i]')) { /* 玩法/卷宗 */ } }
  }, 120);
}, prefer);
const ev = (fn, ...args) => page.evaluate(fn, ...args);
const waitIdle = async (ms = 20000) => { const t0 = Date.now(); let idleSince = null; while (Date.now() - t0 < ms) { const busy = await ev(() => !!document.querySelector('#dlg.show') || !!document.querySelector('#overlay.show') || window.game.director.busy || window.game.r.final.uniforms.uFade.value > 0.01 || !window.game.player || window.game.player.locked); if (!busy) { if (idleSince == null) idleSince = Date.now(); else if (Date.now() - idleSince > 1500) return true; } else idleSince = null; await page.waitForTimeout(150); } return false; };
const state = () => ev(() => { const g = window.game; return { day: g.director.day, phase: g.director.phase, hour: +g.clock.hour.toFixed(2), vars: g.state.vars, flags: Object.keys(g.state.flags), clues: g.state.clues.map(c => c.id), items: g.state.items, quests: Object.values(g.state.quests).map(q => (q.done ? '✓' : '·') + q.title), px: +g.player?.x.toFixed(1), pz: +g.player?.z.toFixed(1) }; });
const tp = (x, z) => ev(([x, z]) => { const g = window.game; g.player.x = x; g.player.z = z; g.player.path = null; g.r.follow(x, g.world.groundAt(x, z), z, true); }, [x, z]);
const talk = async (id) => { const ok = await ev((id) => { const g = window.game; const e = g.npc(id); if (!e || !e.visible) return false; g.player.x = e.x + 0.8; g.player.z = e.z + 0.8; g.player.path = null; g.r.follow(g.player.x, e.y, g.player.z, true); g.director.interact(e); return true; }, id); if (!ok) console.log('  (no npc', id, ')'); await page.waitForTimeout(300); await waitIdle(40000); return ok; };
const hot = async (id) => { const ok = await ev((id) => { const g = window.game; const h = g.director.hotspots.find(h => h.id === id); if (!h || !h.active()) return false; g.player.x = h.x + 0.5; g.player.z = h.z + 0.5; g.player.path = null; g.r.follow(g.player.x, h.y, g.player.z, true); g.director.interact(h); return true; }, id); if (!ok) console.log('  (no hotspot', id, ')'); await page.waitForTimeout(300); await waitIdle(40000); return ok; };
const setHour = (h) => ev((h) => { window.game.clock.set(h); }, h);
const step = async (name) => { console.log('==', name, JSON.stringify(await state())); };

// ── 开卷 ──
if (scenario === 'night') {
  await ev(() => { const g = window.game; g.ui.title.remove(); g.director.titlePan = false; g.cinematicCam = false; const st = g.state; st.reset(); st.vars.trust = 2; st.vars.knew = 1; for (const f of ['hegong_friend', 'c_zha2', 'c_grain', 'debt_keep', 'qian1', 'tamiao']) st.flag(f); st.give('jiejv'); st.give('zhafu'); g.director.day = 4; g.spawnPlayer(81.5, 56); g.ui.showHUD(true); g.r.fade(1); g.director.startNight(); });
  await page.waitForTimeout(500); await waitIdle(60000); await step('night start'); await shot('night-start');
} else {
await page.click('#title [data-a=start]');
await page.waitForTimeout(500); await shot('intro');
await waitIdle(90000); await step('after intro');
await shot('day1-start');
if (scenario === 'intro') { await browser.close(); process.exit(0); }
// ── 三天 ──
const rest = async () => { await tp(81.5, 56); await hot('inn_rest'); await waitIdle(40000); };
for (let guard = 0; guard < 4; guard++) {
  const st0 = await state(); if (st0.phase !== 'day') break;
  const day = st0.day;
  if (day === 1) {
    await talk('innkeeper'); await talk('changboxi'); await step('yamen');
    await tp(38, 34); await page.waitForTimeout(600); await waitIdle(60000); await step('tamiao'); await shot('tamiao');
    await setHour(15); await talk('laohegong'); await step('hegong'); await shot('tingdi');
    await talk('qidazhu'); await talk('fenglaosi'); await talk('ayang');
    await setHour(20); await page.waitForTimeout(1500);
    await ev(() => { window.game.player.sneak = true; }); await tp(42.3, 22.6); await page.waitForTimeout(1500); await waitIdle(60000); await step('sluice night'); await shot('sluice-night');
    await ev(() => { window.game.player.sneak = false; });
  } else if (day === 2) {
    await shot('day2');
    await tp(33.5, 47); await page.waitForTimeout(800); await waitIdle(30000); await step('holiday');
    await talk('merchant'); await talk('fenglaosi'); await talk('changboxi'); await step('zhang'); await shot('zhang');
    await talk('qidazhu'); await talk('qianguanjia'); await talk('boatman');
    await setHour(15); await page.waitForTimeout(1500); await talk('qinbing'); await step('qinbing');
  } else if (day === 3) {
    await shot('day3');
    await talk('fenglaosi'); await talk('changboxi'); await talk('laohegong'); await talk('monk'); await step('day3 talks');
    await setHour(18); await tp(81.5, 56); await hot('tuisuan'); await page.waitForTimeout(800); await waitIdle(60000); await step('tuisuan');
    for (let i = 0; i < 14; i++) { const ids = await ev(() => window.game.director.hotspots.filter(h => h.id.startsWith('door_') && h.active()).map(h => h.id)); if (!ids.length) break; await hot(ids[0]); }
    await hot('evac_end'); await waitIdle(30000); await step('night start'); await shot('night-start');
    break;
  }
  const s1 = await state(); if (s1.phase === 'day' && s1.day === day) await rest();
}
}
// ── 端午夜 ──
await talk('changboxi'); await step('gong'); await shot('gong');
await talk('qianguanjia'); await step('boat');
await ev(() => { window.game.player.sneak = true; }); await tp(42.3, 22.6); await page.waitForTimeout(1500); await waitIdle(60000); await step('sluice'); await shot('sluice'); await ev(() => { window.game.player.sneak = false; }); await tp(40, 30);
await tp(33.5, 44.5); await page.waitForTimeout(300); await ev(() => window.game.director.useGong()); await page.waitForTimeout(1500); await step('gong rung'); await shot('village-gong');
await talk('laohegong');
for (let i = 0; i < 14; i++) { const ids = await ev(() => window.game.director.hotspots.filter(h => h.id.startsWith('door_') && h.active()).map(h => h.id)); if (!ids.length) break; await hot(ids[0]); }
await step('after knocks');
// 带人上山：传送到山脚，让他们自己走最后一段
await tp(31.5, 66); await ev(() => { const g = window.game; for (const f of g.director.followers) { f.x = 31 + Math.random() * 3; f.z = 60 + Math.random() * 4; f.path = null; } }); await page.waitForTimeout(500); await shot('followers'); await tp(22, 92); await page.waitForTimeout(500); await ev(() => { const g = window.game; for (const f of g.director.followers) { f.x = 24 + Math.random() * 3; f.z = 86 + Math.random() * 2; f.path = null; } }); await page.waitForTimeout(9000); await step('at temple'); await shot('temple');
// 等决堤
await ev(() => { window.game.clock.hour = 22.9; }); await page.waitForTimeout(500); await waitIdle(30000); await page.waitForTimeout(4000); await step('breach'); await shot('breach');
await page.waitForTimeout(12000); await tp(36, 56); await page.waitForTimeout(1500); await shot('flood1'); await step('flood1');
await tp(45, 19.6); await hot('yaopai'); await step('yaopai');
await tp(20, 97); await page.waitForTimeout(16000); await waitIdle(60000); await step('ayang'); await shot('flood2');
await tp(30, 74); await page.waitForTimeout(30000); await shot('flood3');
// 上船
await hot('boat_board'); await page.waitForTimeout(500); await step('boat'); await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w'); await page.keyboard.down('a'); await page.waitForTimeout(2000); await page.keyboard.up('a'); await shot('boat');
await ev(() => { window.game.clock.hour = 0.98; }); await page.waitForTimeout(6000); await shot('hu'); await step('hu');
await page.waitForTimeout(20000); await shot('hu2'); await waitIdle(180000); await page.waitForTimeout(1000); await step('ending'); await shot('ending');
await page.waitForTimeout(1500); await shot('tally');
console.log('PICKS', await ev(() => window.__picks));
console.log('ERRORS', errors.length, errors.slice(0, 10));
await browser.close();
