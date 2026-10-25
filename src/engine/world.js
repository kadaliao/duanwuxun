// 地形网格 → 网格体；水面（含洪水）网格体；高度采样；可走性。
import * as THREE from 'three';
import { makeTerrainAtlas, makeWaterTex } from './textures.js';

export class World {
  constructor(map) {
    this.map = map;
    this.W = map.W; this.D = map.D;
    this.group = new THREE.Group();
    this.floodLevel = new Float32Array(map.water); // 当前每格水面高度（-99 无水）
    this.buildTerrain();
    this.buildWater();
  }

  // 角点高度：四个相邻地块的均值
  cornerH(cx, cz) {
    const m = this.map; let s = 0, n = 0;
    for (let dz = -1; dz <= 0; dz++) for (let dx = -1; dx <= 0; dx++) { const x = cx + dx, z = cz + dz; if (m.inb(x, z)) { s += m.h[m.idx(x, z)]; n++; } }
    return n ? s / n : 0;
  }
  // 任意点地面高度（双线性）
  groundAt(x, z) {
    const m = this.map; const xi = Math.floor(x), zi = Math.floor(z);
    if (!m.inb(xi, zi)) return 0;
    const fx = x - xi, fz = z - zi;
    const h00 = this.cornerH(xi, zi), h10 = this.cornerH(xi + 1, zi), h01 = this.cornerH(xi, zi + 1), h11 = this.cornerH(xi + 1, zi + 1);
    return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;
  }
  waterAt(x, z) { const m = this.map; const xi = x | 0, zi = z | 0; if (!m.inb(xi, zi)) return -99; return this.floodLevel[m.idx(xi, zi)]; }
  depthAt(x, z) { const w = this.waterAt(x, z); if (w < -90) return 0; return Math.max(0, w - this.groundAt(x, z)); }
  walkable(x, z) {
    const m = this.map; const xi = x | 0, zi = z | 0; if (!m.inb(xi, zi)) return false;
    if (!m.walk[m.idx(xi, zi)]) return false;
    const w = this.floodLevel[m.idx(xi, zi)]; if (w > -90 && w - m.h[m.idx(xi, zi)] > 0.75) return false;
    return true;
  }
  kindAt(x, z) { const m = this.map; return m.kind[m.idx(x | 0, z | 0)]; }
  zoneAt(x, z) { const m = this.map; const xi = x | 0, zi = z | 0; if (!m.inb(xi, zi)) return 0; return m.zone[m.idx(xi, zi)]; }

