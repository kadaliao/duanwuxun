// 黎明、马宁远、五月初十胡宗宪问话、结算。
import { wait } from '../director.js';

export async function ending(d, { saved, total }) {
  const g = d.g, st = g.state, ui = g.ui, s = g.map.spots;
  d.phase = 'ending'; g.weather.set(0.3, false); g.audio.setMood('sorrow');
  // 黎明
  g.clock.set(6.2); g.clock.dark = 0.3; g.clock.running = false;
  d.clearNPCs(); g.player.locked = true; g.player.visible = true;
  g.player.x = s.templeSteps[0]; g.player.z = s.templeSteps[1]; g.player.path = null; g.r.follow(g.player.x, 6.2, g.player.z, true); g.cinematicCam = true;
  // 山上的人
  const n = Math.min(24, Math.round(saved / 7));
  for (let i = 0; i < n; i++) { const e = d.place('surv' + i, 12 + Math.random() * 14, 98 + Math.random() * 6, { look: ['villager_m', 'villager_f', 'villager_old', 'villager_child', 'villager_m2', 'villager_f2'][i % 6], name: '村民' }); e.interact = null; }
  g.flood.active = false;
  await ui.fadeIn(1500);
  ui.setDay('五月初六');
  await d.narr('天亮了。雨小了。站在龙王庙的台阶上往下看，淳安一县、建德半县，成了一片泽国。田没有了，村子没有了，只剩下一些屋顶和树梢露在水面上，像是一张被水浸透的账册，字都化开了。');
  await d.narr(`冯家村${total}口人。你在心里数了一遍。` + (saved > 0 ? `山坡上的人里，有${saved}人是你叫上来、拉上来的。` : '山坡上的人，没有一个是你叫上来的。') + '下游七个县，保住了。');
  if (st.has('hegong_dead')) await d.narr('吴老倌没有回来。');
  if (st.get('ayang') === 'roof' || (st.has('ayang_roof') && !st.has('ayang_saved'))) { st.set('ayang', 'lost'); await d.narr('冯老四坐在庙门口，不哭，也不说话，怀里抱着一只阿秧的小鞋。'); }
  // 马宁远
  await d.narr('上午，官府的船来了。领头的是马宁远，他站在船头，亲自往屋顶上伸竹竿，一船一船地往高处送人。他浑身湿透，眼睛通红，像是一夜没睡。');
  await d.think('同一个人。');
  const ma = d.place('maningyuan', g.player.x - 2, g.player.z + 1, { face: [1, 0] }); ma.interact = null;
  if (st.has('captured')) {
    await d.say('maningyuan', '程大人。蒋千户说，昨夜在闸口，捆了一个户部的人。我说，不会的。程大人昨夜' + (st.get('knew') === 2 ? '病着，在县衙歇着' : '在县衙喝酒') + '。');
    await d.narr('他看着你，等你说话。');
    const a = await d.choose('player', '', [{ id: 'lie', text: '"马府台说得对。"' }, { id: 'truth', text: '"下官昨夜在闸口。"' }]);
    if (a === 'lie') { await d.say('maningyuan', '那就好。'); st.set('ma_dawn', 'lie'); }
    else { await d.narr('马宁远沉默了很久。'); await d.say('maningyuan', '程大人，你不该去。去了，[[就别说出来::他也去过。]]。'); st.set('ma_dawn', 'truth'); st.add('xian', 1); }
  } else if (st.has('saw_dike')) {
    const a = await d.choose('maningyuan', '程大人昨夜在哪里？', [{ id: 'cun', text: '"在冯家村，叫人上山。"' }, { id: 'truth', text: '"在闸口。"' }]);
    if (a === 'cun') { await d.say('maningyuan', saved >= 60 ? '救下来不少。' : '就这些？'); st.set('ma_dawn', 'cun'); }
    else { await d.narr('马宁远的脸一下子僵住了。'); await d.say('maningyuan', '程大人，[[有些地方，去了，就别说出来::他也去过。]]。'); st.set('ma_dawn', 'truth'); st.add('xian', 1); }
  } else { await d.say('maningyuan', '程大人在这里？'); await d.narr('他看了看你身后那些人，没有说话，拱了拱手，又上了船。'); }
  await ui.fadeOut(1000);
  // 五月初十
  await ui.chapter('杭州', '五月初十', ['胡宗宪在淳安的堤上守了两天两夜，初八才回杭州。', '布政使司、按察使司、织造局，很快就递上了公文：河堤修得不牢，汛期水大，冲决成灾。', '修堤贪墨、疏于河防的，是杭州知府马宁远、淳安知县常伯熙、建德知县张知良，还有一个宫里派来监管河道的太监，李玄。', '四个人，四个名字，一个不多，一个不少。']);
  d.clearNPCs(); g.clock.set(21); g.clock.dark = 0.2; g.weather.set(0.4, false);
  g.player.x = s.yamenInside[0]; g.player.z = s.yamenInside[1] + 1.2; g.player.path = null; g.r.follow(g.player.x, 0.85, g.player.z, true);
  const hu = d.place('huzongxian', s.yamenInside[0], s.yamenInside[1] - 1, { face: [0, 1] }); hu.interact = null;
  await ui.fadeIn(800);
  await d.narr('初十夜里，总督衙门的人来请你。');
  const ch = [];
  if (st.has('evidence')) { ch.push({ id: 'all', text: '交出腰牌，把看见的都说了', tag: '腰牌' }); ch.push({ id: 'keep', text: '说出闸口看见的事，腰牌留在自己身上', tag: '守黑' }); }
  else if (st.has('saw_dike')) ch.push({ id: 'saw', text: '说出闸口看见的事' });
  if (st.has('c_zhang')) ch.push({ id: 'zhang', text: '交出河工账：三月换过闸底的石头', tag: '河工账' });
  ch.push({ id: 'none', text: '"下官那一夜在冯家村。闸口的事，下官没看见。"' });
  const a = await d.choose('huzongxian', '你在淳安。那一夜，你看见了什么？', ch);
  if (a === 'all') { await d.narr('你把那块腰牌放在了他的桌上，又把闸口看到的事说了。蒋千户，号衣，铁钎，"子时以前"。胡宗宪拿起腰牌，翻过来看了一眼，又放下，用手按住。按了很久。'); st.set('told', 'all'); st.flag('evidence_given'); st.add('hu', 2); }
  else if (a === 'keep') { await d.narr('你把闸口看到的事说了。那块腰牌，在你怀里，你没有拿出来。胡宗宪一言不发地听完。'); st.set('told', 'saw'); st.flag('kept_yaopai'); st.add('hu', 1); d.ledger('yaopai_kept', '把柄', '何茂才', '按察使司的腰牌还在你身上。胡部堂不知道。'); }
  else if (a === 'saw') { await d.narr('你把闸口看到的事说了。蒋千户，号衣，铁钎，"子时以前"。胡宗宪一言不发地听完。'); st.set('told', 'saw'); st.add('hu', 1); }
  else if (a === 'zhang') { await d.narr('你把河工账放在他桌上，指着那一行：三月，闸底条石换新。胡宗宪看了很久。'); await d.say('huzongxian', '三月。那时候改稻为桑的旨意刚下。'); st.set('told', 'zhang'); st.add('hu', 1); }
  else { await d.narr('胡宗宪看了你很久。'); await d.say('huzongxian', '没看见，就是没看见。'); st.set('told', 'none'); }
  if (a !== 'none') {
    await d.say('huzongxian', '这些话，出了这个门，你一个字也没说过。四个人，明天问斩。' + (a === 'all' ? '腰牌，我带进京。' : ''));
    await d.say('huzongxian', '程知白。你是户部的人。户部的呈文，你打算怎么写？');
  } else await d.say('huzongxian', '四个人，明天问斩。户部的呈文，你打算怎么写？');
  const w = await d.choose('player', '', [{ id: 'tianzai', text: '天灾。端午汛，三天三夜的暴雨。' }, { id: 'hefang', text: '河防。河工放假，堤上无人。' }, { id: 'renhuo', text: '人祸。九县堰口一夜齐开，水做不到这样齐。' }]);
  st.set('report', w);
  if (w === 'renhuo') { await d.say('huzongxian', '人祸两个字写上去，户部、严党、宫里，各自会看到。你想清楚了？'); await d.say('player', '想清楚了。'); st.add('xian', 2); }
  else if (w === 'hefang') await d.say('huzongxian', '河防。不说是谁，只说堤上没人。你比我会写。');
  else await d.say('huzongxian', '天灾。好。天灾。');
  await d.say('huzongxian', '绩溪离歙县，八十里。回去的时候，替我看一眼家里的田。');
  await ui.fadeOut(1200);
  await tally(d, { saved, total });
}

