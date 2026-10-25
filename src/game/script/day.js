// 三天白天的内容：人物布置、对话、要事、小游戏、夜里的潜行。
import { wait } from '../director.js';
import { tingdi, hegongzhang, waitUntil } from './minigames.js';

const HOUSE_DOORS = (map) => map.buildings.filter(b => b.type === 'thatch' && (b.id || '').startsWith('house') || b.id === 'feng_home').map(b => ({ id: b.id, x: b.x + Math.sin(b.rot || 0) * (b.d / 2 + 0.7), z: b.z + Math.cos(b.rot || 0) * (b.d / 2 + 0.7), b }));
export { HOUSE_DOORS };

export async function setupDay(d, day, loaded) {
  const g = d.g, st = g.state, s = g.map.spots;
  placeCommon(d, day);
  if (day === 1) setupDay1(d, loaded);
  if (day === 2) setupDay2(d, loaded);
  if (day === 3) setupDay3(d, loaded);
  setupNightWatch(d, day);
  // 客栈：歇息
  d.hotspot('inn_rest', s.innDoor[0], s.innDoor[1] - 0.6, '客栈', '歇息', async () => {
    const h = g.clock.hour;
    if (h < 17) { const a = await d.choose('innkeeper', '程大人，天还早着呢。这就歇了？', [{ id: 'y', text: '歇了。今天没什么要做的了。' }, { id: 'n', text: '再走走。' }]); if (a !== 'y') return; }
    await d.narr('你回到客房，吹了灯。' + (day === 3 ? '明天就是端午。' : ''));
    d.endDay();
  }, { r: 1.6, h: 2.2 });
  if (!loaded) {
    if (day === 1) { d.quest('q_hetian', '去冯家村核田', '户部派你来，是核算田亩。堤下的田，还没有核。出西门往西，沿大路走。', { x: 38, z: 30 }); d.quest('q_yamen', '去县衙拜会常伯熙', '淳安知县常伯熙一早差人来问过。县衙在城北，客栈出门往东。', { npc: 'changboxi' }); }
    if (day === 2) { d.quest('q_dukou', '去渡口看看沈家的粮船', '沈一石说，粮囤在码头上。渡口在城北门外。', { npc: 'qianguanjia' }); d.quest('q_zhang', '查河工账', '二百万两修的堤。账在县衙，拿户部札付去要。', { npc: 'changboxi' }); }
    if (day === 3) { d.quest('q_tuisuan', '夜里回客栈，把线索摆开算一算', '申时以后，客栈客房。这些数摆在一处，只差一个日子。', { hs: 'tuisuan' }); d.quest('q_zongzi', '去冯家村', '明天是端午，家家户户在包粽子。去看看冯老四和阿秧。', { npc: 'fenglaosi' }); }
  }
}