  buildTerrain() {
    const m = this.map, W = m.W, D = m.D;
    const atlas = makeTerrainAtlas();
    const n = W * D;
    const pos = new Float32Array(n * 4 * 3), uv = new Float32Array(n * 4 * 2), nor = new Float32Array(n * 4 * 3), col = new Float32Array(n * 4 * 3);
    const index = new Uint32Array(n * 6);
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpN = new THREE.Vector3();
    let v = 0, ii = 0;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const i = m.idx(x, z); const k = m.kind[i];
      const h00 = this.cornerH(x, z), h10 = this.cornerH(x + 1, z), h01 = this.cornerH(x, z + 1), h11 = this.cornerH(x + 1, z + 1);
      const corners = [[x, h00, z], [x + 1, h10, z], [x, h01, z + 1], [x + 1, h11, z + 1]];
      const u0 = k / atlas.n + 0.002, u1 = (k + 1) / atlas.n - 0.002;
      const uvs = [[u0, 1], [u1, 1], [u0, 0], [u1, 0]];
      // 法线：两条对角线叉积
      tmpA.set(1, h11 - h00, 1); tmpB.set(-1, h01 - h10, 1); tmpN.crossVectors(tmpB, tmpA).normalize(); if (tmpN.y < 0) tmpN.negate();
      // 轻微色差，打破重复
      const shade = 0.92 + ((x * 7 + z * 13) % 5) * 0.03;
      for (let c = 0; c < 4; c++) {
        pos[(v + c) * 3] = corners[c][0]; pos[(v + c) * 3 + 1] = corners[c][1]; pos[(v + c) * 3 + 2] = corners[c][2];
        uv[(v + c) * 2] = uvs[c][0]; uv[(v + c) * 2 + 1] = uvs[c][1];
        nor[(v + c) * 3] = tmpN.x; nor[(v + c) * 3 + 1] = tmpN.y; nor[(v + c) * 3 + 2] = tmpN.z;
        col[(v + c) * 3] = shade; col[(v + c) * 3 + 1] = shade; col[(v + c) * 3 + 2] = shade;
      }
      index[ii++] = v; index[ii++] = v + 2; index[ii++] = v + 1; index[ii++] = v + 1; index[ii++] = v + 2; index[ii++] = v + 3;
      v += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    const mat = new THREE.MeshStandardMaterial({ map: atlas.tex, vertexColors: true, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true; mesh.castShadow = false;
    mesh.name = 'terrain';
    this.terrain = mesh; this.group.add(mesh);
  }

  buildWater() {
    const m = this.map, W = m.W, D = m.D, n = W * D;
    const pos = new Float32Array(n * 4 * 3), uv = new Float32Array(n * 4 * 2), depth = new Float32Array(n * 4);
    const index = new Uint32Array(n * 6);
    let v = 0, ii = 0;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const corners = [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]];
      for (let c = 0; c < 4; c++) { pos[(v + c) * 3] = corners[c][0]; pos[(v + c) * 3 + 1] = -99; pos[(v + c) * 3 + 2] = corners[c][1]; uv[(v + c) * 2] = corners[c][0] / 8; uv[(v + c) * 2 + 1] = corners[c][1] / 8; }
      index[ii++] = v; index[ii++] = v + 2; index[ii++] = v + 1; index[ii++] = v + 1; index[ii++] = v + 2; index[ii++] = v + 3;
      v += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    this.waterTex = makeWaterTex();
    const uniforms = {
      uTime: { value: 0 }, uMap: { value: this.waterTex },
      uColorShallow: { value: new THREE.Color(0x6fa3b0) }, uColorDeep: { value: new THREE.Color(0x24445c) },
      uLight: { value: 1.0 }, uFlood: { value: 0 }, uFog: { value: new THREE.Color(0x000000) }, uFogNear: { value: 10 }, uFogFar: { value: 100 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: `
        attribute float depth; varying float vDepth; varying vec2 vUv; varying float vFogDepth; uniform float uTime;
        void main(){ vDepth = depth; vUv = uv; vec3 p = position; p.y += sin(uTime*1.5 + p.x*1.3 + p.z*0.7)*0.02*min(depth,1.0);
          vec4 mv = modelViewMatrix * vec4(p,1.0); vFogDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        varying float vDepth; varying vec2 vUv; varying float vFogDepth; uniform float uTime; uniform sampler2D uMap; uniform vec3 uColorShallow, uColorDeep; uniform float uLight, uFlood; uniform vec3 uFog; uniform float uFogNear, uFogFar;
        void main(){
          vec2 uv1 = vUv + vec2(uTime*0.02, uTime*0.013); vec2 uv2 = vUv*1.7 - vec2(uTime*0.015, -uTime*0.02);
          float t = texture2D(uMap, uv1).r*0.6 + texture2D(uMap, uv2).r*0.4; // 0..1 线性噪声
          float d = clamp(vDepth, 0.0, 1.2);
          vec3 col = mix(uColorShallow, uColorDeep, smoothstep(0.0, 0.9, d));
          col = mix(col, vec3(0.30, 0.24, 0.15), uFlood*0.7); // 洪水是浑的
          col *= 0.8 + t*0.5;
          float foam = smoothstep(0.9, 1.0, t) * (1.0-smoothstep(0.0,0.3,d)) * (1.0 - uFlood*0.6);
          col += foam*0.4;
          float a = mix(0.45, 0.93, smoothstep(0.0, 0.5, d));
          col *= uLight;
          float f = smoothstep(uFogNear, uFogFar, vFogDepth); col = mix(col, uFog, f);
          gl_FragColor = vec4(max(col, vec3(0.0)), a);
        }`,
    });
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'water'; mesh.renderOrder = 2; mesh.frustumCulled = false;
    this.water = mesh; this.waterUniforms = uniforms; this.group.add(mesh);
    this.refreshWater();
  }

  // 根据 floodLevel 更新水面顶点
  refreshWater() {
    const m = this.map, W = m.W, D = m.D; const pos = this.water.geometry.attributes.position, dep = this.water.geometry.attributes.depth;
    let v = 0;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const i = m.idx(x, z); const lvl = this.floodLevel[i];
      if (lvl < -90) { for (let c = 0; c < 4; c++) { pos.array[(v + c) * 3 + 1] = -99; dep.array[v + c] = 0; } }
      else {
        // 角点：取周围有水格的最大水位，这样水面连续
        const corners = [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]];
        for (let c = 0; c < 4; c++) {
          const cx = corners[c][0], cz = corners[c][1]; let lv = lvl;
          for (let dz = -1; dz <= 0; dz++) for (let dx = -1; dx <= 0; dx++) { const xx = cx + dx, zz = cz + dz; if (m.inb(xx, zz)) { const l2 = this.floodLevel[m.idx(xx, zz)]; if (l2 > lv) lv = l2; } }
          pos.array[(v + c) * 3 + 1] = lv; dep.array[v + c] = Math.max(0, lv - this.cornerH(cx, cz));
        }
      }
      v += 4;
    }
    pos.needsUpdate = true; dep.needsUpdate = true;
  }
  update(t) { this.waterUniforms.uTime.value = t; }
}
