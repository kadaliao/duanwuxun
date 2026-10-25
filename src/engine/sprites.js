// 程序化像素人物：纸偶式立绘，四向 + 行走帧。每个角色由一份"衣着描述"生成一张图集。
import * as THREE from 'three';
import { makeCanvas } from './textures.js';

export const FW = 32, FH = 48; // 帧尺寸
// 图集布局：行 = 方向 (0 下/front, 1 左/side, 2 上/back)，列 = 帧 (0 站, 1 走A, 2 走B, 3 特殊)
export const DIRS = { front: 0, side: 1, back: 2 };
export const FRAMES = 4;

const PALETTE = {
  skin: '#e8c39a', skinDark: '#c99a6c', skinOld: '#d9b58e', ink: '#1a1410',
  hairBlack: '#1c1a1a', grey: '#8a8580', white: '#e6e2d8',
};

function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

/*
 desc = {
   robe: '#2a2a33',  // 袍色
   robeLen: 'long'|'short', // 长袍 / 短打
   trim: '#...',     // 领缘/腰带
   hat: 'wusha'|'douli'|'jin'|'none'|'helmet'|'taijian'|'futou'|'hood',
   beard: 'none'|'short'|'long'|'grey',
   skin: 'y'|'d'|'o',
   height: 1.0,      // 高矮
   prop: 'pole'|'gong'|'torch'|'spear'|'hoe'|'bundle'|'none'
   child: bool, female: bool, old: bool
 }
*/
export function drawCharacterAtlas(desc) {
  const c = makeCanvas(FW * FRAMES, FH * 3);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let dir = 0; dir < 3; dir++) for (let f = 0; f < FRAMES; f++) {
    ctx.save(); ctx.translate(f * FW, dir * FH);
    drawFrame(ctx, desc, dir, f);
    ctx.restore();
  }
  return c;
}