async function tally(d, { saved, total }) {
  const g = d.g, st = g.state, ui = g.ui;
  const v = st.vars; const ratio = saved / total;
  let title, verdict;
  const evidence = st.has('evidence_given'), kept = st.has('kept_yaopai'), report = st.get('report');
  if (ratio >= 0.8 && (evidence || kept)) { title = '知白守黑'; verdict = '大半个村子上了山，证据在你手里。知其白，守其黑——父亲取这个名字的时候，大概就是这个意思。'; }
  else if (ratio >= 0.8) { title = '活民'; verdict = '你没有拿到证据。可冯家村的人，大半是你叫上来的。账上没有这一笔，心里有。'; }
  else if (evidence && report === 'renhuo') { title = '人祸'; verdict = '你把人祸两个字写进了户部的呈文。严党、宫里、清流，各自都看到了。你的名字，从此有人记着。'; }
  else if (kept) { title = '守黑'; verdict = '腰牌在你身上。胡部堂不知道，何茂才不知道。这块腰牌，日后会是一把刀，也可能是一把插向你的刀。'; }
  else if (ratio >= 0.4) { title = '半县'; verdict = '救了一些人，没救下更多。淹一个半县，保七个半县——这道算术题，你算过了，答案你不喜欢。'; }
  else if (st.has('captured')) { title = '闸房'; verdict = '那一夜你被捆在闸房的柱子上，看着他们干完了剩下的活。你看见了，可你什么也没做成。'; }
  else { title = '天灾'; verdict = '公文上写的是天灾。你知道不是。可账上，只有公文上的字。'; }
  const row = (k, val) => `<div><span>${k}</span><b>${val}</b></div>`;
  const ayang = st.get('ayang'); const ayangTxt = ayang === 'saved' || ayang === 'saved_swim' ? '救下了' : ayang === 'lost' ? '没有' : st.has('ayang_roof') ? '没有' : '随冯家上了山';
  const html = `<div class="big">${title}<small>端午汛 · 结账</small></div><div class="verdict">${verdict}</div>
    <div class="grid">${row('活民', `${saved} / ${total}`)}${row('阿秧', ayangTxt)}${row('吴老倌', st.has('hegong_dead') ? '没有回来' : st.has('hegong_friend') ? '活着' : '不相识')}${row('证据', evidence ? '交给了胡宗宪' : kept ? '留在身上' : st.has('saw_dike') ? '只有眼睛看见的' : '无')}
    ${row('户部呈文', report === 'renhuo' ? '人祸' : report === 'hefang' ? '河防' : '天灾')}${row('分洪时', v.fh === 'truth' ? '照实报数' : v.fh === 'lie' ? '说都上山了' : '求再等半个时辰')}${row('胡部堂', '●'.repeat(Math.max(0, v.hu)))}${row('树敌', '●'.repeat(Math.max(0, v.xian)))}${row('暗账', st.ledger.length + ' 笔')}${row('线索', st.clues.length + ' 条')}</div>
    <h3>原剧对照</h3><div style="font-size:14px;color:var(--ink2);line-height:1.7">严世蕃密信毁堤（第3集）；胡宗宪当夜上堤分洪，只淹淳安一县、建德半县（第3集）；马宁远、常伯熙、张知良、李玄被以"贪墨河款"问斩（第4集）。大势改不了。你改了的，是上面那几行。</div>
    <div class="btnrow" style="margin-top:16px"><button data-a="again">再走一遍端午汛</button><button data-a="title">回到标题</button></div>`;
  g.r.fade(1);
  const p = ui.showPanel('结账', html, { cls: 'ending' });
  p.querySelector('.close').style.display = 'none';
  p.querySelector('[data-a=again]').onclick = () => { localStorage.removeItem('dwx_save'); location.reload(); };
  p.querySelector('[data-a=title]').onclick = () => location.reload();
  localStorage.setItem('dwx_best', JSON.stringify({ title, saved, total, t: Date.now() }));
}
