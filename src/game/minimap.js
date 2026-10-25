// 小地图：按地块种类着色，画一次底图；每帧叠玩家、要事目标、人物点。随相机朝向旋转，屏幕上方 = 画面前方。
import { TILE_KINDS } from '../engine/textures.js';
const COLORS = { grass: '#6c8a46', field: '#4e7a5a', road: '#b09a6e', stone: '#9a9890', dike: '#b8a070', hill: '#7a8e4e', mud: '#7a6448', floor: '#b0a894', sand: '#c8b48c', mulberry: '#7f6c4c', dark: '#2a3e52', forest: '#3d5a38' };
export class Minimap {
  constructor(game) {
    this.g = game; const m = game.map; this.m = m;
    const S = this.S = 3; // 底图每格像素
    const base = document.createElement('canvas'); base.width = m.W * S; base.height = m.D * S; const ctx = base.getContext('2d');
    for (let z = 0; z < m.D; z++) for (let x = 0; x < m.W; x++) { const k = TILE_KINDS[m.kind[m.idx(x, z)]]; ctx.fillStyle = COLORS[k] || '#888'; ctx.fillRect(x * S, z * S, S, S); if (m.water[m.idx(x, z)] > -90 && k !== 'field') { ctx.fillStyle = 'rgba(40,80,120,0.5)'; ctx.fillRect(x * S, z * S, S, S); } }
    for (const b of m.buildings) { const rot = b.rot || 0; const w = Math.abs(Math.cos(rot)) > 0.5 ? b.w : b.d, d = Math.abs(Math.cos(rot)) > 0.5 ? b.d : b.w; ctx.fillStyle = b.type === 'citywall' ? '#5a5852' : b.type === 'thatch' ? '#8a7040' : b.type === 'temple' ? '#8a3a30' : b.type === 'compound' ? 'rgba(0,0,0,0)' : '#4a4a52'; ctx.fillRect((b.x - w / 2) * S, (b.z - d / 2) * S, w * S, d * S); }
    for (const t of m.trees) { ctx.fillStyle = 'rgba(30,70,30,0.6)'; ctx.fillRect(t.x * S - 1, t.z * S - 1, 3, 3); }
    this.base = base;
    this.labels = [['县衙', 99, 36], ['客栈', 82, 52], ['闸口', 45.5, 19.5], ['冯家村', 33.5, 44.5], ['渡口', 98.5, 12], ['龙王庙', 19, 96], ['西门', 72, 45.5], ['北门', 98.5, 27], ['桑田', 98, 100]];
  }
  // 画到目标 canvas：center 世界坐标，scale 像素/格，rot 旋转（弧度），big 是否画地名
  draw(ctx, W, H, center, scale, rot, big) {
    const g = this.g, S = this.S;
    ctx.save(); ctx.clearRect(0, 0, W, H);
    ctx.beginPath(); if (big) ctx.rect(0, 0, W, H); else ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#1a1814'; ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.rotate(rot);
    const k = scale / S;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.base, -center.x * scale, -center.z * scale, this.base.width * k, this.base.height * k);
    // 洪水
    if (g.flood.active) { const w = g.world, m = this.m; ctx.fillStyle = 'rgba(90,70,40,0.55)'; for (let z = 0; z < m.D; z += 2) for (let x = 0; x < m.W; x += 2) { const i = m.idx(x, z); if (w.floodLevel[i] > -90 && m.water[i] < -90 && w.floodLevel[i] - m.h[i] > 0.15) ctx.fillRect((x - center.x) * scale, (z - center.z) * scale, scale * 2, scale * 2); } }
    const dot = (x, z, r, col, stroke) => { ctx.beginPath(); ctx.arc((x - center.x) * scale, (z - center.z) * scale, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } };
    // 人物
    for (const e of g.entities) { if (e === g.player || !e.visible || !e.npc) continue; dot(e.x, e.z, e.interact ? 2.2 : 1.5, e.interact ? '#f0d890' : 'rgba(230,220,200,0.5)'); }
    // 要事目标
    const q = g.director.trackedQuest(); const t = q && g.director.resolveTarget(q.target);
    if (t) { const pulse = 4 + Math.sin(g.t * 5) * 1.5; dot(t.x, t.z, pulse + 2, 'rgba(201,162,74,0.35)'); dot(t.x, t.z, 3, '#c9a24a', '#1a1814'); }
    // 玩家
    const p = g.player; if (p) { dot(p.x, p.z, 3.5, '#ffffff', '#000'); ctx.save(); ctx.translate((p.x - center.x) * scale, (p.z - center.z) * scale); ctx.rotate(Math.atan2(p.facing.y, p.facing.x)); ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(9, -3); ctx.lineTo(9, 3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
    if (big) { ctx.font = '13px WenKai, serif'; ctx.textAlign = 'center'; for (const [name, x, z] of this.labels) { ctx.save(); ctx.translate((x - center.x) * scale, (z - center.z) * scale); ctx.rotate(-rot); ctx.fillStyle = 'rgba(0,0,0,0.55)'; const w = ctx.measureText(name).width + 10; ctx.fillRect(-w / 2, -18, w, 16); ctx.fillStyle = '#efe6d2'; ctx.fillText(name, 0, -6); ctx.restore(); } }
    ctx.restore();
    if (!big) { ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(239,230,210,0.5)'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  // 相机旋转角：让画面前方朝上
  rot() { const yaw = this.g.r.yaw; const fx = -Math.sin(yaw), fz = -Math.cos(yaw); return -Math.PI / 2 - Math.atan2(fz, fx); }
}