function drawFrame(ctx, d, dir, f) {
  const skin = d.skin === 'd' ? PALETTE.skinDark : d.skin === 'o' ? PALETTE.skinOld : PALETTE.skin;
  const h = d.child ? 0.62 : (d.height || 1);
  const base = FH - 2; // 脚底
  const S = (v) => Math.round(v * h);
  const cx = FW / 2;
  const walk = f === 1 ? 1 : f === 2 ? -1 : 0;
  const bob = f === 1 || f === 2 ? -1 : 0;
  const ink = PALETTE.ink;
  const robe = d.robe, trim = d.trim || '#8a7a5a';
  const bodyW = S(d.wide ? 16 : 13), bodyH = S(d.robeLen === 'short' ? 16 : 24);
  const headR = S(6);
  const legH = S(d.robeLen === 'short' ? 10 : 4);
  const y0 = base - legH - bodyH + bob; // 身体顶
  // 影子不画（场景里用真实投影）
  // ─ 腿 ─
  if (d.robeLen === 'short') {
    const lw = S(4);
    const legCol = d.legs || '#3a3028';
    px(ctx, cx - lw - 1 + walk * 1, base - legH + bob, lw, legH, legCol);
    px(ctx, cx + 1 - walk * 1, base - legH + bob, lw, legH, legCol);
    px(ctx, cx - lw - 1 + walk * 1, base - 2 + bob, lw, 2, ink);
    px(ctx, cx + 1 - walk * 1, base - 2 + bob, lw, 2, ink);
  } else {
    // 长袍下摆露鞋
    px(ctx, cx - S(4) + walk * 2, base - 2 + bob, S(3), 2, ink);
    px(ctx, cx + S(1) - walk * 2, base - 2 + bob, S(3), 2, ink);
  }
  // ─ 身体/袍 ─
  const bx = cx - bodyW / 2;
  px(ctx, bx, y0, bodyW, bodyH + legH * (d.robeLen === 'short' ? 0 : 1), robe);
  // 袍子下摆略宽
  if (d.robeLen !== 'short') { px(ctx, bx - 1, y0 + bodyH * 0.5, bodyW + 2, bodyH * 0.5 + legH, robe); }
  // 轮廓
  px(ctx, bx - 1, y0, 1, bodyH + legH, ink); px(ctx, bx + bodyW, y0, 1, bodyH + legH, ink);
  // 衣褶
  px(ctx, cx, y0 + 2, 1, bodyH - 4, 'rgba(0,0,0,0.25)');
  // 领/带
  if (dir !== DIRS.back) {
    px(ctx, cx - 2, y0, 1, S(6), trim); px(ctx, cx + 1, y0, 1, S(6), trim);
    px(ctx, bx, y0 + S(10), bodyW, 2, trim);
  } else {
    px(ctx, bx, y0 + S(10), bodyW, 2, 'rgba(0,0,0,0.25)');
  }
  // 补子（官服）
  if (d.buzi && dir === DIRS.front) { px(ctx, cx - 3, y0 + S(12), 6, 5, d.buzi); px(ctx, cx - 2, y0 + S(13), 4, 3, 'rgba(255,255,255,0.35)'); }
  // ─ 手臂 ─
  const armY = y0 + S(4);
  const armCol = d.sleeve || robe;
  if (dir === DIRS.side) {
    px(ctx, cx - 2 + walk * 2, armY, S(4), S(11), armCol);
    px(ctx, cx - 2 + walk * 2, armY + S(11), S(3), 2, skin);
  } else {
    px(ctx, bx - S(2), armY + walk, S(4), S(11), armCol);
    px(ctx, bx + bodyW - S(2), armY - walk, S(4), S(11), armCol);
    px(ctx, bx - S(2), armY + S(11) + walk, S(3), 2, skin);
    px(ctx, bx + bodyW - S(1), armY + S(11) - walk, S(3), 2, skin);
    // 揣袖（太监/文官）：手在前
    if (d.hands === 'sleeve' && dir === DIRS.front) px(ctx, cx - S(4), armY + S(8), S(8), S(4), armCol);
  }
  // ─ 头 ─
  const hy = y0 - headR * 2 + 2;
  const hx = cx - headR;
  px(ctx, hx, hy, headR * 2, headR * 2, skin);
  px(ctx, hx - 1, hy + 1, 1, headR * 2 - 2, ink); px(ctx, hx + headR * 2, hy + 1, 1, headR * 2 - 2, ink);
  px(ctx, hx, hy + headR * 2, headR * 2, 1, ink);
  // 头发
  if (dir === DIRS.back) px(ctx, hx, hy, headR * 2, headR * 2 - 2, d.old ? PALETTE.grey : PALETTE.hairBlack);
  else px(ctx, hx, hy, headR * 2, S(3), d.old ? PALETTE.grey : PALETTE.hairBlack);
  // 脸
  if (dir === DIRS.front) {
    px(ctx, hx + S(3), hy + S(5), 2, 2, ink); px(ctx, hx + headR * 2 - S(3) - 2, hy + S(5), 2, 2, ink);
    if (d.female) { px(ctx, hx + S(3), hy + S(5) - 1, 2, 1, ink); px(ctx, hx + headR * 2 - S(3) - 2, hy + S(5) - 1, 2, 1, ink); }
    if (d.old) { px(ctx, hx + S(2), hy + S(8), headR * 2 - S(4), 1, 'rgba(0,0,0,0.2)'); }
    if (d.beard === 'short') px(ctx, hx + S(3), hy + S(9), headR * 2 - S(6), 2, ink);
    if (d.beard === 'long') { px(ctx, hx + S(3), hy + S(9), headR * 2 - S(6), 2, ink); px(ctx, cx - 2, hy + S(11), 4, S(7), ink); }
    if (d.beard === 'grey') { px(ctx, hx + S(3), hy + S(9), headR * 2 - S(6), 2, PALETTE.white); px(ctx, cx - 2, hy + S(11), 4, S(6), PALETTE.white); }
    if (d.beard === 'stubble') px(ctx, hx + S(3), hy + S(9), headR * 2 - S(6), 2, 'rgba(0,0,0,0.35)');
    if (d.scar) px(ctx, hx + headR * 2 - S(4), hy + S(4), 1, S(5), '#9a4a3a');
  } else if (dir === DIRS.side) {
    px(ctx, hx + headR * 2 - S(4), hy + S(5), 2, 2, ink);
    if (d.beard === 'long' || d.beard === 'grey') px(ctx, hx + headR * 2 - S(5), hy + S(10), 3, S(6), d.beard === 'grey' ? PALETTE.white : ink);
    else if (d.beard === 'short') px(ctx, hx + headR * 2 - S(6), hy + S(9), S(4), 2, ink);
  }
  // ─ 帽 ─
  const hat = d.hat || 'none';
  const hatCol = d.hatCol || '#111';
  if (hat === 'wusha') { // 乌纱帽：方帽 + 两翅
    px(ctx, hx - 1, hy - S(5), headR * 2 + 2, S(6), hatCol);
    px(ctx, hx + 1, hy - S(8), headR * 2 - 2, S(4), hatCol);
    if (dir !== DIRS.side) { px(ctx, hx - S(5), hy - S(2), S(5), 2, hatCol); px(ctx, hx + headR * 2, hy - S(2), S(5), 2, hatCol); }
    else px(ctx, hx + headR * 2, hy - S(2), S(5), 2, hatCol);
  } else if (hat === 'douli') { // 斗笠
    px(ctx, hx - S(5), hy - 1, headR * 2 + S(10), 2, '#c8a860');
    px(ctx, hx - S(3), hy - S(3), headR * 2 + S(6), 2, '#b89850');
    px(ctx, hx - 1, hy - S(6), headR * 2 + 2, S(3), '#a88840');
  } else if (hat === 'jin') { // 头巾/网巾
    px(ctx, hx - 1, hy - S(2), headR * 2 + 2, S(4), hatCol);
    if (dir !== DIRS.back) px(ctx, hx + headR * 2 - 1, hy, 2, S(5), hatCol);
  } else if (hat === 'helmet') {
    px(ctx, hx - 1, hy - S(4), headR * 2 + 2, S(5), '#5a5a62');
    px(ctx, hx - 2, hy, headR * 2 + 4, 2, '#3a3a40');
    px(ctx, cx - 1, hy - S(8), 2, S(4), '#a83030');
  } else if (hat === 'taijian') { // 太监帽：圆顶
    px(ctx, hx - 1, hy - S(4), headR * 2 + 2, S(5), hatCol);
    px(ctx, hx + 1, hy - S(6), headR * 2 - 2, S(2), hatCol);
  } else if (hat === 'futou') { // 军士幞头
    px(ctx, hx - 1, hy - S(3), headR * 2 + 2, S(4), hatCol);
  } else if (hat === 'bun') { // 发髻（女/童）
    px(ctx, cx - S(3), hy - S(3), S(6), S(3), d.old ? PALETTE.grey : PALETTE.hairBlack);
    if (d.child) { px(ctx, hx, hy - S(2), S(3), S(3), PALETTE.hairBlack); px(ctx, hx + headR * 2 - S(3), hy - S(2), S(3), S(3), PALETTE.hairBlack); }
  } else if (hat === 'rattan') {
    px(ctx, hx - S(4), hy - 1, headR * 2 + S(8), 2, '#8a7a4a'); px(ctx, hx - 1, hy - S(5), headR * 2 + 2, S(4), '#7a6a3a');
  } else if (hat === 'straw') {
    px(ctx, hx - S(5), hy - 1, headR * 2 + S(10), 2, '#d8c070'); px(ctx, hx - 1, hy - S(6), headR * 2 + 2, S(5), '#c8b060');
  }
  // 蓑衣
  if (d.cape) { px(ctx, bx - 2, y0 + 1, bodyW + 4, S(10), '#9a8650'); for (let i = 0; i < bodyW + 4; i += 2) px(ctx, bx - 2 + i, y0 + S(10), 1, S(3), '#8a7640'); }
  // ─ 道具 ─
  const prop = d.prop || 'none';
  const side = dir === DIRS.side ? 1 : -1;
  if (prop === 'pole') { px(ctx, cx + S(8) * side - 1, y0 - S(14), 2, S(40), '#c8a860'); }
  if (prop === 'spear') { px(ctx, cx + S(8) * side - 1, y0 - S(18), 2, S(44), '#7a5a3a'); px(ctx, cx + S(8) * side - 2, y0 - S(22), 4, S(5), '#c0c0c8'); }
  if (prop === 'torch') { px(ctx, cx + S(8) * side - 1, y0 - S(6), 2, S(16), '#7a5a3a'); px(ctx, cx + S(8) * side - 3, y0 - S(11), 6, S(6), '#ffb030'); px(ctx, cx + S(8) * side - 2, y0 - S(13), 4, S(3), '#fff080'); }
  if (prop === 'gong') { px(ctx, cx + S(9) * side - 4, y0 + S(2), 9, 9, '#c8a030'); px(ctx, cx + S(9) * side - 2, y0 + S(4), 5, 5, '#a88020'); }
  if (prop === 'hoe') { px(ctx, cx + S(8) * side - 1, y0 - S(10), 2, S(30), '#8a6a3a'); px(ctx, cx + S(8) * side - 4, y0 - S(12), 8, 3, '#5a5a60'); }
  if (prop === 'bundle') { px(ctx, cx - S(4), y0 + S(8), S(8), S(6), '#c8b890'); px(ctx, cx - S(3), y0 + S(9), S(6), S(4), '#a89870'); }
  if (prop === 'cane') { px(ctx, cx + S(8) * side - 1, y0 + S(6), 2, S(22), '#8a6a3a'); }
  if (prop === 'umbrella') { px(ctx, cx - S(10), y0 - S(18), S(20), S(3), '#d8b070'); px(ctx, cx - 1, y0 - S(16), 2, S(20), '#7a5a3a'); }
  if (prop === 'lantern') { px(ctx, cx + S(9) * side - 1, y0 - S(2), 2, S(8), '#5a3a2a'); px(ctx, cx + S(9) * side - 3, y0 + S(6), 6, S(8), '#ff9a40'); px(ctx, cx + S(9) * side - 2, y0 + S(7), 4, S(6), '#ffd090'); }
}

