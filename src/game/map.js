// 淳安地图：新安江、大堤、闸口、冯家村、淳安县城、渡口、后山龙王庙。
// 网格 128x128，x 向东，z 向南。高度单位 = 一个地块边长。
import { TILE_KINDS } from '../engine/textures.js';
import { setSeed, rnd } from '../engine/textures.js';

export const W = 128, D = 128;
const K = {}; TILE_KINDS.forEach((k, i) => K[k] = i);
export { K };

export function buildMap() {
  setSeed(20240505);
  const kind = new Uint8Array(W * D).fill(K.grass);
  const h = new Float32Array(W * D).fill(0);
  const walk = new Uint8Array(W * D).fill(1);
  const water = new Float32Array(W * D).fill(-99); // 水面高度；-99 = 无水
  const zone = new Uint8Array(W * D).fill(0); // 区域 id（用于提示地名/音乐）
  const buildings = [], trees = [], props = [], lights = [];
  const idx = (x, z) => z * W + x;
  const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < D;
  const set = (x, z, k, hh, wk) => { if (!inb(x, z)) return; const i = idx(x, z); if (k != null) kind[i] = k; if (hh != null) h[i] = hh; if (wk != null) walk[i] = wk; };
  const rect = (x0, z0, x1, z1, k, hh, wk) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, z, k, hh, wk); };
  const rectZone = (x0, z0, x1, z1, id) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (inb(x, z)) zone[idx(x, z)] = id; };
  const setWater = (x0, z0, x1, z1, lvl) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (inb(x, z)) water[idx(x, z)] = lvl; };
  const hill = (cx, cz, r, peak, kindId) => {
    for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) {
      if (!inb(x, z)) continue; const d = Math.hypot(x - cx, z - cz) / r; if (d > 1) continue;
      const v = peak * Math.pow(1 - d * d, 1.4);
      const i = idx(x, z); if (v > h[i]) { h[i] = v; if (kindId != null && v > 0.3) kind[i] = kindId; }
    }
  };
  const noiseH = (x0, z0, x1, z1, amt) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (inb(x, z)) h[idx(x, z)] += (rnd() - 0.5) * amt; };

  // ───────── 全图底：草地，远处微起伏
  rect(0, 0, W - 1, D - 1, K.grass, 0, 1);

  // ───────── 新安江：z 0..15
  rect(0, 0, W - 1, 15, K.dark, -1.6, 0);
  rect(0, 16, W - 1, 16, K.sand, -0.6, 1); // 滩
  rect(0, 17, W - 1, 17, K.sand, -0.1, 1);
  setWater(0, 0, W - 1, 16, -0.35);
  // 远岸（北岸）山影：第 0..3 行加高成对岸
  for (let x = 0; x < W; x++) { for (let z = 0; z <= 2; z++) { set(x, z, K.forest, 1.2 + Math.sin(x * 0.3) * 0.5 + rnd() * 0.3, 0); water[idx(x, z)] = -99; } }

  // ───────── 大堤：z 18..21，堤顶 z 19..20 高 2.2
  rect(0, 18, W - 1, 18, K.dike, 1.2, 1);
  rect(0, 19, W - 1, 20, K.dike, 2.2, 1);
  rect(0, 21, W - 1, 21, K.dike, 1.2, 1);
  rect(0, 22, W - 1, 22, K.grass, 0.4, 1);
  rectZone(0, 16, W - 1, 22, 2); // 堤
  // 堤顶条石路
  rect(0, 19, W - 1, 20, K.stone, 2.2, 1);

  // ───────── 闸口：x 44..47，堤上的闸房 + 向南的水渠
  rect(44, 18, 47, 21, K.stone, 2.2, 1);
  buildings.push({ type: 'sluice', x: 45.5, z: 19.5, w: 4, d: 3, h: 2.6 });
  // 渠：x 45..46, z 22..60 浅水
  rect(45, 22, 46, 60, K.mud, -0.25, 1);
  setWater(45, 22, 46, 60, -0.05);
  // 渠上三座小木桥
  for (const bz of [30, 44, 56]) { props.push({ type: 'bridge', x: 45.5, z: bz + 0.5, w: 2.4, d: 2, dir: 'x' }); rect(45, bz, 46, bz, K.mud, 0.05, 1); setWater(45, bz, 46, bz, -99); }
  rectZone(42, 17, 49, 24, 3); // 闸口

  // ───────── 稻田：x 3..66, z 23..64（田埂每 7 格）
  for (let z = 23; z <= 64; z++) for (let x = 3; x <= 66; x++) {
    const bund = (x - 3) % 7 === 0 || (z - 23) % 7 === 0;
    if (x >= 45 && x <= 46) continue;
    set(x, z, bund ? K.mud : K.field, bund ? 0.12 : 0, 1);
    if (!bund) water[idx(x, z)] = 0.04;
  }
  rectZone(3, 23, 66, 64, 4); // 田

  // ───────── 冯家村：x 24..43, z 36..53，村台高 0.35
  rect(23, 35, 44, 54, K.road, 0.35, 1);
  setWater(23, 35, 44, 54, -99);
  rect(26, 38, 41, 51, K.sand, 0.35, 1);
  rectZone(23, 35, 44, 54, 5);
  const houses = [
    [26, 38, 3, 3, 0], [31, 37, 3, 3, 0], [36, 37, 3, 3, 0], [41, 38, 3, 3, 1],
    [25, 43, 3, 3, 1], [25, 48, 3, 3, 1], [40, 43, 3, 3, 1], [40, 48, 3, 3, 1],
    [28, 51, 3, 3, 0], [33, 51, 3, 3, 0], [37, 51, 3, 3, 0], [30, 42, 2, 2, 0],
  ];
  houses.forEach(([x, z, w, d, rot], i) => {
    buildings.push({ type: 'thatch', x: x + w / 2, z: z + d / 2, w, d, h: 1.6, rot: rot ? Math.PI / 2 : 0, id: 'house' + i });
    rect(x, z, x + w - 1, z + d - 1, null, 0.35, 0);
  });
  // 冯老四家（单独标记，靠村南，近田）
  buildings.push({ type: 'thatch', x: 34.5, z: 46.5, w: 3, d: 3, h: 1.7, rot: 0, id: 'feng_home' });
  rect(33, 45, 35, 47, null, 0.35, 0);
  // 老樟树（村中心偏北）
  trees.push({ kind: 'camphor', x: 33.5, z: 41.5, s: 2.6, big: true }); rect(33, 41, 34, 42, null, null, 0);
  props.push({ type: 'well', x: 37.5, z: 44.5 }); set(37, 44, null, null, 0);
  props.push({ type: 'haystack', x: 29.5, z: 46.5 }); props.push({ type: 'haystack', x: 39.5, z: 40.5 });
  props.push({ type: 'fence', x: 24, z: 41, len: 6, dir: 'z' }); props.push({ type: 'fence', x: 43, z: 41, len: 6, dir: 'z' });
  lights.push({ x: 33.5, z: 43.5, y: 1.6, color: 0xffa040, dist: 7, id: 'village_lantern' });
  lights.push({ x: 36, z: 48.5, y: 1.4, color: 0xffa040, dist: 5 });

  // ───────── 村到堤的坡道（x 33..35, z 22..35）与村东大路
  rect(33, 23, 35, 35, K.road, 0.35, 1); for (let x = 33; x <= 35; x++) { set(x, 22, K.road, 0.9, 1); set(x, 21, K.road, 1.5, 1); }
  setWater(33, 23, 35, 35, -99);
  // 大路：村东 → 县城西门 z 44..45
  rect(44, 44, 72, 45, K.road, 0.3, 1); setWater(44, 44, 72, 45, -99);
  rect(45, 44, 46, 45, K.mud, 0.05, 1); // 桥处
  // 村南 → 后山的小路
  rect(31, 54, 32, 66, K.road, 0.3, 1); setWater(31, 54, 32, 66, -99);

  // ───────── 淳安县城：x 72..124, z 26..74，地面高 0.8
  rect(72, 26, 124, 74, K.floor, 0.8, 1); setWater(72, 26, 124, 74, -99);
  rectZone(72, 26, 124, 74, 6);
  // 城墙
  const wallH = 2.6;
  const wall = (x0, z0, x1, z1) => { buildings.push({ type: 'citywall', x: (x0 + x1 + 1) / 2, z: (z0 + z1 + 1) / 2, w: x1 - x0 + 1, d: z1 - z0 + 1, h: wallH }); rect(x0, z0, x1, z1, K.stone, 0.8, 0); };
  wall(72, 26, 124, 27); wall(72, 73, 124, 74); wall(72, 28, 73, 42); wall(72, 48, 73, 72); wall(123, 28, 124, 72);
  // 西门 (z 43..47 开口) 城楼
  buildings.push({ type: 'gate', x: 73, z: 45.5, w: 4, d: 7, h: 3.2, rot: 0, id: 'westgate' });
  rect(72, 43, 73, 47, K.stone, 0.8, 1);
  // 北门 x 97..100 通渡口
  rect(97, 26, 100, 27, K.stone, 0.8, 1);
  buildings.push({ type: 'gate', x: 98.5, z: 27, w: 7, d: 4, h: 3.2, rot: Math.PI / 2, id: 'northgate' });
  // 主街：东西 z 44..46；南北 x 97..99
  rect(74, 44, 122, 46, K.stone, 0.8, 1);
  rect(97, 28, 99, 72, K.stone, 0.8, 1);
  // 县衙：x 90..110, z 29..42，院墙 + 大堂 + 二堂 + 东西厢
  rect(88, 29, 110, 42, K.floor, 0.85, 1);
  buildings.push({ type: 'compound', x: 99, z: 35.5, w: 22, d: 14, h: 2.0, id: 'yamen_wall', gate: 'south' });
  buildings.push({ type: 'hall', x: 99, z: 32.8, w: 11, d: 5, h: 3.4, id: 'yamen_hall', sign: '淳安县署' });
  rect(93, 29, 105, 35, null, 0.85, 0); rect(96, 35, 102, 35, null, 0.85, 1); // 大堂门口可进
  buildings.push({ type: 'house', x: 91.5, z: 37.5, w: 3, d: 6, h: 2.4, rot: 0, id: 'yamen_west' }); rect(90, 35, 92, 39, null, 0.85, 0);
  buildings.push({ type: 'house', x: 106.5, z: 37.5, w: 3, d: 6, h: 2.4, rot: 0, id: 'yamen_east' }); rect(105, 35, 107, 39, null, 0.85, 0);
  props.push({ type: 'gongstand', x: 96.5, z: 36.2, id: 'yamen_gong' });
  props.push({ type: 'drum', x: 101.5, z: 36.2 });
  lights.push({ x: 96.5, z: 42.5, y: 2.2, color: 0xff9a40, dist: 8, id: 'yamen_l1' }); lights.push({ x: 101.5, z: 42.5, y: 2.2, color: 0xff9a40, dist: 8, id: 'yamen_l2' });
  // 院门前石狮
  props.push({ type: 'lion', x: 96.5, z: 43.5 }); props.push({ type: 'lion', x: 101.5, z: 43.5 });
  // 客栈（程知白住处）x 78..86, z 49..55
  buildings.push({ type: 'house2', x: 82, z: 52, w: 8, d: 6, h: 4.2, rot: 0, id: 'inn', sign: '客栈' }); rect(78, 49, 85, 54, null, 0.8, 0); rect(81, 54, 82, 54, null, 0.8, 1);
  lights.push({ x: 81.5, z: 55.5, y: 1.8, color: 0xffb060, dist: 7, id: 'inn_lantern' });
  // 街市：沿主街两侧的铺面
  const shops = [[76, 40, 4, 3], [81, 40, 5, 3], [87, 40, 3, 3], [112, 40, 4, 3], [117, 40, 4, 3],
    [76, 48, 2, 3], [88, 48, 4, 3], [93, 48, 3, 3], [102, 48, 4, 3], [107, 48, 4, 3], [112, 48, 4, 3], [117, 48, 4, 3]];
  shops.forEach(([x, z, w, d], i) => { buildings.push({ type: 'shop', x: x + w / 2, z: z + d / 2, w, d, h: 2.4, rot: z < 44 ? Math.PI : 0, id: 'shop' + i }); rect(x, z, x + w - 1, z + d - 1, null, 0.8, 0); });
  // 居民区
  const homes = [[76, 58, 4, 4], [82, 58, 4, 4], [88, 58, 4, 4], [103, 58, 4, 4], [109, 58, 4, 4], [115, 58, 4, 4], [76, 65, 4, 4], [82, 65, 4, 4], [88, 65, 5, 4], [103, 65, 5, 4], [110, 65, 4, 4], [116, 65, 4, 4],
    [76, 30, 4, 4], [81, 30, 4, 4], [113, 30, 4, 4], [118, 30, 4, 4], [76, 35, 3, 3], [81, 35, 4, 3], [114, 35, 3, 3], [118, 35, 3, 3]];
  homes.forEach(([x, z, w, d], i) => { buildings.push({ type: 'house', x: x + w / 2, z: z + d / 2, w, d, h: 2.6, rot: (i % 2) * Math.PI / 2, id: 'home' + i }); rect(x, z, x + w - 1, z + d - 1, null, 0.8, 0); });
  // 城隍庙（东南）
  buildings.push({ type: 'temple', x: 110, z: 55, w: 7, d: 5, h: 3.2, id: 'chenghuang', sign: '城隍庙', red: true }); rect(107, 53, 113, 57, null, 0.8, 0); rect(109, 57, 111, 57, null, 0.8, 1);
  lights.push({ x: 108, z: 58.5, y: 1.8, color: 0xff8030, dist: 6 }); lights.push({ x: 112, z: 58.5, y: 1.8, color: 0xff8030, dist: 6 });
  // 街灯
  for (const x of [78, 86, 94, 104, 112, 120]) { lights.push({ x: x + 0.5, z: 43.3, y: 2.0, color: 0xffa050, dist: 6 }); props.push({ type: 'lamppost', x: x + 0.5, z: 43.3 }); }
  for (const z of [34, 54, 64]) { lights.push({ x: 96.3, z: z + 0.5, y: 2.0, color: 0xffa050, dist: 6 }); props.push({ type: 'lamppost', x: 96.3, z: z + 0.5 }); }
  // 城内树
  for (const [x, z] of [[78.5, 45.5], [92.5, 43.3], [105.5, 47.5], [120.5, 47.5], [80.5, 62.5], [100.5, 62.5], [118.5, 62.5], [86.5, 32.5], [112.5, 32.5]]) { trees.push({ kind: 'camphor', x, z, s: 1.8 }); set(x | 0, z | 0, null, null, 0); }
  // 城里的井和石桌
  props.push({ type: 'well', x: 100.5, z: 50.5 }); set(100, 50, null, null, 0);

  // ───────── 渡口：x 92..106，z 12..22。堤上开口 x 96..100
  rect(96, 18, 100, 21, K.stone, 2.2, 1);
  for (let x = 96; x <= 100; x++) { set(x, 17, K.stone, 1.5, 1); set(x, 16, K.stone, 0.7, 1); set(x, 15, K.stone, 0.1, 1); water[idx(x, 15)] = -99; water[idx(x, 16)] = -99; }
  rect(96, 22, 100, 25, K.stone, 1.3, 1); for (let x = 96; x <= 100; x++) { set(x, 22, K.stone, 1.7, 1); set(x, 23, K.stone, 1.4, 1); set(x, 24, K.stone, 1.1, 1); set(x, 25, K.stone, 0.95, 1); }
  props.push({ type: 'pier', x: 98.5, z: 10, w: 4, d: 10 });
  for (let z = 6; z <= 14; z++) for (let x = 97; x <= 99; x++) { walk[idx(x, z)] = 1; }
  const boats = [[92, 9], [92, 13], [105, 8], [105, 12], [109, 10]];
  boats.forEach(([x, z], i) => props.push({ type: 'boat', x: x + 0.5, z: z + 0.5, big: true, id: 'grainboat' + i }));
  props.push({ type: 'boat', x: 95.5, z: 5.5, big: false, id: 'ferry' });
  lights.push({ x: 98.5, z: 6.5, y: 1.4, color: 0xffa050, dist: 5, id: 'pier_lantern' });
  rectZone(90, 3, 110, 25, 7);
  // 渡口小屋（钱管家）
  buildings.push({ type: 'thatch', x: 104.5, z: 23.5, w: 3, d: 3, h: 1.6, rot: 0, id: 'pier_hut' }); rect(103, 22, 105, 24, K.road, 0.9, 0);
  rect(101, 22, 106, 25, K.road, 0.9, 1); rect(103, 22, 105, 24, null, null, 0);

  // ───────── 后山与龙王庙：山心 (18, 100)
  hill(18, 100, 34, 7.5, K.hill);
  hill(40, 112, 22, 4.0, K.hill);
  hill(8, 70, 14, 2.5, K.hill);
  // 山顶平台与庙
  for (let z = 92; z <= 104; z++) for (let x = 10; x <= 28; x++) { const i = idx(x, z); h[i] = Math.max(h[i], 6.2); kind[i] = K.floor; }
  buildings.push({ type: 'temple', x: 19, z: 95.5, w: 9, d: 5, h: 3.6, id: 'longwang', sign: '龙王庙', red: true });
  rect(14, 93, 23, 97, null, 6.2, 0); rect(17, 97, 20, 97, null, 6.2, 1);
  buildings.push({ type: 'house', x: 12.5, z: 100, w: 3, d: 4, h: 2.2, rot: 0, id: 'temple_side' }); rect(11, 98, 13, 101, null, 6.2, 0);
  props.push({ type: 'incense', x: 19, z: 99.5 });
  lights.push({ x: 16.5, z: 98.5, y: 1.8, color: 0xff9a40, dist: 7, id: 'temple_l1' }); lights.push({ x: 21.5, z: 98.5, y: 1.8, color: 0xff9a40, dist: 7, id: 'temple_l2' });
  for (const [x, z] of [[8.5, 92.5], [30.5, 94.5], [12.5, 106.5], [26.5, 105.5], [6.5, 100.5]]) { trees.push({ kind: 'pine', x, z, s: 2.2 }); set(x | 0, z | 0, null, null, 0); }
  rectZone(0, 66, 50, 127, 8);
  // 上山路：从 (31,66) 蜿蜒到 (19,98)
  const pathPts = [[31, 66], [30, 72], [27, 78], [24, 84], [22, 90], [20, 97]];
  for (let i = 0; i < pathPts.length - 1; i++) {
    const [ax, az] = pathPts[i], [bx, bz] = pathPts[i + 1]; const n = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
    for (let t = 0; t <= n; t++) { const x = Math.round(ax + (bx - ax) * t / n), z = Math.round(az + (bz - az) * t / n); for (let dx = 0; dx <= 1; dx++) { const i2 = idx(x + dx, z); kind[i2] = K.road; walk[i2] = 1; } }
  }
  // 山坡上的树
  for (let i = 0; i < 90; i++) {
    const x = 2 + rnd() * 48, z = 66 + rnd() * 60; const i2 = idx(x | 0, z | 0);
    if (kind[i2] !== K.hill && kind[i2] !== K.grass) continue; if (walk[i2] === 0) continue;
    const kindT = rnd() < 0.5 ? 'pine' : rnd() < 0.5 ? 'camphor' : 'bamboo';
    trees.push({ kind: kindT, x: (x | 0) + 0.5, z: (z | 0) + 0.5, s: 1.6 + rnd() * 1.2 }); walk[i2] = 0;
  }

  // ───────── 东南桑田（已改桑）x 70..124, z 78..124
  for (let z = 78; z <= 124; z++) for (let x = 70; x <= 124; x++) { set(x, z, K.mulberry, 0.3 + (rnd() - 0.5) * 0.1, 1); }
  for (let z = 80; z <= 122; z += 3) for (let x = 72; x <= 122; x += 3) { if (rnd() < 0.8) trees.push({ kind: 'mulberry', x: x + 0.5 + (rnd() - 0.5), z: z + 0.5 + (rnd() - 0.5), s: 1.0 + rnd() * 0.3 }); }
  rectZone(70, 76, 127, 127, 9);
  rect(97, 75, 99, 78, K.road, 0.6, 1); // 南门外
  rect(97, 73, 99, 74, K.stone, 0.8, 1);
  // 东边远山
  hill(118, 110, 26, 5, K.hill); hill(126, 60, 10, 3, K.hill);

  // ───────── 堤上柳树（每隔几格）与堤脚芦苇
  for (let x = 2; x < W; x += 5) { if (x > 42 && x < 50) continue; if (x > 94 && x < 102) continue; trees.push({ kind: 'willow', x: x + 0.5 + rnd(), z: 21.4, s: 1.9 + rnd() * 0.5 }); }
  for (let x = 1; x < W; x += 2) { if (rnd() < 0.7 && !(x > 95 && x < 101)) trees.push({ kind: 'reed', x: x + rnd(), z: 16.5 + rnd(), s: 1.1 }); }
  // 田间零星树
  for (const [x, z] of [[10.5, 30.5], [60.5, 28.5], [14.5, 58.5], [58.5, 58.5], [52.5, 38.5], [8.5, 44.5]]) { trees.push({ kind: 'camphor', x, z, s: 1.9 }); set(x | 0, z | 0, null, null, 0); }
  // 田边草坡（西侧，远处）
  for (let i = 0; i < 40; i++) { const x = rnd() * 3 | 0, z = 23 + rnd() * 40 | 0; }
  noiseH(0, 23, 2, 64, 0.1);

  // 所有水面地块：深水不可走（河）
  for (let i = 0; i < W * D; i++) if (water[i] > -90 && water[i] - h[i] > 0.45) walk[i] = 0;

  // 命名位置
  const spots = {
    innDoor: [81.5, 56], innRoom: [82, 52], yamenGate: [99, 44], yamenHall: [99, 36.3], yamenInside: [99, 37.3],
    westGate: [70, 45], villageCenter: [33.5, 44.5], fengHome: [34.5, 48.5], dikeTop: [34, 19.5], sluice: [45.5, 23.5], sluiceTop: [41, 19.5],
    pier: [98.5, 16.5], pierEnd: [98.5, 8], temple: [19, 99.5], templeSteps: [19, 104], hillPath: [31.5, 66], fieldsWest: [15, 40], fieldsEast: [56, 40],
    roadMid: [58, 44.5], villageNorth: [34, 36], mulberry: [98, 88], breach: [45.5, 21],
  };
  const zoneNames = { 0: '淳安郊野', 2: '新安江堤', 3: '闸口', 4: '堤下稻田', 5: '冯家村', 6: '淳安县城', 7: '渡口', 8: '后山', 9: '桑田' };

  return { W, D, kind, h, walk, water, zone, buildings, trees, props, lights, spots, zoneNames, idx, inb };
}
