// 序章：运河船上、杭州宴、沈府夜、到淳安。画面是整幅 CG，对话在其上。
export async function intro(d) {
  const g = d.g, st = g.state, ui = g.ui;
  await ui.chapter('端午汛', '序', ['嘉靖四十年，春。', '严党议定"改稻为桑"：浙江五十万亩稻田，一年之内改种桑树。', '你是户部观政进士程知白，奉命南下浙江，核算田亩。']);
  g.r.fade(1); await ui.showCG('boat', { ms: 1200 }); await ui.fadeIn(600);
  await d.narr('船过了瓜洲，渡了江，两岸就绿了。江南的田里已经放了水，农人赶着牛在耙田，一行一行，像是在纸上打格子。');
  await d.think('五十万亩。这些田里，有多少要改成桑？');
  d.meet('tanlun');
  await d.say('tanlun', '程大人在数田？数不完的。浙江的田，比户部账册上多，也比账册上少。');
  await d.say('tanlun', '账册上有的田，有些早就不是种田人的了。账册上没有的田，[[有些是大户藏着的::田亩不入册，就不纳粮。大户藏田，小户顶粮——户部的账从来对不上，就对不上在这里。]]。');
  await d.say('tanlun', '我这趟差事，是去给胡部堂请个安。程大人呢？你去浙江，站在哪边？');
  const a = await d.choose('player', '', [
    { id: 'hubu', text: '"下官是户部的人。"' },
    { id: 'none', text: '"下官谁那边都不站。"' },
    { id: 'ask', text: '"谭大人希望下官站在哪边？"' },
  ]);
  if (a === 'hubu') await d.say('tanlun', '户部的人。好，户部的人只认账。');
  else if (a === 'none') await d.say('tanlun', '程大人，到了浙江你就知道了。在那里，不站，也是一种站法。');
  else { await d.say('tanlun', '问得好。我希望你站在田这边。'); st.add('qing', 1); }
  await d.say('tanlun', '到了杭州，郑泌昌、何茂才一定请你吃饭。吃，[[别喝醉::他没说别去。这顿饭躲不掉，能躲的只有酒。]]。');
  await ui.fadeOut(500);
  await ui.chapter('杭州', '三月', ['布政使司设宴接风。郑泌昌、何茂才，还有杭州知府、兼管新安江河道的马宁远。', '酒过三巡，你把小阁老的信拿了出来。']);
  d.meet('zhengbichang'); d.meet('hemaocai'); d.meet('maningyuan');
  await ui.showCG('banquet', { ms: 10 }); await ui.fadeIn(800);
  const drink = await d.choose('hemaocai', '自己人！干了！', [
    { id: 'gan', text: '一口干了' }, { id: 'zhan', text: '沾沾唇' }, { id: 'cha', text: '以茶代酒' },
  ]);
  if (drink === 'gan') { await d.narr('酒很烈，从喉咙一直烧到胃里。何茂才拍着桌子：痛快！程大人是个爽快人！'); st.flag('drank'); }
  else if (drink === 'zhan') await d.narr('你端起杯子，沾了沾唇，放下了。何茂才看了看你的杯子，没说什么。');
  else { await d.narr('何茂才的脸沉了一下。郑泌昌笑了笑："程大人是读书人，读书人有读书人的规矩。"'); d.ledger('he_cha', '记恨', '何茂才', '接风宴上，他敬你酒，你以茶代酒。'); st.add('xian', 1); }
  await d.say('zhengbichang', '程大人只管算账。田的事，[[要看年景::年景好，田就贵；年景坏，田就贱。一个布政使，盼的是哪一种年景？::c_zheng]]。');
  await d.narr('何茂才咳了一声。郑泌昌不再往下说了。马宁远一直没说话，你转过去敬他一杯，问起新安江下游那道堤。');
  await d.say('maningyuan', '[[去年新修的。二百万两::正月御前报的账里有这一笔：新安江河工，结账二百万两。这么多银子修的堤，不该怕水。::c_xinxiu]]。');
  await d.narr('他说完这一句，又不说话了。');
  await ui.fadeOut(400);
  await ui.chapter('沈府', '三月 夜', ['帖子上只写了一行字：故人之子，愿一见。', '园子很大，水边的亭子里，江南首富沈一石穿着一身没染过的棉布袍子，亲手煮茶。']);
  d.meet('shenyishi');
  await ui.showCG('shen', { ms: 10 }); await ui.fadeIn(800);
  await d.say('shenyishi', '令尊程公，二十年前在湖州收丝，跟沈某做过三年生意。后来湖州丝价大跌，程公的丝砸在手里，欠了沈某一笔银子。');
  await d.narr('他从袖子里拿出一张发黄的纸。是一张借据：立借约人歙县程守拙，今借到沈一石名下纹银二千两整。你认得父亲的字。');
  await d.think('父亲从没提过这件事。他临终前说的是：咱家不欠人。');
  await d.say('shenyishi', '今日见了程大人，[[这张纸，就不必留了::他没有问你要什么。]]。');
  await d.narr('他把借据拿起来，凑近了烛火。');
  const debt = await d.choose('player', '', [
    { id: 'burn', text: '让他烧' },
    { id: 'keep', text: '"父债子还。这张借据，下官收着，银子日后一定还。"' },
  ]);
  if (debt === 'burn') { await d.narr('纸着了，很快就成了灰。沈一石说：程公欠沈某的，今天两清了。'); await d.think('父亲欠他的，两清了。你欠他的，才刚开始。'); st.flag('debt_burn'); d.ledger('shen_burn', '欠人', '沈一石', '他当着你的面，烧了父亲欠他二千两银子的借据。'); }
  else { await d.say('shenyishi', '程大人，二千两银子，你一个观政，要还多少年？'); await d.say('player', '还得清就还，还不清就欠着。欠着，也比不知道欠了谁好。'); await d.narr('沈一石看了你很久，把借据放回了你面前："好。那就欠着。"'); st.flag('debt_keep'); d.item('jiejv', '借据'); d.ledger('shen_keep', '欠人', '沈一石', '父亲欠他二千两银子。借据你收着了，说日后一定还。'); }
  await d.say('shenyishi', '沈某今年还在湖广收了些粮，囤在富阳、建德、淳安一带的码头上。');
  await d.say('player', '[[丝商收粮::他把囤粮的地方告诉了户部的人。是说漏了嘴，还是有意说给你听？::c_grain]]？');
  await d.say('shenyishi', '生意人，什么都收一点。程大人，沈某做了二十年生意，只学会了一件事：账上的东西，[[没有一样是自己的::二十年挣下的家业，一多半填进了宫里的账。名字是沈家的。]]。');
  await ui.fadeOut(400); await ui.hideCG(10);
  await ui.chapter('淳安', '五月初二 · 端午前三日', ['新安江从徽州的山里流下来，到淳安这一段，江面宽了，两岸筑着长堤。', '堤下面是稻田，秧苗刚插下去不久，绿得发亮。', '你住进了城里的客栈。三天之后，是端午。']);
  d.item('zhafu', '户部札付'); d.item('liangzhang', '粮账');
}
