// 人物图集：assets/img/sprites/<look>.webp + .json（cw, ch, cols, rows）。行 0 正面、1 背面、2 侧面（朝右）。
import * as THREE from 'three';
const cache = new Map(); const loader = new THREE.TextureLoader();
export const META = {};
export async function preloadLooks(ids) { await Promise.all(ids.map(id => loadLook(id))); }
export function loadLook(id) {
  if (cache.has(id)) return cache.get(id);
  const p = (async () => {
    let meta = null;
    try { const r = await fetch(`assets/img/sprites/${id}.json`); if (r.ok) meta = await r.json(); } catch (e) { }
    if (!meta) return placeholder(id);
    const tex = await new Promise((res, rej) => loader.load(`assets/img/sprites/${id}.webp`, res, undefined, rej)).catch(() => null);
    if (!tex) return placeholder(id);
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
    const look = { id, tex, cw: meta.cw, ch: meta.ch, cols: meta.cols, rows: meta.rows, frames: meta.frames || meta.cols, feet: meta.feet ?? 0, placeholder: false };
    META[id] = look; return look;
  })();
  cache.set(id, p); return p;
}
// 没有图集时：一个暗色剪影，游戏照样能跑
function placeholder(id) {
  const cw = 120, ch = 300, cols = 6, rows = 3; const c = document.createElement('canvas'); c.width = cw * cols; c.height = ch * rows; const ctx = c.getContext('2d');
  const hue = [...id].reduce((n, ch2) => n + ch2.charCodeAt(0), 0) % 360;
  for (let r = 0; r < rows; r++) for (let f = 0; f < cols; f++) {
    const x = f * cw, y = r * ch; ctx.fillStyle = `hsl(${hue},25%,${28 + r * 6}%)`;
    ctx.beginPath(); ctx.ellipse(x + cw / 2, y + 60, 26, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x + cw / 2 - 34, y + 90, 68, 180); const sw = f ? Math.sin(f / cols * Math.PI * 2) * 14 : 0; ctx.fillRect(x + cw / 2 - 30 + sw, y + 250, 24, 46); ctx.fillRect(x + cw / 2 + 6 - sw, y + 250, 24, 46);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const look = { id, tex, cw, ch, cols, rows, frames: cols, feet: 4, placeholder: true }; META[id] = look; return look;
}
// 取一帧成 dataURL（账簿人物用）
export function frameDataURL(look, row = 0, frame = 0) {
  const c = document.createElement('canvas'); c.width = look.cw; c.height = look.ch; const ctx = c.getContext('2d');
  const img = look.tex.image; ctx.drawImage(img, frame * look.cw, row * look.ch, look.cw, look.ch, 0, 0, look.cw, look.ch);
  return c.toDataURL();
}