// 角色衣着表
export const LOOKS = {
  player:    { robe: '#2b2d3a', trim: '#cfc6a8', hat: 'wusha', beard: 'none', skin: 'y', buzi: '#4a6a9a', height: 1.0 },
  changboxi: { robe: '#3b5a3a', trim: '#d8d0a8', hat: 'wusha', beard: 'short', skin: 'y', buzi: '#7a9a5a' },
  maningyuan:{ robe: '#4a3a5a', trim: '#d8d0a8', hat: 'wusha', beard: 'short', skin: 'd', buzi: '#8a4a4a', wide: true },
  huzongxian:{ robe: '#8a2a28', trim: '#e0c890', hat: 'wusha', beard: 'long', skin: 'y', buzi: '#c8a040', wide: true },
  jiangqianhu:{ robe: '#4a3a2a', trim: '#a0a0a8', hat: 'helmet', beard: 'short', skin: 'd', robeLen: 'short', legs: '#2a2a2a', scar: true, prop: 'torch', wide: true },
  soldier:   { robe: '#5a4a3a', trim: '#a0a0a8', hat: 'futou', hatCol: '#8a2a2a', beard: 'stubble', skin: 'd', robeLen: 'short', legs: '#2a2a2a', prop: 'spear' },
  soldier_torch: { robe: '#5a4a3a', trim: '#a0a0a8', hat: 'futou', hatCol: '#8a2a2a', beard: 'stubble', skin: 'd', robeLen: 'short', legs: '#2a2a2a', prop: 'torch' },
  qijun:     { robe: '#3a4a6a', trim: '#c0c0c8', hat: 'helmet', beard: 'none', skin: 'd', robeLen: 'short', legs: '#2a2a2a', prop: 'spear' },
  chaiyi:    { robe: '#2a2a2a', trim: '#8a3030', hat: 'jin', hatCol: '#8a2a2a', beard: 'none', skin: 'y', robeLen: 'short', legs: '#3a3a3a' },
  minzhuang: { robe: '#4a4a44', trim: '#b8a070', hat: 'rattan', beard: 'stubble', skin: 'd', robeLen: 'short', legs: '#3a3a3a', prop: 'pole' },
  fenglaosi: { robe: '#6a5a44', trim: '#9a8a60', hat: 'douli', beard: 'grey', skin: 'o', robeLen: 'short', legs: '#4a4038', old: true, cape: true },
  ayang:     { robe: '#8a5a5a', trim: '#c8a080', hat: 'bun', beard: 'none', skin: 'y', robeLen: 'short', legs: '#5a4a44', child: true, prop: 'none' },
  qidazhu:   { robe: '#5a6a7a', trim: '#8a8a7a', hat: 'jin', hatCol: '#3a3a3a', beard: 'stubble', skin: 'd', robeLen: 'short', legs: '#3a3a3a', wide: true, height: 1.08 },
  laohegong: { robe: '#5a5048', trim: '#8a8060', hat: 'straw', beard: 'grey', skin: 'o', robeLen: 'short', legs: '#3a3028', old: true, prop: 'pole' },
  qianguanjia:{ robe: '#3a3a4a', trim: '#a0a0a0', hat: 'jin', hatCol: '#2a2a3a', beard: 'long', skin: 'o', hands: 'sleeve', old: true },
  villager_m:{ robe: '#5a5a4a', trim: '#8a8060', hat: 'douli', beard: 'stubble', skin: 'd', robeLen: 'short', legs: '#3a3a30', prop: 'hoe' },
  villager_m2:{ robe: '#4a4a5a', trim: '#8a8060', hat: 'jin', hatCol: '#3a3a3a', beard: 'none', skin: 'd', robeLen: 'short', legs: '#3a3a30' },
  villager_f:{ robe: '#6a4a5a', trim: '#b0a080', hat: 'bun', beard: 'none', skin: 'y', robeLen: 'long', female: true },
  villager_f2:{ robe: '#4a5a5a', trim: '#b0a080', hat: 'bun', beard: 'none', skin: 'y', robeLen: 'long', female: true, prop: 'bundle' },
  villager_old:{ robe: '#3a3a3a', trim: '#8a8a7a', hat: 'bun', beard: 'none', skin: 'o', robeLen: 'long', old: true, female: true, height: 0.85, prop: 'cane' },
  villager_child:{ robe: '#5a6a4a', trim: '#b0a080', hat: 'bun', beard: 'none', skin: 'y', robeLen: 'short', legs: '#4a4a40', child: true },
  merchant:  { robe: '#5a3a5a', trim: '#d0c0a0', hat: 'jin', hatCol: '#2a2a2a', beard: 'short', skin: 'y', hands: 'sleeve' },
  townsman:  { robe: '#4a4a6a', trim: '#c0b090', hat: 'jin', hatCol: '#2a2a2a', beard: 'none', skin: 'y' },
  monk:      { robe: '#8a7a5a', trim: '#c0a060', hat: 'none', beard: 'none', skin: 'y', hands: 'sleeve' },
  boatman:   { robe: '#3a4a5a', trim: '#8a8060', hat: 'douli', beard: 'stubble', skin: 'd', robeLen: 'short', legs: '#3a3a30', prop: 'pole' },
  qinbing:   { robe: '#6a2a2a', trim: '#c0c0c8', hat: 'helmet', beard: 'none', skin: 'd', robeLen: 'short', legs: '#2a2a2a', prop: 'lantern' },
};

const atlasCache = new Map();
export function getAtlasTexture(lookId, override) {
  const key = lookId + (override ? JSON.stringify(override) : '');
  if (atlasCache.has(key)) return atlasCache.get(key);
  const desc = Object.assign({}, LOOKS[lookId] || LOOKS.villager_m, override || {});
  const canvas = drawCharacterAtlas(desc);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  atlasCache.set(key, { tex, canvas });
  return atlasCache.get(key);
}

// 从图集中取一帧成单独 canvas（UI 用）
export function frameCanvas(lookId, dir = 0, f = 0, scale = 4) {
  const { canvas } = getAtlasTexture(lookId);
  const c = makeCanvas(FW * scale, FH * scale); const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, f * FW, dir * FH, FW, FH, 0, 0, FW * scale, FH * scale);
  return c;
}
