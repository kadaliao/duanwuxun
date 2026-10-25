// 小游戏：听堤、算账。
import { wait } from '../director.js';

// 听堤：跟着吴老倌沿堤走，每一处竹竿戳下去，听声辨"实""空"。
export async function tingdi(d) {
  const g = d.g, ui = g.ui, audio = g.audio;
  const spots = [];
  // 8 处，其中闸口附近两处是空的，另随机一处空
  const xs = [26, 30, 34, 38, 42, 44, 47, 52];
  const hollowSet = new Set([5, 6, (Math.random() < 0.5 ? 1 : 3)]);
  xs.forEach((x, i) => spots.push({ x, hollow: hollowSet.has(i) }));
  let right = 0;
  const panel = () => ui.showPanel('听堤', '');
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    // 走到那一处
    g.player.locked = true; g.cinematicCam = true;
    g.player.goTo(s.x + 0.5, 19.5); const h = d.g.npc('laohegong'); if (h) h.goTo(s.x - 1, 19.6);
    g.r.follow(s.x, 2.2, 19.5);
    await waitUntil(() => !g.player.path, 6000);
    // 戳一下：声音
    await wait(300);
    if (s.hollow) { audio.tone(140, 0.5, 'triangle', 0.35); audio.noise(0.4, 300, 0.7, 0.25, 'lowpass'); }
    else { audio.tone(90, 0.18, 'sine', 0.3); audio.noise(0.1, 200, 0.5, 0.3, 'lowpass'); }
    const a = await d.choose('laohegong', i === 0 ? '竹竿戳下去。你听：闷的，是实的；空的，里头有洞。这一处，是实的还是空的？' : '这一处呢？', [
      { id: 'solid', text: '实的' }, { id: 'hollow', text: '空的' }, { id: 'again', text: '再戳一下听听' },
    ]);
    if (a === 'again') { i--; continue; }
    const ok = (a === 'hollow') === s.hollow;
    if (ok) { right++; ui.toast(s.hollow ? '<b>空</b>里头有洞' : '<b>实</b>', 'dark'); }
    else { ui.toast('听岔了', 'red'); audio.bad(); }
    if (s.x >= 44 && s.x <= 47 && s.hollow) { await d.say('laohegong', '闸这一段……空的。去年新砌的条石，底下怎么会空？'); }
  }
  g.player.locked = false; g.cinematicCam = false;
  return right;
}

// 算账：河工账。找出对不上的那一行。
export async function hegongzhang(d) {
  const g = d.g, ui = g.ui;
  const rows = [
    { name: '条石', note: '上游山里采运', qty: 12000, unit: '块', price: 20, total: 240000 },
    { name: '夯土', note: '民夫工食', qty: 3000, unit: '工', price: 0.3, total: 900 },
    { name: '闸门铁件', note: '杭州铁铺', qty: 1, unit: '副', price: 1800, total: 1800 },
    { name: '闸底条石换新', note: '三月，不在原估之内', qty: 300, unit: '块', price: 2, total: 800 },
    { name: '柳桩', note: '护坡', qty: 8000, unit: '根', price: 0.1, total: 800 },
  ];
  const fmt = (n) => n >= 10000 ? (n / 10000) + '万两' : n + '两';
  const html = `<div class="abacus"><p style="color:var(--ink2);font-size:14px">嘉靖三十九年新安江河工，淳安段。常伯熙说账是马府台衙门里报过来的，他只是照抄。你一行一行地算。<b>点那一行对不上的。</b></p>
    ${rows.map((r, i) => `<div class="row2" data-i="${i}" style="cursor:pointer"><div class="lab">${r.name}<small>${r.note}</small></div><div style="flex:1;color:var(--ink2)">${r.qty}${r.unit} × ${r.price}两</div><div class="sum">${fmt(r.total)}</div></div>`).join('')}
    <div class="total">合计 <b>二十四万四千三百两</b>　（户部结账：二百万两）</div></div>`;
  const p = ui.showPanel('河工账', html);
  const picked = await new Promise(res => { p.querySelectorAll('.row2').forEach(r => r.onclick = () => res(parseInt(r.dataset.i, 10))); p.querySelector('.close').addEventListener('click', () => res(-1)); });
  ui.closePanel();
  return picked; // 3 = 闸底条石换新（300×2=600，账上 800；更要紧的是：三月换闸底）
}

export function waitUntil(fn, timeout = 5000) { return new Promise(res => { const t0 = performance.now(); const tick = () => { if (fn() || performance.now() - t0 > timeout) res(); else requestAnimationFrame(tick); }; tick(); }); }