function placeCommon(d, day) {
  const g = d.g, st = g.state, s = g.map.spots;
  // 店家
  d.place('innkeeper', s.innDoor[0] + 1.6, s.innDoor[1] + 0.4, { look: 'merchant', talk: async (e) => {
    const lines = { 1: '程大人起了？县衙的常老爷一早差人来问过，说大人得空请去县衙坐坐。', 2: '程大人，昨夜江上风大，您听见没有？堤上的柳树响了一夜。', 3: '明天端午，县衙设宴，常老爷又差人来说了，请大人务必赏光。' };
    await d.say('innkeeper', lines[day]);
    if (day === 2 && !st.has('inn_tianqi')) { await d.say('innkeeper', '对了，大人要是去街上，别理米行那个掌柜。他这几天逢人就问[[家里有没有田契::米商不种田，收田契做什么？::c_tianqi]]。'); st.flag('inn_tianqi'); }
  } });
  // 城里人
  const towns = [[80, 45.5, 'townsman', '城里人'], [94, 46, 'merchant', '布商'], [108, 45.5, 'townsman', '城里人'], [100, 52, 'villager_f', '妇人'], [117, 46, 'townsman', '城里人']];
  towns.forEach(([x, z, look, name], i) => d.place('town' + i, x, z, { look, name, wander: { r: 5, pause: 3 }, talk: async (e) => {
    const pool = [
      '听说改稻为桑的事了吗？城里的田都还没动，先动的是堤下面那几个村。',
      '今年的雨水不对。往年这时候早该下几场透雨了，今年一滴没有，端午前后怕是要一齐下。',
      '马府台的兵前几天在堤下踏苗，踏得哭声震天。官府说改桑，谁敢不改？',
      '米行这几天在收田契，出的价钱低得离谱。可怪的是，真有人卖。',
      '龙王庙在后山上，地势高。老辈人说，道光……不对，嘉靖十几年发大水那回，全村人都是躲到庙里才活下来的。',
      '沈老板的粮船在渡口停了十几条，吃水深得很。丝商囤粮，头一回见。',
    ];
    await d.say(e.id, pool[(i + day) % pool.length]);
  } }));
  // 米行掌柜（铺面）
  d.place('merchant', 83.5, 43.2, { name: '米行掌柜', talk: async (e) => {
    if (!st.has('merchant_asked')) {
      await d.say('merchant', '这位老爷面生。是来卖田的？小号收田契，现银，一亩给三石谷子的价。');
      const a = await d.choose('player', '', [{ id: 'why', text: '"米行不种田，收田契做什么？"' }, { id: 'price', text: '"三石谷子一亩？好田要十石。"' }, { id: 'no', text: '"不卖。"' }]);
      if (a === 'why') { await d.say('merchant', '[[东家吩咐的::他的东家是谁？淳安城里，能让米行提前收田契的东家，不多。::c_tianqi]]。小的只管收。'); }
      else if (a === 'price') { await d.say('merchant', '老爷，现在是十石。[[过了端午::他在等端午。端午之后，田价会变。::c_tianqi]]，就不是这个价了。'); }
      else await d.say('merchant', '不卖就不卖。老爷要是认识堤下村里的人，替小号带个话。');
      st.flag('merchant_asked');
    } else await d.say('merchant', '老爷还是不卖？过了端午，就不是这个价了。');
  } });
  // 差役（县衙门口）
  d.place('chaiyi', 98, 44.2, { talk: async (e) => { await d.say('chaiyi', day === 3 ? '程大人，明天端午，老爷在县衙设宴，请大人务必赏光。' : '程大人，老爷在堂上。'); } });
  // 常伯熙
  d.place('changboxi', s.yamenInside[0], s.yamenInside[1] - 0.8, { face: [0, 1], talk: (e) => talkChang(d, e, day) });
  // 冯老四、阿秧
  const fh = s.fengHome;
  d.place('fenglaosi', fh[0] - 1, fh[1] + 0.5, { wander: { r: 1.5, pause: 4 }, talk: (e) => talkFeng(d, e, day) });
  d.place('ayang', fh[0] + 1.2, fh[1] + 1, { wander: { r: 2.5, pause: 2 }, talk: (e) => talkAyang(d, e, day) });
  // 村民
  const vs = [[28, 44, 'villager_m', 'cunmin_m'], [31, 47.5, 'villager_f', 'cunmin_f'], [38.5, 47, 'villager_m2', 'cunmin_m'], [27, 50, 'villager_old', 'cunmin_old'], [36, 40, 'villager_f2', 'cunmin_f'], [41, 46, 'villager_child', 'cunmin_m']];
  vs.forEach(([x, z, look, ch], i) => d.place('v' + i, x, z, { look, name: ch === 'cunmin_old' ? '老婆婆' : ch === 'cunmin_f' ? '村妇' : look === 'villager_child' ? '小孩' : '村民', wander: { r: 3, pause: 3 }, talk: async (e) => {
    const t = st.get('trust');
    const pool = t <= 0 ? ['官老爷……小的什么都不知道。', '……', '田要改桑，官府的事，小的不敢说。'] : t <= 2 ? ['官老爷，那天在田里，小的看见您了。', '改桑？桑叶又不能当饭吃。', '堤上这几天夜里有火把，不知道是做什么的。'] : ['程大人！吴老倌说您是个好官。', '大人，您说今年的雨会大，我们信您。', '大人要是有话，村里人都听。'];
    if (ch === 'cunmin_old') await d.say('cunmin_old', t >= 2 ? '官老爷，我七十六了。嘉靖十几年那回大水，就是躲在龙王庙里活下来的。腿脚不行了，再发水，怕是走不到山上去。' : '谁啊？我耳朵背。');
    else await d.say(ch, pool[(i + day) % pool.length]);
  } }));
  // 吴老倌：白天在堤上
  d.place('laohegong', 30 + day * 3, 19.5, { wander: { r: 5, pause: 2 }, talk: (e) => talkHegong(d, e, day) });
  // 齐大柱
  d.place('qidazhu', day === 2 ? 60 : 52, 40.5, { wander: { r: 2, pause: 3 }, talk: (e) => talkQi(d, e, day) });
  // 渡口：钱管家、船夫
  d.place('qianguanjia', 103, 20.6, { face: [0, 1], talk: (e) => talkQian(d, e, day) });
  d.place('boatman', 98.5, 7.5, { talk: async (e) => { await d.say('boatman', day === 1 ? '老爷要过江？今天风大，船不开。' : '这些粮船停了十来天了，一袋粮也没卸。老爷您说怪不怪？'); } });
  // 龙王庙庙祝
  d.place('monk', 19, 100.5, { talk: async (e) => { await d.say('monk', '施主上山来了。龙王庙地势高，嘉靖十几年发大水那回，半个村子的人都挤在这里。'); await d.say('monk', '龙王爷管水。今年端午的香火，我看比往年都旺。都是堤下村里的人来烧的。'); st.flag('knew_temple'); } });
}

