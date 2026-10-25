// 程序化明代建筑：茅屋、瓦房、铺面、大堂、庙、城墙、城门、闸房，及各类道具。合并为少量网格体。
import * as THREE from 'three';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRoofTex, makeThatchTex, makeWallTex, makeWindowTex } from './textures.js';

export class Builder {
  constructor(world) {
    this.world = world;
    this.buckets = {}; // matName -> geometries
    this.mats = {
      plaster: new THREE.MeshStandardMaterial({ map: makeWallTex('plaster'), roughness: 1 }),
      brick: new THREE.MeshStandardMaterial({ map: makeWallTex('brick'), roughness: 1 }),
      mud: new THREE.MeshStandardMaterial({ map: makeWallTex('mudwall'), roughness: 1 }),
      red: new THREE.MeshStandardMaterial({ map: makeWallTex('red'), roughness: 0.9 }),
      wood: new THREE.MeshStandardMaterial({ map: makeWallTex('wood'), roughness: 1 }),
      citywall: new THREE.MeshStandardMaterial({ map: makeWallTex('citywall'), roughness: 1 }),
      roof: new THREE.MeshStandardMaterial({ map: makeRoofTex(false), roughness: 1 }),
      roofDark: new THREE.MeshStandardMaterial({ map: makeRoofTex(true), roughness: 1 }),
      thatch: new THREE.MeshStandardMaterial({ map: makeThatchTex(), roughness: 1 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 1 }),
      stoneDark: new THREE.MeshStandardMaterial({ color: 0x5a5852, roughness: 1 }),
      window: new THREE.MeshStandardMaterial({ map: makeWindowTex(), emissive: 0xffb060, emissiveMap: makeWindowTex(), emissiveIntensity: 0.0, roughness: 1 }),
      lantern: new THREE.MeshStandardMaterial({ color: 0xff7030, emissive: 0xff8040, emissiveIntensity: 0.0, roughness: 0.8 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: 0.5, metalness: 0.4 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: 0.7, metalness: 0.5 }),
      hay: new THREE.MeshStandardMaterial({ color: 0xc8a850, roughness: 1 }),
      white: new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 1 }),
      bluecloth: new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: 1 }),
    };
    this.group = new THREE.Group();
    this.dynamic = []; // 需要单独控制的网格（闸门、船）
  }
  add(matName, geo, matrix) {
    if (matrix) geo.applyMatrix4(matrix);
    (this.buckets[matName] ||= []).push(geo);
  }
  box(matName, w, h, d, x, y, z, ry = 0, uvScale = 1) {
    const g = new THREE.BoxGeometry(w, h, d);
    // 让贴图按尺寸重复
    const uv = g.attributes.uv; const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.array[k * 2] *= sizes[f][0] * uvScale; uv.array[k * 2 + 1] *= sizes[f][1] * uvScale; }
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    this.add(matName, g, m);
  }
  // 歇山/庑殿式屋顶：底面 w×d，高 h，脊长 ridge（0 则为攒尖）。原点在底面中心。
  hipRoof(matName, w, d, h, ridge, x, y, z, ry = 0, curve = 0.25) {
    const hw = w / 2, hd = d / 2, hr = ridge / 2;
    const v = [];
    const quad = (a, b, c, dd) => { v.push(...a, ...b, ...c, ...a, ...c, ...dd); };
    const tri = (a, b, c) => { v.push(...a, ...b, ...c); };
    // 底四角抬起一点（飞檐）
    const lift = curve;
    const A = [-hw, lift, hd], B = [hw, lift, hd], C = [hw, lift, -hd], Dd = [-hw, lift, -hd];
    const R1 = [-hr, h, 0], R2 = [hr, h, 0];
    quad(A, B, R2, R1); // 前坡
    quad(C, Dd, R1, R2); // 后坡
    tri(B, C, R2); tri(Dd, A, R1);
    // 底面封口（防止从下看穿）
    quad(B, A, Dd, C);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    // uv：按 xz 投影
    const uv = []; for (let i = 0; i < v.length; i += 3) uv.push(v[i] * 1.5, v[i + 2] * 1.5 + v[i + 1] * 1.5);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    this.add(matName, g, m);
    // 正脊
    if (ridge > 0.2) this.box('dark', ridge + 0.3, 0.18, 0.22, 0, 0, 0, 0, 1), this.buckets.dark[this.buckets.dark.length - 1].applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y + h, z));
  }
  // 硬山顶：两坡
  gableRoof(matName, w, d, h, x, y, z, ry = 0) {
    const hw = w / 2, hd = d / 2; const v = [];
    const quad = (a, b, c, dd) => { v.push(...a, ...b, ...c, ...a, ...c, ...dd); };
    const A = [-hw, 0, hd], B = [hw, 0, hd], C = [hw, 0, -hd], Dd = [-hw, 0, -hd], R1 = [-hw, h, 0], R2 = [hw, h, 0];
    quad(A, B, R2, R1); quad(C, Dd, R1, R2);
    // 山墙三角
    v.push(...B, ...C, ...R2); v.push(...Dd, ...A, ...R1);
    quad(B, A, Dd, C);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const uv = []; for (let i = 0; i < v.length; i += 3) uv.push(v[i] * 1.5, v[i + 2] * 1.5 + v[i + 1] * 1.5);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    this.add(matName, g, new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    this.box('dark', w + 0.2, 0.16, 0.2, 0, 0, 0, 0, 1); this.buckets.dark[this.buckets.dark.length - 1].applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y + h, z));
  }
  pillar(x, y, z, h, r = 0.12, mat = 'red') { const g = new THREE.CylinderGeometry(r, r, h, 6); this.add(mat, g, new THREE.Matrix4().makeTranslation(x, y + h / 2, z)); }
  lanternMesh(x, y, z) {
    this.box('lantern', 0.3, 0.42, 0.3, x, y, z); this.box('dark', 0.34, 0.06, 0.34, x, y + 0.24, z); this.box('dark', 0.34, 0.06, 0.34, x, y - 0.24, z);
  }

  // ───── 建筑类型 ─────
  build(b) {
    const g = this.world.groundAt(b.x, b.z);
    const fn = this['b_' + b.type]; if (fn) fn.call(this, b, g);
  }
  b_thatch(b, g) {
    const { x, z, w, d, h, rot = 0 } = b;
    this.box('mud', w - 0.3, h, d - 0.3, x, g + h / 2, z, rot);
    this.hipRoof('thatch', w + 0.5, d + 0.5, 0.9, Math.max(w, d) - 1.2, x, g + h - 0.1, z, rot, 0.1);
    // 门
    const dw = 0.5, dh = h * 0.7; const m = new THREE.Matrix4().makeRotationY(rot);
    const off = new THREE.Vector3(0, 0, d / 2 - 0.1).applyMatrix4(m);
    this.box('dark', dw, dh, 0.08, x + off.x, g + dh / 2, z + off.z, rot);
    const woff = new THREE.Vector3(w / 2 - 0.6, 0, d / 2 - 0.1).applyMatrix4(m);
    this.box('window', 0.45, 0.4, 0.06, x + woff.x, g + h * 0.55, z + woff.z, rot);
  }
  b_house(b, g) {
    const { x, z, w, d, h, rot = 0 } = b;
    this.box('plaster', w - 0.2, h, d - 0.2, x, g + h / 2, z, rot);
    this.box('brick', w - 0.1, 0.5, d - 0.1, x, g + 0.25, z, rot);
    this.gableRoof('roof', w + 0.5, d + 0.4, 0.9, x, g + h - 0.05, z, rot);
    const m = new THREE.Matrix4().makeRotationY(rot);
    const off = new THREE.Vector3(0, 0, d / 2 - 0.05).applyMatrix4(m);
    this.box('dark', 0.7, h * 0.72, 0.08, x + off.x, g + h * 0.36, z + off.z, rot);
    for (const sx of [-1, 1]) { const wo = new THREE.Vector3(sx * (w / 2 - 0.8), 0, d / 2 - 0.05).applyMatrix4(m); this.box('window', 0.55, 0.5, 0.06, x + wo.x, g + h * 0.6, z + wo.z, rot); }
  }
  b_house2(b, g) { // 二层客栈
    const { x, z, w, d, h, rot = 0 } = b;
    this.box('plaster', w - 0.2, h * 0.5, d - 0.2, x, g + h * 0.25, z, rot);
    this.box('wood', w, 0.12, d, x, g + h * 0.5, z, rot);
    this.box('plaster', w - 0.5, h * 0.5, d - 0.5, x, g + h * 0.75, z, rot);
    this.hipRoof('roof', w + 0.6, d + 0.6, 1.1, w - 1.5, x, g + h - 0.05, z, rot);
    // 一层廊柱 + 二层栏杆
    const m = new THREE.Matrix4().makeRotationY(rot);
    for (let i = 0; i < 4; i++) { const px = -w / 2 + 0.4 + i * (w - 0.8) / 3; const p = new THREE.Vector3(px, 0, d / 2 - 0.15).applyMatrix4(m); this.pillar(x + p.x, g, z + p.z, h * 0.5, 0.1, 'wood'); }
    const rail = new THREE.Vector3(0, 0, d / 2 - 0.3).applyMatrix4(m); this.box('wood', w - 0.6, 0.35, 0.06, x + rail.x, g + h * 0.5 + 0.25, z + rail.z, rot);
    const off = new THREE.Vector3(0, 0, d / 2 - 0.08).applyMatrix4(m); this.box('dark', 1.0, h * 0.4, 0.1, x + off.x, g + h * 0.2, z + off.z, rot);
    for (const sx of [-1, 1]) { const wo = new THREE.Vector3(sx * (w / 2 - 1.5), 0, d / 2 - 0.22).applyMatrix4(m); this.box('window', 0.7, 0.6, 0.06, x + wo.x, g + h * 0.78, z + wo.z, rot); }
    for (const sx of [-1, 1]) { const wo = new THREE.Vector3(sx * (w / 2 - 2.2), 0, d / 2 - 0.08).applyMatrix4(m); this.box('window', 0.7, 0.6, 0.06, x + wo.x, g + h * 0.3, z + wo.z, rot); }
    // 幌子
    const fo = new THREE.Vector3(-w / 2 + 0.5, 0, d / 2 + 0.3).applyMatrix4(m); this.box('wood', 0.06, 0.06, 0.9, x + fo.x, g + h * 0.5 + 0.6, z + fo.z, rot); this.box('bluecloth', 0.04, 0.8, 0.5, x + fo.x, g + h * 0.5 + 0.15, z + fo.z + 0.5, rot);
    this.lanternMesh(x + off.x - 1.0, g + h * 0.45, z + off.z + 0.3); this.lanternMesh(x + off.x + 1.0, g + h * 0.45, z + off.z + 0.3);
  }
  b_shop(b, g) {
    const { x, z, w, d, h, rot = 0 } = b;
    this.box('plaster', w - 0.2, h, d - 0.2, x, g + h / 2, z, rot);
    this.gableRoof('roofDark', w + 0.4, d + 0.5, 0.8, x, g + h - 0.05, z, rot);
    const m = new THREE.Matrix4().makeRotationY(rot);
    // 门板全开：前脸是木板 + 柜台
    const off = new THREE.Vector3(0, 0, d / 2 - 0.05).applyMatrix4(m);
    this.box('wood', w - 0.6, h * 0.8, 0.1, x + off.x, g + h * 0.4, z + off.z, rot);
    this.box('dark', w - 1.2, h * 0.6, 0.12, x + off.x, g + h * 0.33, z + off.z, rot);
    const co = new THREE.Vector3(0, 0, d / 2 + 0.3).applyMatrix4(m); this.box('wood', w - 1.0, 0.5, 0.5, x + co.x, g + 0.25, z + co.z, rot);
    const eo = new THREE.Vector3(0, 0, d / 2 + 0.5).applyMatrix4(m); this.box('bluecloth', w - 0.4, 0.08, 1.0, x + eo.x, g + h * 0.75, z + eo.z, rot);
    this.lanternMesh(x + eo.x + (rot ? 0 : w / 2 - 0.4), g + h * 0.55, z + eo.z + (rot ? w / 2 - 0.4 : 0));
  }
  b_hall(b, g) { // 县衙大堂：台基 + 柱廊 + 歇山顶
    const { x, z, w, d, h, rot = 0 } = b;
    this.box('stone', w + 1.2, 0.45, d + 1.2, x, g + 0.22, z, rot);
    this.box('plaster', w - 1.4, h, d - 1.0, x, g + 0.45 + h / 2, z - 0.3, rot);
    for (let i = 0; i < 6; i++) { const px = -w / 2 + 0.3 + i * (w - 0.6) / 5; this.pillar(x + px, g + 0.45, z + d / 2 - 0.3, h, 0.14, 'red'); }
    this.hipRoof('roof', w + 1.6, d + 1.4, 1.5, w - 2, x, g + 0.45 + h, z, rot, 0.35);
    this.box('dark', 1.6, h * 0.75, 0.12, x, g + 0.45 + h * 0.37, z + d / 2 - 0.5, rot);
    for (const sx of [-1, 1]) { this.box('window', 1.2, 0.8, 0.08, x + sx * 2.6, g + 0.45 + h * 0.6, z + d / 2 - 0.5, rot); }
    // 匾
    this.box('dark', 2.2, 0.5, 0.1, x, g + 0.45 + h - 0.1, z + d / 2 - 0.2, rot);
    // 台阶
    this.box('stone', 2.0, 0.25, 0.8, x, g + 0.12, z + d / 2 + 0.9, rot);
  }
  b_temple(b, g) {
    const { x, z, w, d, h, rot = 0 } = b;
    this.box('stone', w + 0.8, 0.4, d + 0.8, x, g + 0.2, z, rot);
    this.box('red', w - 0.8, h, d - 0.6, x, g + 0.4 + h / 2, z - 0.2, rot);
    for (let i = 0; i < 4; i++) { const px = -w / 2 + 0.3 + i * (w - 0.6) / 3; this.pillar(x + px, g + 0.4, z + d / 2 - 0.2, h, 0.13, 'red'); }
    this.hipRoof('roofDark', w + 1.4, d + 1.2, 1.5, w - 2, x, g + 0.4 + h, z, rot, 0.4);
    this.box('dark', 1.4, h * 0.75, 0.12, x, g + 0.4 + h * 0.37, z + d / 2 - 0.35, rot);
    this.box('dark', 2.0, 0.5, 0.1, x, g + 0.4 + h - 0.1, z + d / 2 - 0.05, rot);
    this.box('stone', 1.8, 0.2, 0.8, x, g + 0.1, z + d / 2 + 0.7, rot);
    // 香炉
    this.box('iron', 0.6, 0.5, 0.4, x, g + 0.65, z + d / 2 + 1.5, rot);
  }
  b_compound(b, g) { // 院墙 + 南门
    const { x, z, w, d, h } = b; const t = 0.4;
    this.box('plaster', w, h, t, x, g + h / 2, z - d / 2 + t / 2); this.box('roofDark', w + 0.3, 0.22, t + 0.5, x, g + h, z - d / 2 + t / 2);
    this.box('plaster', t, h, d, x - w / 2 + t / 2, g + h / 2, z); this.box('roofDark', t + 0.5, 0.22, d + 0.3, x - w / 2 + t / 2, g + h, z);
    this.box('plaster', t, h, d, x + w / 2 - t / 2, g + h / 2, z); this.box('roofDark', t + 0.5, 0.22, d + 0.3, x + w / 2 - t / 2, g + h, z);
    const gw = 3.2; const seg = (w - gw) / 2;
    this.box('plaster', seg, h, t, x - w / 2 + seg / 2, g + h / 2, z + d / 2 - t / 2); this.box('roofDark', seg + 0.3, 0.22, t + 0.5, x - w / 2 + seg / 2, g + h, z + d / 2 - t / 2);
    this.box('plaster', seg, h, t, x + w / 2 - seg / 2, g + h / 2, z + d / 2 - t / 2); this.box('roofDark', seg + 0.3, 0.22, t + 0.5, x + w / 2 - seg / 2, g + h, z + d / 2 - t / 2);
    // 门楼
    this.pillar(x - gw / 2, g, z + d / 2, h + 0.8, 0.15, 'red'); this.pillar(x + gw / 2, g, z + d / 2, h + 0.8, 0.15, 'red');
    this.gableRoof('roof', gw + 1.2, 1.8, 0.8, x, g + h + 0.8, z + d / 2, 0);
    this.box('dark', 1.8, 0.45, 0.1, x, g + h + 0.5, z + d / 2 + 0.6);
  }
  b_citywall(b, g) {
    const { x, z, w, d, h } = b;
    const along = w > d ? 'x' : 'z'; const len = Math.max(w, d); const thick = 1.3;
    this.box('citywall', along === 'x' ? w : thick, h, along === 'x' ? thick : d, x, g + h / 2, z, 0, 0.5);
    // 雉堞
    for (let i = 0; i < len; i += 1.0) {
      const px = along === 'x' ? x - w / 2 + i + 0.5 : x, pz = along === 'z' ? z - d / 2 + i + 0.5 : z;
      this.box('citywall', along === 'x' ? 0.6 : thick, 0.5, along === 'x' ? thick : 0.6, px, g + h + 0.25, pz, 0, 0.5);
    }
  }
  b_gate(b, g) {
    const { x, z, w, d, h, rot = 0 } = b;
    // 城门：两侧墩 + 上方城楼
    const m = new THREE.Matrix4().makeRotationY(rot);
    const o1 = new THREE.Vector3(0, 0, -d / 2 - 0.6).applyMatrix4(m), o2 = new THREE.Vector3(0, 0, d / 2 + 0.6).applyMatrix4(m);
    this.box('citywall', w + 0.5, h, 1.6, x + o1.x, g + h / 2, z + o1.z, rot, 0.5); this.box('citywall', w + 0.5, h, 1.6, x + o2.x, g + h / 2, z + o2.z, rot, 0.5);
    this.box('citywall', w + 0.5, 1.2, d + 2.8, x, g + h - 0.6, z, rot, 0.5);
    this.box('plaster', w - 0.6, 1.6, d + 1.4, x, g + h + 0.8, z, rot);
    this.hipRoof('roofDark', w + 1.4, d + 2.6, 1.3, d, x, g + h + 1.6, z, rot + Math.PI / 2, 0.35);
    for (const s of [-1, 1]) { const lo = new THREE.Vector3(s * (w / 2 + 0.4), 0, 0).applyMatrix4(m); this.lanternMesh(x + lo.x, g + h + 0.4, z + lo.z); }
  }
  b_sluice(b, g) { // 闸房 + 闸门
    const { x, z, w, d, h } = b;
    this.box('stone', 0.8, h, d, x - w / 2 + 0.4, g + h / 2, z); this.box('stone', 0.8, h, d, x + w / 2 - 0.4, g + h / 2, z);
    this.box('wood', w, 0.3, d, x, g + h + 0.15, z);
    this.gableRoof('roofDark', w + 0.8, d + 0.8, 0.8, x, g + h + 0.3, z, 0);
    // 闸门（可动）
    const gate = new THREE.Mesh(new THREE.BoxGeometry(w - 1.6, 2.2, 0.3), this.mats.wood); gate.position.set(x, g - 0.3, z); gate.castShadow = true; gate.name = 'sluice_gate'; this.dynamic.push(gate); this.group.add(gate);
    // 绞盘
    this.box('wood', 1.0, 0.3, 0.3, x, g + h + 0.6, z); this.box('iron', 0.1, 0.8, 0.1, x - 0.4, g + h + 0.6, z); this.box('iron', 0.1, 0.8, 0.1, x + 0.4, g + h + 0.6, z);
    this.lanternMesh(x - w / 2 - 0.3, g + h - 0.4, z + d / 2);
  }

  // ───── 道具 ─────
  prop(p) {
    const g = this.world.groundAt(p.x, p.z); const fn = this['p_' + p.type]; if (fn) fn.call(this, p, g);
  }
  p_well(p, g) { this.box('stone', 1.0, 0.7, 1.0, p.x, g + 0.35, p.z); this.box('dark', 0.5, 0.1, 0.5, p.x, g + 0.72, p.z); this.box('wood', 0.08, 1.6, 0.08, p.x - 0.4, g + 0.8, p.z); this.box('wood', 0.08, 1.6, 0.08, p.x + 0.4, g + 0.8, p.z); this.box('wood', 1.0, 0.08, 0.08, p.x, g + 1.6, p.z); }
  p_haystack(p, g) { const geo = new THREE.ConeGeometry(0.7, 1.3, 7); this.add('hay', geo, new THREE.Matrix4().makeTranslation(p.x, g + 0.65, p.z)); }
  p_fence(p, g) { for (let i = 0; i < p.len; i++) { const x = p.dir === 'x' ? p.x + i : p.x, z = p.dir === 'z' ? p.z + i : p.z; const gg = this.world.groundAt(x + 0.5, z + 0.5); this.box('wood', 0.08, 0.8, 0.08, x + 0.5, gg + 0.4, z + 0.5); } const cx = p.dir === 'x' ? p.x + p.len / 2 : p.x + 0.5, cz = p.dir === 'z' ? p.z + p.len / 2 : p.z + 0.5; this.box('wood', p.dir === 'x' ? p.len : 0.06, 0.06, p.dir === 'z' ? p.len : 0.06, cx, this.world.groundAt(cx, cz) + 0.65, cz); }
  p_bridge(p, g) { const w = p.dir === 'x' ? p.w : p.d, d = p.dir === 'x' ? p.d : p.w; this.box('wood', w + 0.6, 0.12, d, p.x, 0.12, p.z); this.box('wood', w + 0.6, 0.06, 0.06, p.x, 0.5, p.z - d / 2 + 0.05); this.box('wood', w + 0.6, 0.06, 0.06, p.x, 0.5, p.z + d / 2 - 0.05); }
  p_gongstand(p, g) { this.box('wood', 0.08, 1.5, 0.08, p.x - 0.5, g + 0.75, p.z); this.box('wood', 0.08, 1.5, 0.08, p.x + 0.5, g + 0.75, p.z); this.box('wood', 1.1, 0.08, 0.08, p.x, g + 1.5, p.z); const gong = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12), this.mats.gold); gong.rotation.x = Math.PI / 2; gong.position.set(p.x, g + 0.9, p.z); gong.name = 'gong'; gong.castShadow = true; this.dynamic.push(gong); this.group.add(gong); }
  p_drum(p, g) { this.box('wood', 0.08, 1.4, 0.08, p.x - 0.5, g + 0.7, p.z); this.box('wood', 0.08, 1.4, 0.08, p.x + 0.5, g + 0.7, p.z); const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 10); this.add('red', geo, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(p.x, g + 0.9, p.z)); }
  p_lion(p, g) { this.box('stone', 0.5, 0.4, 0.6, p.x, g + 0.2, p.z); this.box('stoneDark', 0.42, 0.6, 0.5, p.x, g + 0.7, p.z); this.box('stoneDark', 0.4, 0.38, 0.38, p.x, g + 1.15, p.z); }
  p_lamppost(p, g) { this.box('wood', 0.1, 2.0, 0.1, p.x, g + 1.0, p.z); this.box('wood', 0.5, 0.06, 0.06, p.x + 0.2, g + 2.0, p.z); this.lanternMesh(p.x + 0.4, g + 1.75, p.z); }
  p_incense(p, g) { this.box('iron', 1.0, 0.7, 0.6, p.x, g + 0.5, p.z); this.box('iron', 0.1, 0.4, 0.1, p.x - 0.4, g + 0.2, p.z); this.box('iron', 0.1, 0.4, 0.1, p.x + 0.4, g + 0.2, p.z); this.box('iron', 0.14, 0.5, 0.14, p.x - 0.3, g + 1.0, p.z); this.box('iron', 0.14, 0.5, 0.14, p.x + 0.3, g + 1.0, p.z); }
  p_pier(p, g) { const y = -0.1; this.box('wood', p.w, 0.15, p.d, p.x, y, p.z); for (let i = 0; i < p.d; i += 2) { this.box('wood', 0.16, 1.8, 0.16, p.x - p.w / 2 + 0.1, y - 0.8, p.z - p.d / 2 + i + 0.3); this.box('wood', 0.16, 1.8, 0.16, p.x + p.w / 2 - 0.1, y - 0.8, p.z - p.d / 2 + i + 0.3); } this.box('wood', 0.06, 0.06, p.d, p.x - p.w / 2 + 0.1, y + 0.5, p.z); this.box('wood', 0.06, 0.06, p.d, p.x + p.w / 2 - 0.1, y + 0.5, p.z); }
  p_boat(p, g) {
    const grp = new THREE.Group(); const L = p.big ? 4.2 : 2.6, Wd = p.big ? 1.6 : 1.0;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(Wd, 0.5, L), this.mats.wood); hull.position.y = -0.1; grp.add(hull);
    const bow = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.6, 0.45, 0.6), this.mats.wood); bow.position.set(0, 0.0, L / 2 + 0.2); grp.add(bow);
    const stern = bow.clone(); stern.position.z = -L / 2 - 0.2; grp.add(stern);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(Wd - 0.2, 0.06, L - 0.3), this.mats.dark); deck.position.y = 0.15; grp.add(deck);
    if (p.big) { const cargo = new THREE.Mesh(new THREE.BoxGeometry(Wd - 0.4, 0.5, L * 0.55), this.mats.hay); cargo.position.set(0, 0.4, -0.3); grp.add(cargo); const cover = new THREE.Mesh(new THREE.BoxGeometry(Wd - 0.3, 0.1, L * 0.6), this.mats.bluecloth); cover.position.set(0, 0.68, -0.3); grp.add(cover); }
    else { const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 8, 1, false, 0, Math.PI), this.mats.hay); canopy.rotation.z = Math.PI / 2; canopy.rotation.y = Math.PI / 2; canopy.position.set(0, 0.2, -0.2); grp.add(canopy); }
    grp.position.set(p.x, -0.35, p.z); grp.rotation.y = p.rot || (Math.random() - 0.5) * 0.3;
    grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    grp.name = p.id || 'boat'; grp.userData = { boat: true, id: p.id };
    this.dynamic.push(grp); this.group.add(grp);
  }

  finish() {
    for (const name in this.buckets) {
      const geos = this.buckets[name].map(g => g.index ? g.toNonIndexed() : g);
      // 统一属性集合
      for (const g of geos) { if (!g.attributes.normal) g.computeVertexNormals(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); }
      const merged = BGU.mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, this.mats[name]); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'bld_' + name;
      this.group.add(mesh);
    }
    this.buckets = {};
    return this.group;
  }
}
