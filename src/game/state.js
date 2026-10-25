// 游戏状态：变量、线索、账簿、物品。可序列化。
export class State {
  constructor() { this.reset(); }
  reset() {
    this.vars = { trust: 0, hu: 0, xian: 0, huomin: 0, knew: 0, clues: 0, day: 1 };
    this.flags = {};
    this.clues = [];   // {id, title, text, kind}
    this.ledger = [];  // 暗账 {id, kind, who, text}
    this.items = [];   // 物品 id
    this.people = [];  // 见过的人 id
    this.log = [];     // 事件日志
    this.quests = {};  // id -> {title, desc, done}
    this.evac = {};    // 已提前撤离的户
    this.saved = {};   // 救到的人
  }
  get(k) { return this.vars[k] || 0; }
  set(k, v) { this.vars[k] = v; }
  add(k, v) { this.vars[k] = (this.vars[k] || 0) + v; return this.vars[k]; }
  flag(k, v = true) { this.flags[k] = v; }
  has(k) { return !!this.flags[k]; }
  hasItem(id) { return this.items.includes(id); }
  give(id) { if (!this.items.includes(id)) this.items.push(id); }
  take(id) { this.items = this.items.filter(i => i !== id); }
  addClue(c) { if (this.clues.find(x => x.id === c.id)) return false; this.clues.push(c); this.vars.clues = this.clues.length; return true; }
  addLedger(l) { if (this.ledger.find(x => x.id === l.id)) return false; this.ledger.push(l); return true; }
  meet(id) { if (!this.people.includes(id)) { this.people.push(id); return true; } return false; }
  quest(id, title, desc, target) { if (!this.quests[id]) { this.quests[id] = { id, title, desc, target: target || null, done: false, t: Date.now() }; return true; } if (target) this.quests[id].target = target; return false; }
  setTarget(id, target) { if (this.quests[id]) this.quests[id].target = target; }
  done(id) { const q = this.quests[id]; if (q && !q.done) { q.done = true; return true; } return false; }
  toJSON() { return { vars: this.vars, flags: this.flags, clues: this.clues, ledger: this.ledger, items: this.items, people: this.people, log: this.log, quests: this.quests, evac: this.evac, saved: this.saved }; }
  load(o) { Object.assign(this, o); }
}