// ───── 常伯熙 ─────
async function talkChang(d, e, day) {
  const g = d.g, st = g.state;
  d.meet('changboxi');
  if (day === 1) {
    if (!st.has('chang1')) {
      await d.say('changboxi', '程大人！下官常伯熙，淳安知县。大人从京里来，一路辛苦。田亩的册子下官都备好了，大人[[核得快些，早核早好::他希望你早点核完，早点走。]]。');
      const a = await d.choose('player', '', [{ id: 'dike', text: '"堤下的田，马府台的兵在踏苗。户部还没核，谁让踏的？"' }, { id: 'thanks', text: '"有劳常大人。下官这就去看。"' }]);
      if (a === 'dike') await d.say('changboxi', '这……上头的札子，改稻为桑，限期。马府台是河道总管，兵是他从戚将军营里借的。下官一个知县，[[管不着::他把自己摘出去了。踏苗的是兵，下令的是马宁远，他只是"管不着"。]]。');
      else await d.say('changboxi', '大人慢走。');
      st.flag('chang1'); d.done('q_yamen');
    } else await d.say('changboxi', '大人核田核得如何？册子上有什么不对的，尽管问下官。');
  } else if (day === 2) {
    if (!st.has('zhang_done')) {
      await d.say('changboxi', '程大人今天又来了。');
      const a = await d.choose('player', '', [{ id: 'zhang', text: '"户部奉旨核算田亩河工。新安江堤淳安段的河工账，请常大人拿出来。"', tag: '户部札付' }, { id: 'chat', text: '"随便坐坐。"' }]);
      if (a === 'zhang') {
        await d.say('changboxi', '河工账……是马府台衙门里报过来的，下官只是照抄了一份存档。大人要看，下官不敢不给。');
        await d.narr('他从柜子里取出一本薄薄的册子。你翻开，一行一行地算。');
        const pick = await hegongzhang(d);
        if (pick === 3) { await d.think('闸底条石换新，三月。去年腊月才修好的堤，为什么三月就要换闸底的石头？换下来的石头，又去了哪里？'); d.clue('c_zhang'); d.item('hegongzhang', '河工账'); st.flag('zhang_done'); d.done('q_zhang'); await d.say('changboxi', '大人……这一笔是马府台亲自批的，下官真的不知道。'); }
        else if (pick >= 0) { await d.think('这一行没什么不对。你又算了一遍。'); await d.say('changboxi', '大人要不要歇一歇再算？'); }
        else await d.say('changboxi', '大人不看了？');
      } else await d.say('changboxi', '大人请。茶是今年的新茶。');
    } else await d.say('changboxi', '大人，那本账……下官求大人，别说是下官给的。');
  } else {
    if (!st.has('chang3')) {
      await d.say('changboxi', '程大人，明天端午，县衙设宴，请大人务必赏光。[[大人明晚就在县衙歇着::他希望你明晚待在县衙，哪里也别去。]]，下官备了客房。');
      await d.say('changboxi', '堤上的河工，县里放了三天假，回家过节。[[汛期嘛，让大家松快松快::汛期放假，这话他自己说出来都心虚。::c_holiday]]。');
      st.flag('chang3');
    } else await d.say('changboxi', '大人明晚一定要来。一定。');
  }
}
// ───── 冯老四 ─────
async function talkFeng(d, e, day) {
  const g = d.g, st = g.state; d.meet('fenglaosi'); const t = st.get('trust');
  if (day === 1) {
    if (!st.has('tamiao')) { await d.say('fenglaosi', '官老爷……秧刚插下去。您是来核田的？小的这两亩田，祖上传下来的。'); return; }
    if (t >= 1) await d.say('fenglaosi', '官老爷，那天要不是您，小的那两亩秧就没了。您要是不嫌弃，进屋喝口水。');
    else await d.say('fenglaosi', '官老爷……');
  } else if (day === 2) {
    if (st.has('c_tianqi') && !st.has('warned_feng')) {
      await d.say('fenglaosi', '官老爷，城里米行的人今天来过，说收田契，一亩三石谷子。小的没卖。可要是改了桑，田也不是田了……');
      const a = await d.choose('player', '', [{ id: 'warn', text: '"田契留着。谁来也别卖。过了端午，再说。"' }, { id: 'sell', text: '"卖不卖，是你自己的事。"' }]);
      if (a === 'warn') { await d.say('fenglaosi', '官老爷这么说，小的就留着。田契比命要紧，小的跟阿秧也是这么说的。'); d.trust(1); st.flag('warned_feng'); }
      else { await d.say('fenglaosi', '……是。'); st.flag('warned_feng'); }
    } else await d.say('fenglaosi', t >= 2 ? '官老爷，今天堤上来了个差役，说河工放假。吴老倌气得竹竿都戳断了。' : '官老爷，小的在给秧补水。');
  } else {
    if (!st.has('zongzi_scene')) { await zongziScene(d); }
    else await d.say('fenglaosi', '明天端午。官老爷有空，来家里吃粽子。');
  }
}
async function talkAyang(d, e, day) {
  const g = d.g, st = g.state; d.meet('ayang');
  if (day === 3 && !st.has('zongzi_scene')) { await zongziScene(d); return; }
  const pool = [
    '官老爷，你的帽子有两个翅膀。', '爷爷说你是京里来的。京里有多大？', '吴爷爷说堤要是破了，水会把村子淹掉。他吓唬我的，对不对？',
  ];
  await d.say('ayang', pool[day - 1] || pool[0]);
  if (day === 2 && st.get('trust') >= 1) await d.say('ayang', '官老爷，龙王庙在山上，我跟爷爷去烧过香。山上一点都不怕水。');
}
async function zongziScene(d) {
  const g = d.g, st = g.state; const t = st.get('trust');
  st.flag('zongzi_scene');
  await d.narr('冯家檐下，一家人在包粽子。明天是端午。');
  if (t >= 1) { await d.say('fenglaosi', '官老爷来了！阿秧，把粽子给官老爷。'); await d.narr('阿秧躲在门后看你，手里攥着一个刚包好的粽子，犹豫了半天，塞到了你手里。'); d.item('zongzi', '粽子'); d.trust(1); }
  else await d.narr('冯老四认出了你，低下头，没有说话。阿秧躲在门后，一直看着你身上的官服。');
  await d.say('ayang', '官老爷，你知道为什么要包粽子吗？爷爷说，以前有个好官，叫屈原。他跟皇上说真话，皇上不听，他就跳江了。我们包粽子丢到江里，叫鱼别吃他。');
  await d.think('你想起了腊月二十九的午门。那个说真话的人，没有江可以跳。');
  const a = await d.choose('ayang', '官老爷，你算盘上能算出今年的雨吗？', [{ id: 'no', text: '"算不出来。"' }, { id: 'yes', text: '"能。今年的雨，会很大。"' }]);
  if (a === 'no') await d.narr('阿秧有点失望。');
  else { await d.narr('阿秧睁大了眼睛。冯老四在旁边笑：小孩子，别听官老爷逗你。'); await d.think('你没有逗她。'); st.flag('told_ayang'); }
  d.done('q_zongzi');
}
// ───── 吴老倌 ─────
async function talkHegong(d, e, day) {
  const g = d.g, st = g.state; d.meet('laohegong');
  if (!st.has('hegong1')) {
    await d.say('laohegong', '官老爷是户部的？我在听堤。竹竿戳下去，声音闷的地方是实的，声音空的地方，里头有獾洞，有蚁穴。我在这堤上守了四十年，哪一段空，哪一段实，闭着眼都知道。');
    if (st.has('tamiao') && st.get('tamiao') !== 'silent') await d.say('laohegong', '今天田里的事，我看见了。' + (st.get('tamiao') === 'stand' ? '官老爷的靴子还是湿的。' : ''));
    st.flag('hegong1');
  }
  const choices = [];
  if (!st.has('tingdi_done')) choices.push({ id: 'tingdi', text: '"老人家，教教下官怎么听堤。"' });
  if (!st.has('c_zha')) choices.push({ id: 'zha', text: '"今年的堤，结实吗？"' });
  choices.push({ id: 'sang', text: '"改稻为桑的事，老人家怎么看？"' });
  if (st.has('c_holiday') && !st.has('hegong_holiday')) choices.push({ id: 'holiday', text: '"县里说河工放假三天。"' });
  choices.push({ id: 'bye', text: '"下官先走了。"' });
  const a = await d.choose('player', '', choices);
  if (a === 'tingdi') {
    await d.say('laohegong', '好。跟我来。竹竿给你一根。');
    d.quest('q_tingdi', '跟吴老倌听堤', '闷的是实的，空的里头有洞。', { npc: 'laohegong' }); d.done('q_hegong');
    const right = await tingdi(d);
    st.flag('tingdi_done'); d.done('q_tingdi');
    if (right >= 6) { await d.say('laohegong', '官老爷耳朵灵。八处听对了' + right + '处，比堤上那些后生强。'); st.flag('hegong_friend'); d.ledger('hegong_friend', '人欠', '吴老倌', '你跟他听了一下午的堤。他说你耳朵灵。'); d.clue('c_hollow'); await d.say('laohegong', '闸那一段，你也听见了。空的。我明天再去听一回。'); }
    else { await d.say('laohegong', '听岔了' + (8 - right) + '处。不打紧，听堤是四十年的功夫。可闸那一段，你总听出来了吧？空的。'); d.clue('c_hollow'); }
  } else if (a === 'zha') {
    await d.say('laohegong', '今年的堤，结实。去年新修的，石头都是从上游山里运下来的。可还有一桩怪事。前几天夜里，有人来看闸。打着火把，穿号衣。看闸门，看闸底的石头，一看看到半夜。这么结实的闸，[[半夜来看什么::闸门是汛期泄水用的。官兵半夜来看，看的是怎么开。::c_zha]]？');
    await d.say('laohegong', '官老爷要是有空，夜里也来看看。戌时以后，他们就来了。');
    d.done('q_hegong'); d.quest('q_nightzha', '戌时以后，去闸口看看', '堤上闸口。别走大路，伏在柳树后面（C 潜行），别让火把照见。', { spot: 'sluice' });
  } else if (a === 'sang') { await d.say('laohegong', '改桑？桑叶又不能吃。官老爷，你们京里的人，见过饿死的人没有？'); await d.narr('你没有答。他也没有等你答。'); }
  else if (a === 'holiday') { await d.say('laohegong', '汛期放假？我守了一辈子堤，没听说过！端午汛是一年里最凶的汛，堤上一个人不留，这是要做什么？'); st.flag('hegong_holiday'); }
}
// ───── 齐大柱 ─────
async function talkQi(d, e, day) {
  const g = d.g, st = g.state; d.meet('qidazhu'); const t = st.get('trust');
  if (day === 1) {
    if (!st.has('tamiao')) { await d.say('qidazhu', '你是官？官就去跟马宁远说，秧都插下去了，踩的是一年的口粮！'); return; }
    if (st.get('tamiao') === 'stand') await d.say('qidazhu', '那天你站进田里，我当你是个疯子。现在想想，你是个官里头的疯子。');
    else if (st.get('tamiao') === 'stall') await d.say('qidazhu', '你拦了一回。他说核完了再踏。那就是还要踏。');
    else await d.say('qidazhu', '你站在堤上看着。看够了？');
  } else if (day === 2) {
    if (!st.has('qi_help')) {
      await d.say('qidazhu', '我要去杭州。淳安、建德几百个人，去总督衙门跪着。胡部堂不说话，我们就一直跪。');
      const a = await d.choose('qidazhu', '你是户部的。你给我写个凭据，就说堤下的田还没核，不许踏苗。有你这张纸，我们跪得硬气。', [{ id: 'write', text: '写。"户部观政程知白：淳安堤下田亩未核，不得毁苗。"' }, { id: 'no', text: '"户部的札付，不能给你们当状纸。"' }]);
      if (a === 'write') { await d.narr('你就着田埂写了那张字据，按了手印。齐大柱接过去，看了很久——他不识字，可他认得官印的红。'); await d.say('qidazhu', '程知白。我记住了。'); d.trust(1); st.add('xian', 1); d.ledger('qi_paper', '人欠', '齐大柱', '你给他写了一张户部的凭据，按了手印。这张纸在哪里，你不知道。'); }
      else await d.say('qidazhu', '不写就不写。你们当官的，都一样。');
      st.flag('qi_help');
    } else await d.say('qidazhu', '明天一早我就走。村里的事，拜托你了。');
  } else {
    await d.say('qidazhu', t >= 2 ? '我明天一早去杭州。我爹娘在村里，你要是……算了。你是个好官。' : '我明天去杭州。');
    st.flag('qi_gone_tomorrow');
  }
}
// ───── 钱管家 ─────
async function talkQian(d, e, day) {
  const g = d.g, st = g.state; d.meet('qianguanjia');
  if (!st.has('qian1')) {
    await d.say('qianguanjia', '程大人？小的姓钱，是沈老板府上的。沈老板吩咐过，程大人到淳安，要小的照应着。');
    await d.say('player', '这些船上，都是粮？');
    await d.say('qianguanjia', '都是粮。湖广来的。东家吩咐，[[过了端午，粮船要往上游走::粮船停在这里，在等。等过了端午，上游的田淹了，粮就能换田。::c_grain]]。');
    st.flag('qian1'); d.done('q_dukou');
  } else {
    const a = await d.choose('qianguanjia', '程大人今天又来渡口了。', [{ id: 'why', text: '"丝商囤粮，等端午。钱管家，你东家在等什么？"' }, { id: 'bye', text: '"随便走走。"' }]);
    if (a === 'why') await d.say('qianguanjia', '大人，小的只是个管家。东家说往上游走，小的就往上游走。[[东家没说的，小的一个字也不敢多::他什么都知道。他什么都不会说。]]。');
  }
}

