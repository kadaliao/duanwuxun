// 程序化像素贴图。所有贴图都在 canvas 上画，NearestFilter，走 HD-2D 的像素质感。
import * as THREE from 'three';

let seed = 12345;
export function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
export function setSeed(s) { seed = s >>> 0; }

export function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

export function texFromCanvas(c, { repeat = [1, 1], wrap = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const hex = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
function jitter(rgb, amt) {
  return hex(rgb[0] + (rnd() - 0.5) * amt, rgb[1] + (rnd() - 0.5) * amt, rgb[2] + (rnd() - 0.5) * amt);
}

// 噪点填充：底色 + 随机抖动
export function noiseFill(ctx, w, h, base, amt = 18, step = 1) {
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    ctx.fillStyle = jitter(base, amt); ctx.fillRect(x, y, step, step);
  }
}

// 地形图集：每种地块 16x16，一排排放
export const TILE_KINDS = ['grass', 'field', 'road', 'stone', 'dike', 'hill', 'mud', 'floor', 'sand', 'mulberry', 'dark', 'forest'];
export function makeTerrainAtlas() {
  const T = 16, n = TILE_KINDS.length;
  const c = makeCanvas(T * n, T);
  const ctx = c.getContext('2d');
  const draw = {
    grass: (ox) => {
      noiseFill(ctx, T, T, [96, 128, 62], 24); ctx.setTransform(1, 0, 0, 1, ox, 0);
      noiseFill(ctx, T, T, [98, 132, 64], 26);
      for (let i = 0; i < 9; i++) { ctx.fillStyle = jitter([120, 150, 70], 20); ctx.fillRect((rnd() * T) | 0, (rnd() * T) | 0, 1, 2); }
    },
    field: () => {
      noiseFill(ctx, T, T, [64, 92, 70], 14);
      for (let y = 1; y < T; y += 3) { ctx.fillStyle = 'rgba(40,60,50,0.5)'; ctx.fillRect(0, y, T, 1); }
      for (let i = 0; i < 12; i++) { ctx.fillStyle = jitter([110, 160, 70], 30); ctx.fillRect((rnd() * T) | 0, (rnd() * T) | 0, 1, 1); }
    },
    road: () => { noiseFill(ctx, T, T, [168, 146, 104], 22); for (let i = 0; i < 6; i++) { ctx.fillStyle = jitter([140, 120, 86], 20); ctx.fillRect((rnd() * T) | 0, (rnd() * T) | 0, 2, 1); } },
    stone: () => {
      noiseFill(ctx, T, T, [150, 148, 140], 14);
      ctx.fillStyle = 'rgba(70,70,68,0.55)';
      for (let y = 0; y < T; y += 8) { ctx.fillRect(0, y, T, 1); for (let x = (y / 8) % 2 ? 4 : 0; x < T; x += 8) ctx.fillRect(x, y, 1, 8); }
    },
    dike: () => { noiseFill(ctx, T, T, [172, 150, 110], 20); for (let i = 0; i < 10; i++) { ctx.fillStyle = jitter([140, 125, 95], 24); ctx.fillRect((rnd() * T) | 0, (rnd() * T) | 0, 1, 1); } },
    hill: () => { noiseFill(ctx, T, T, [104, 124, 66], 26); for (let i = 0; i < 7; i++) { ctx.fillStyle = jitter([130, 140, 80], 24); ctx.fillRect((rnd() * T) | 0, (rnd() * T) | 0, 2, 1); } },
    mud: () => { noiseFill(ctx, T, T, [112, 92, 70], 22); },
    floor: () => {
      noiseFill(ctx, T, T, [176, 166, 148], 12);
      ctx.fillStyle = 'rgba(90,84,76,0.45)'; ctx.fillRect(0, 0, T, 1); ctx.fillRect(0, 0, 1, T); ctx.fillRect(8, 0, 1, T); ctx.fillRect(0, 8, T, 1);
    },
    sand: () => { noiseFill(ctx, T, T, [196, 180, 140], 16); },
    mulberry: () => { noiseFill(ctx, T, T, [120, 100, 70], 18); for (let i = 0; i < 6; i++) { ctx.fillStyle = jitter([80, 120, 60], 20); ctx.fillRect((rnd() * T) | 0, (rnd() * T) | 0, 2, 2); } },
    dark: () => { noiseFill(ctx, T, T, [40, 40, 44], 8); },
    forest: () => { noiseFill(ctx, T, T, [58, 84, 48], 22); for (let i = 0; i < 8; i++) { ctx.fillStyle = jitter([40, 64, 40], 20); ctx.fillRect((rnd() * T) | 0, (rnd() * T) | 0, 2, 1); } },
  };
  TILE_KINDS.forEach((k, i) => { ctx.setTransform(1, 0, 0, 1, i * T, 0); draw[k](i * T); });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const t = texFromCanvas(c, { wrap: false });
  return { tex: t, n, T };
}

// 瓦片屋顶
export function makeRoofTex(dark = false) {
  const c = makeCanvas(16, 16), ctx = c.getContext('2d');
  const base = dark ? [58, 60, 66] : [92, 94, 100];
  noiseFill(ctx, 16, 16, base, 14);
  ctx.fillStyle = dark ? 'rgba(20,20,24,0.7)' : 'rgba(40,42,48,0.7)';
  for (let x = 0; x < 16; x += 4) ctx.fillRect(x, 0, 1, 16);
  for (let y = 0; y < 16; y += 4) { ctx.fillStyle = dark ? 'rgba(90,92,100,0.5)' : 'rgba(140,142,150,0.5)'; ctx.fillRect(0, y, 16, 1); }
  return texFromCanvas(c);
}
export function makeThatchTex() {
  const c = makeCanvas(16, 16), ctx = c.getContext('2d');
  noiseFill(ctx, 16, 16, [150, 126, 76], 26);
  for (let i = 0; i < 20; i++) { ctx.fillStyle = jitter([110, 90, 50], 30); ctx.fillRect((rnd() * 16) | 0, (rnd() * 16) | 0, 1, 3); }
  return texFromCanvas(c);
}
export function makeWallTex(kind = 'plaster') {
  const c = makeCanvas(16, 16), ctx = c.getContext('2d');
  if (kind === 'plaster') { noiseFill(ctx, 16, 16, [222, 212, 190], 14); ctx.fillStyle = 'rgba(120,100,80,0.25)'; ctx.fillRect(0, 13, 16, 3); }
  else if (kind === 'brick') { noiseFill(ctx, 16, 16, [128, 124, 118], 12); ctx.fillStyle = 'rgba(60,58,56,0.5)'; for (let y = 0; y < 16; y += 4) { ctx.fillRect(0, y, 16, 1); for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) ctx.fillRect(x, y, 1, 4); } }
  else if (kind === 'red') { noiseFill(ctx, 16, 16, [150, 52, 42], 16); }
  else if (kind === 'wood') { noiseFill(ctx, 16, 16, [110, 78, 48], 18); ctx.fillStyle = 'rgba(50,30,15,0.5)'; for (let x = 0; x < 16; x += 5) ctx.fillRect(x, 0, 1, 16); }
  else if (kind === 'mudwall') { noiseFill(ctx, 16, 16, [170, 150, 112], 20); }
  else if (kind === 'citywall') { noiseFill(ctx, 16, 16, [108, 104, 98], 12); ctx.fillStyle = 'rgba(40,40,40,0.5)'; for (let y = 0; y < 16; y += 8) { ctx.fillRect(0, y, 16, 1); for (let x = (y / 8) % 2 ? 8 : 0; x < 16; x += 16) ctx.fillRect(x, y, 1, 8); } }
  return texFromCanvas(c);
}
// 格子窗：发光用
export function makeWindowTex() {
  const c = makeCanvas(16, 16), ctx = c.getContext('2d');
  ctx.fillStyle = '#f2d08a'; ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#4a3220';
  for (let i = 0; i < 16; i += 4) { ctx.fillRect(i, 0, 1, 16); ctx.fillRect(0, i, 16, 1); }
  ctx.fillRect(15, 0, 1, 16); ctx.fillRect(0, 15, 16, 1);
  return texFromCanvas(c, { wrap: false });
}
export function makeWaterTex() {
  const c = makeCanvas(32, 32), ctx = c.getContext('2d');
  noiseFill(ctx, 32, 32, [110, 110, 110], 50, 1);
  for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect((rnd() * 32) | 0, (rnd() * 32) | 0, 3 + (rnd() * 4) | 0, 1); }
  const t = texFromCanvas(c, { srgb: false }); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; return t;
}
export function makePaperTex() {
  const c = makeCanvas(128, 128), ctx = c.getContext('2d');
  noiseFill(ctx, 128, 128, [128, 128, 128], 30, 1);
  return texFromCanvas(c, { srgb: false });
}
// 树冠贴图（用于 sprite 树）
export function makeTreeSprite(kind) {
  const W = 48, H = 64, c = makeCanvas(W, H), ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const blob = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  if (kind === 'willow') {
    ctx.fillStyle = '#5a4030'; ctx.fillRect(22, 30, 4, 34);
    for (let i = 0; i < 26; i++) { const x = 6 + rnd() * 36, y = 14 + rnd() * 14; blob(x, y, 5 + rnd() * 5, jitter([96, 140, 72], 30)); }
    for (let i = 0; i < 30; i++) { const x = 4 + rnd() * 40; const y0 = 18 + rnd() * 10; const len = 18 + rnd() * 26; ctx.fillStyle = jitter([110, 150, 80], 30); ctx.fillRect(x | 0, y0 | 0, 1, len | 0); }
  } else if (kind === 'camphor') {
    ctx.fillStyle = '#4a3324'; ctx.fillRect(21, 34, 6, 30); ctx.fillRect(16, 40, 4, 6); ctx.fillRect(28, 42, 4, 5);
    for (let i = 0; i < 40; i++) { const x = 4 + rnd() * 40, y = 6 + rnd() * 30; blob(x, y, 5 + rnd() * 6, jitter([54, 96, 56], 30)); }
    for (let i = 0; i < 14; i++) { const x = 8 + rnd() * 32, y = 6 + rnd() * 24; blob(x, y, 2 + rnd() * 3, jitter([90, 130, 70], 24)); }
  } else if (kind === 'pine') {
    ctx.fillStyle = '#4a3324'; ctx.fillRect(22, 36, 4, 28);
    for (let l = 0; l < 4; l++) { const y = 10 + l * 11, w = 10 + l * 8; ctx.fillStyle = jitter([40, 80, 54], 20); ctx.beginPath(); ctx.moveTo(24, y - 8); ctx.lineTo(24 + w / 2, y + 6); ctx.lineTo(24 - w / 2, y + 6); ctx.fill(); }
  } else if (kind === 'mulberry') {
    ctx.fillStyle = '#5a4030'; ctx.fillRect(22, 40, 4, 24);
    for (let i = 0; i < 18; i++) { const x = 10 + rnd() * 28, y = 24 + rnd() * 18; blob(x, y, 4 + rnd() * 4, jitter([84, 130, 60], 30)); }
  } else if (kind === 'bamboo') {
    for (let s = 0; s < 5; s++) { const x = 10 + s * 7 + rnd() * 3; ctx.fillStyle = jitter([120, 160, 80], 20); ctx.fillRect(x | 0, 8 + (rnd() * 10) | 0, 2, 56); for (let i = 0; i < 8; i++) { ctx.fillStyle = jitter([100, 150, 70], 30); ctx.fillRect((x - 4 + rnd() * 8) | 0, (10 + rnd() * 30) | 0, 5, 1); } }
  } else if (kind === 'reed') {
    for (let s = 0; s < 9; s++) { const x = 4 + rnd() * 40; ctx.fillStyle = jitter([150, 140, 90], 30); ctx.fillRect(x | 0, (30 + rnd() * 14) | 0, 1, 34); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x | 0, (26 + rnd() * 10) | 0, 2, 6); }
  }
  return texFromCanvas(c, { wrap: false });
}