// ───── 第一天 ─────
function setupDay1(d, loaded) {
  const g = d.g, st = g.state, s = g.map.spots;
  if (!st.has('tamiao')) {
    // 踏苗现场：堤下田里，村北
    const ma = d.place('maningyuan', 36, 24.5, { face: [0, 1] });
    const jiang = d.place('jiangqianhu', 38, 25, { face: [0, 1], look: 'jiangqianhu' });
    const soldiers = []; for (let i = 0; i < 5; i++) soldiers.push(d.place('sold' + i, 37 + i * 1.3, 29 + (i % 2), { look: 'soldier', name: '号衣兵', wander: { r: 1.5, pause: 0.8 } }));
    const feng = d.npc('fenglaosi'), ayang = d.npc('ayang'); feng.x = 39.5; feng.z = 31.5; feng.ai = null; ayang.x = 40.3; ayang.z = 31.8; ayang.ai = null;
    const qi = d.npc('qidazhu'); qi.x = 41; qi.z = 30; qi.ai = null; qi.facing.set(-1, -1);
    d.trigger('tamiao', 38, 30, 7, async () => {
      g.player.locked = true; g.cinematicCam = true; g.r.follow(38, 0.2, 28);
      g.audio.setMood('tense');
      await d.narr('还没走到堤上，就听见了哭声。一队兵正在田里踩秧苗。挖开的水渠里，水往外淌，淌到哪里，哪里的秧苗就倒一片。');
      await d.narr('堤上站着的，是马宁远。他身后跟着一个千户，姓蒋，是臬司衙门派来的。');
      d.meet('maningyuan'); d.meet('jiangqianhu'); d.meet('qidazhu'); d.meet('fenglaosi'); d.meet('ayang');
      await d.say('qidazhu', '秧都插下去了！你们踩的是一年的口粮！');
      await d.say('maningyuan', '上头有令，改稻为桑。不改的，断水；断了水还不改的，踏苗。');
      await d.narr('一个老农跪在泥里，怀里抱着一把被踩烂的秧苗。他身边跪着一个小女孩，七八岁，不哭，只是死死抓着老人的衣角。');
      await d.think('你是户部的人，来核田的。这些田，还没有核。');
      const a = await d.choose('player', '', [
        { id: 'stall', text: '以户部的名义拦下：田亩未核，不许毁苗', tag: '户部札付' },
        { id: 'stand', text: '走下田去，站到兵和秧苗中间' },
        { id: 'silent', text: '沉默' },
      ]);
      st.set('tamiao', a); st.flag('tamiao');
      if (a === 'stall') {
        g.player.goTo(36, 26); await waitUntil(() => !g.player.path, 4000);
        await d.say('player', '户部奉旨核算田亩。这一片田的亩数、等则、业主，都还没有核清。苗一踏，田的等则就变了，账就没法核了。马府台，等下官核完了，再踏不迟。');
        await d.narr('马宁远低头看着你，看了很久。');
        await d.say('maningyuan', '程大人要核，那就核。[[核完了，再踏::他没说不踏。]]。');
        st.set('trust', 1); st.add('xian', 1); d.ledger('ma_tamiao', '记恨', '马宁远', '你拿户部的札付，拦下了他的兵。他说：核完了，再踏。');
      } else if (a === 'stand') {
        g.player.goTo(38.5, 30.5); await waitUntil(() => !g.player.path, 5000);
        await d.narr('你下了堤，踩进水田里，站在那片还没被踏过的秧苗前面。泥没过了你的脚踝。官袍的下摆浸在水里。');
        await d.say('maningyuan', '程大人，你是要我的兵从你身上踏过去？');
        await d.say('player', '马府台的兵，踏得过去，就踏。');
        await d.narr('田里一下子安静了。那个不肯跪的汉子看着你，像是看一个疯子。马宁远在马上坐了一会儿，拨转了马头。');
        await d.say('maningyuan', '收兵。');
        st.set('trust', 2); st.add('xian', 2); d.ledger('ma_tamiao', '记恨', '马宁远', '你站在田里，挡在他的兵前面。他收了兵。');
      } else {
        await d.narr('你站在堤上，没有动。兵又踩了下去。那个老农抱着秧苗，没有再哭。小女孩看见了你。她看了你一眼，又低下头去。');
        st.set('trust', 0);
      }
      d.ledger('jiang_face', '被握', '蒋千户', '踏苗那天，他在马宁远身后，把你的脸看了很久。');
      // 兵走
      for (const e of [ma, jiang, ...soldiers]) { e.ai = null; e.goTo(70, 44.5, () => { e.visible = false; }); }
      feng.ai = feng.ai || null; feng.goTo(s.fengHome[0] - 1, s.fengHome[1] + 0.5); ayang.goTo(s.fengHome[0] + 1.2, s.fengHome[1] + 1); qi.goTo(52, 40.5);
      await d.narr('后来你才知道，那个不肯跪的汉子叫齐大柱。');
      d.done('q_hetian'); d.quest('q_hegong', '去堤上找老河工', '堤上有个扛竹竿的老河工，一路走一路往堤上戳。跟他学听堤，问问今年的堤。', { npc: 'laohegong' });
      g.player.locked = false; g.cinematicCam = false; g.audio.setMood('day'); d.refreshStats();
      g.save();
    });
  }
}
// ───── 第二天 ─────
function setupDay2(d, loaded) {
  const g = d.g, st = g.state, s = g.map.spots;
  // 差役在村里宣布河工放假
  if (!st.has('c_holiday')) {
    const cy = d.place('chaiyi2', 33.5, 43.5, { look: 'chaiyi', name: '差役', face: [0, 1] });
    const h = d.npc('laohegong'); h.x = 33; h.z = 45; h.ai = null;
    d.trigger('holiday', 33.5, 44.5, 6, async () => {
      g.player.locked = true;
      await d.say('chaiyi', '县里有令：堤上的河工，端午放假三天，回家过节！都听见了？');
      await d.narr('吴老倌听了，手里的竹竿一下子戳在地上。');
      await d.say('laohegong', '[[汛期放假？::汛期，正是堤上要人的时候。::c_holiday]]我守了一辈子堤，没听说过！');
      await d.say('chaiyi', '老吴头，县太爷的令，你跟我嚷有什么用？');
      d.clue('c_holiday');
      cy.goTo(70, 44.5, () => cy.visible = false);
      h.ai = null; h.goTo(33, 19.5); setTimeout(() => { h.home = [33, 19.5]; }, 100);
      g.player.locked = false;
    });
  }
  // 申时：总督衙门亲兵送信到客栈
  d.tick = (dt) => {
    if (!st.has('qinbing_came') && g.clock.hour >= 14 && !d.busy && !g.ui.modal) {
      st.flag('qinbing_came');
      const qb = d.place('qinbing', s.innDoor[0] - 1.5, s.innDoor[1] + 1.2, { face: [0, -1], talk: async (e) => {
        d.meet('huzongxian');
        await d.say('qinbing', '程委员！部堂有话，叫小的带给程委员。');
        await d.say('qinbing', '部堂说：新安江的堤，去年新修的，户部结过账，二百万两。修得这么结实的堤，[[要是出了事，就不是水的事了::他在告诉你：真出了事，去查人。]]。部堂叫程委员在淳安核田，替他看着那道堤。');
        await d.say('qinbing', '还有一件事。总督请缓办改稻为桑的奏疏，[[被驳回了::批驳用的是内阁的票拟。内阁的票拟，这些年是谁在拟？::c_reject]]。部堂说，程委员是户部的人，该知道。');
        d.clue('c_reject'); st.add('hu', 1);
        const a = await d.choose('qinbing', '部堂还要一个数：九县的田改了桑，一年少多少粮；灾年要赈，要多少粮。程委员算过没有？', [
          { id: 'give', text: '把算好的粮账交给他带回去', tag: '粮账' }, { id: 'no', text: '"下官的数，要先报户部。"' },
        ]);
        if (a === 'give') { await d.narr('你从怀里拿出那张纸。正月十五在玉熙宫算的那笔粮账；到了浙江，又照九县的田亩册子细算了一遍。'); st.add('hu', 2); d.ledger('hu_liang', '人欠', '胡宗宪', '你把粮账交给了他，给他请缓办的奏疏添了一个数。'); st.take('liangzhang'); }
        else await d.say('qinbing', '规矩是对的。小的照实回部堂。');
        d.quest('q_watch', '替胡部堂看着那道堤', '真出了事，去查人。夜里戌时以后，闸口有火把。', { spot: 'sluice' });
        qb.interact = null; qb.goTo(70, 44.5, () => qb.visible = false);
      } });
      g.ui.toast('<b>客栈</b>有人在客栈门口等你', 'dark');
    }
  };
}
// ───── 第三天 ─────
function setupDay3(d, loaded) {
  const g = d.g, st = g.state, s = g.map.spots;
  // 村里包粽子：冯家门口多摆一个人
  // 推算：客栈客房热点，酉时以后
  d.hotspot('tuisuan', s.innDoor[0] - 1.2, s.innDoor[1] - 0.6, '客房', '推算', async () => {
    if (g.clock.hour < 16) { await d.think('天还亮着。等夜里，把这两个月记下的东西一样一样摊开。'); return; }
    await tuisuan(d);
  }, { r: 1.5, h: 2.2, active: () => !st.has('tuisuan_done') });
  if (!loaded && !st.has('qi_gone_tomorrow')) {}
}
async function tuisuan(d) {
  const g = d.g, st = g.state, s = g.map.spots;
  st.flag('tuisuan_done'); d.done('q_tuisuan');
  await d.narr('夜里，你在客房里点了灯，把这两个月记下的东西一样一样摊开。');
  const n = st.clues.length;
  for (const c of st.clues) await d.narr('　' + c.text.split('。')[0] + '。');
  await d.narr('你又算了一遍账。五十万亩。种稻有利，田价就不低；百姓手里有秧，田就不肯卖。沈一石囤的那些粮，照现在的田价，买不了几万亩。除非田不值钱。');
  await d.narr('田什么时候不值钱？[[颗粒无收的时候::灾年，十石谷子就能换一亩好田。]]。可那道堤是新修的，二百万两的条石。水，是冲不开它的。');
  if (n >= 3) await d.narr('这些数摆在一处，只差一个日子。'); else await d.narr('你隐约觉得有什么地方不对，可手里的东西太少，连不成一条线。');
  const a = await d.choose('narr', '你握着笔，在纸上写下一个日子。', [{ id: 'duanwu', text: '端午' }, { id: 'qiu', text: '秋收之前' }, { id: 'none', text: '写不出来' }]);
  if (a === 'duanwu' && n >= 3) {
    st.set('knew', 2);
    await d.narr('明天就是端午。你吹灭了灯，在黑暗里坐了很久。');
    const b = await d.choose('narr', '', [{ id: 'go', text: '起身，去冯家村敲门。' }, { id: 'sleep', text: '睡。明天夜里再说。' }]);
    if (b === 'go') { await preEvac(d); return; }
  } else if (a === 'duanwu') { st.set('knew', 1); await d.narr('你盯着那两个字看了很久。也许是你想多了。也许不是。你决定明天夜里不喝酒。'); }
  else if (a === 'qiu') { st.set('knew', 0); await d.narr('你写下"秋收之前"。还有三个月。你把纸折好，压在砚台底下，吹了灯。'); }
  else { st.set('knew', 0); await d.narr('你把纸揉了，扔进了炭盆。算不清的账，就先放着。'); }
  d.endDay();
}
// 端午前夜：挨家挨户
async function preEvac(d) {
  const g = d.g, st = g.state, s = g.map.spots;
  await g.ui.fadeOut(600);
  g.clock.set(22.5); g.clock.running = false;
  g.player.x = s.villageNorth[0]; g.player.z = s.villageNorth[1] + 3; g.player.path = null; g.r.follow(g.player.x, 0.3, g.player.z, true);
  for (const e of g.entities) if (e !== g.player) e.visible = false;
  d.hotspots = []; d.triggers = [];
  const hegong = st.has('hegong_friend') ? d.place('laohegong', g.player.x - 1.5, g.player.z, { face: [0, 1] }) : null;
  if (hegong) { d.followers.push(hegong); hegong.interact = null; }
  await g.ui.fadeIn(600);
  g.ui.banner('端午前夜', '挨家挨户');
  await d.narr('你挨家挨户地敲门。你没有证据，只有一笔账。可这笔账，你算了三遍。');
  if (hegong) await d.say('laohegong', '官老爷，我跟你去。村里人不信官，信我这根竹竿。');
  st.evac = st.evac || {}; let knocked = 0;
  d.quest('q_knock', '挨家挨户敲门', '冯家村十三户。信你的人会走，不信的，明天夜里再说。', { spot: 'fengHome' });
  const doors = HOUSE_DOORS(g.map);
  for (const door of doors) {
    d.hotspot('door_' + door.id, door.x, door.z, door.id === 'feng_home' ? '冯家' : '农家', '敲门', async () => {
      const t = st.get('trust'); const isFeng = door.id === 'feng_home';
      await d.narr('你敲了门。' + (isFeng ? '开门的是冯老四。' : '门开了一条缝。'));
      await d.say('player', '明天夜里，把老人孩子送到后山的龙王庙去。什么都别问，去。');
      const base = isFeng ? (t >= 1 ? 1 : 0.2) : t >= 3 ? 0.9 : t === 2 ? 0.6 : t === 1 ? 0.35 : 0.1;
      const p = Math.min(1, base + (hegong ? 0.35 : 0));
      const ok = Math.random() < p;
      if (ok) { await d.say(isFeng ? 'fenglaosi' : 'cunmin_m', isFeng ? '官老爷说去，小的就去。明天一早就送阿秧她奶奶上山。' : (hegong ? '吴老倌也这么说？那……去。' : '官老爷说的，小的信。')); st.evac[door.id] = true; st.add('huomin', 0); g.ui.toast('<b>应了</b>这一户明天会走', 'dark'); }
      else { await d.say('cunmin_m', hegong ? '堤年年涨水，年年没事……明天再说吧。' : '官老爷，堤年年涨水，年年没事。这么大的雨，往山上跑，老人孩子要淋出病来的。'); g.ui.toast('没有应', 'red'); }
      knocked++; d.removeHotspot('door_' + door.id);
      if (knocked >= doors.length) { await d.narr('最后一扇门关上了。'); finish(); }
    }, { r: 1.5, h: 2.0 });
  }
  d.hotspot('evac_end', s.villageNorth[0], s.villageNorth[1], '回客栈', '歇息', async () => { await d.narr('夜深了。你回了客栈。'); finish(); }, { r: 2 });
  const finish = () => { d.hotspots = []; d.followers = []; st.set('evac_n', Object.keys(st.evac).length); d.done('q_knock'); d.endDay(); };
}

// ───── 夜里：闸口的号衣兵（第 1、2 天 戌时后；第 3 天不来） ─────
function setupNightWatch(d, day) {
  const g = d.g, st = g.state;
  if (day === 3) return;
  let spawned = false;
  const prevTick = d.tick;
  d.tick = (dt) => {
    if (prevTick) prevTick(dt);
    if (!spawned && g.clock.hour >= 19.3 && g.clock.hour < 23 && !g.ui.modal) {
      spawned = true;
      const guards = [];
      const jiang = d.place('jiang_n', 45.5, 23.8, { look: 'jiangqianhu', name: '蒋千户', face: [0, -1] }); jiang.viewR = 7; guards.push(jiang);
      for (let i = 0; i < 3; i++) { const sx = [43, 48, 45.5][i], sz = [22.5, 22.5, 25.5][i]; const sd = d.place('nsold' + i, sx, sz, { look: 'soldier_torch', name: '号衣兵', wander: { r: 1.2, pause: 1.5 } }); sd.viewR = 6; sd.omni = true; guards.push(sd); const pl = new g.lamps[0].constructor(0xff9a40, 30, 9, 1.8); pl.position.set(sx, 1.6, sz); g.r.scene.add(pl); sd.torch = pl; }
      const cleanup = () => { for (const gd of guards) { gd.visible = false; if (gd.torch) g.r.scene.remove(gd.torch); } d.stealth.stop(); };
      if (g.clock.hour < 22.5) g.ui.toast('<b>闸口</b>堤上亮起了火把', 'dark');
      d.stealth.start(guards, {
        closeR: 4.5,
        onClose: async () => {
          d.busy = true; g.player.stop();
          await d.narr('你伏在柳树后面。雨水顺着领口往下灌。火把底下，有人把铁钎插进闸底的石缝，一下一下地撬。');
          await d.say('jiangqianhu', '轻点！石头松了就行，别撬出来。端午那夜，子时以前，这几块都得动得了。');
          await d.say('soldier', '千户，这闸底是三月才换的新石……');
          await d.say('jiangqianhu', '换的就是让你撬的。少废话。');
          await d.think('端午。子时以前。');
          d.clue('c_zha2'); d.clue('c_jiang'); st.flag('saw_jiang_night'); d.done('q_nightzha');
          d.busy = false;
        },
        onCaught: async () => {
          d.busy = true; g.player.stop(); g.player.locked = true;
          await d.narr('火把照到了你的脸。两个兵扑上来，把你按在了泥里。');
          await d.say('jiangqianhu', '户部的？' + (st.has('tamiao') && st.get('tamiao') !== 'silent' ? '踏苗那天的那个。' : '') + '半夜三更在堤上做什么？');
          const a = await d.choose('player', '', [{ id: 'hubu', text: '"户部核田，看堤是本分。你们半夜在闸底做什么？"', tag: '户部札付' }, { id: 'walk', text: '"睡不着，走走。"' }]);
          if (a === 'hubu') { await d.say('jiangqianhu', '看堤？堤是河道总管的事。程大人，回城去。再让我在堤上看见你，就不是送回去这么客气了。'); st.add('xian', 2); d.ledger('jiang_night', '记恨', '蒋千户', '夜里你在闸口被他的人按住。你问他在闸底做什么，他没答。'); }
          else { await d.say('jiangqianhu', '走走？程大人，淳安城里也能走。送程大人回城。'); st.add('xian', 1); }
          await g.ui.fadeOut(600);
          cleanup();
          const s = g.map.spots; g.player.x = s.innDoor[0]; g.player.z = s.innDoor[1]; g.player.path = null; g.r.follow(g.player.x, 0.8, g.player.z, true);
          g.clock.hour = Math.min(22.4, g.clock.hour + 1.2); g.clock.apply();
          await g.ui.fadeIn(600);
          await d.narr('他们把你"送"回了客栈。门口的灯笼还亮着。');
          g.player.locked = false; d.busy = false;
        },
      });
      // 子时前撤
      const chk = setInterval(() => { if (g.clock.hour >= 22.8 || g.clock.hour < 5 || d.phase !== 'day') { cleanup(); clearInterval(chk); } }, 1000);
    }
  };
}

export async function endDay(d, day) {
  const g = d.g, st = g.state;
  await g.ui.fadeOut(900);
  g.weather.set(0);
  const lines = { 1: ['五月初二，夜。', '堤上的柳树响了一夜。'], 2: ['五月初三，夜。', '城里的米行，灯亮到很晚。'], 3: ['五月初四，夜。', '雨还没来。江上的风先到了。'] };
  const todo = { 1: ['', '要事：渡口看沈家的粮船；县衙查河工账。'], 2: ['', '要事：去冯家村；夜里回客栈推算。'] };
  if (day < 3) await g.ui.chapter(day === 1 ? '端午前二日' : '端午前一日', day === 1 ? '五月初三' : '五月初四', lines[day].concat(todo[day]));
  else await g.ui.chapter('端午', '五月初五', ['午后起了风。', '到了傍晚，天黑得比往常早了一个时辰，雨一阵紧似一阵地砸下来。']);
}
