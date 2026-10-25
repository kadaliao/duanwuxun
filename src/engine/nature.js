// 树（公告板实例）、秧苗（实例）、芦苇。
import * as THREE from 'three';
import { makeTreeSprite, rnd } from './textures.js';

export class Nature {
  constructor(world, trees) {
    this.world = world; this.group = new THREE.Group();
    this.kinds = {}; this.meshes = [];
    const byKind = {};
    for (const t of trees) (byKind[t.kind] ||= []).push(t);
    for (const kind in byKind) this.buildKind(kind, byKind[kind]);
    this.buildRice();
  }
  buildKind(kind, list) {
    const tex = makeTreeSprite(kind);
    const geo = new THREE.PlaneGeometry(1, 1.333); geo.translate(0, 0.666, 0);
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    // 风摆：顶部顶点随时间左右摆
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.timeUniform; sh.uniforms.uWind = this.windUniform;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n float sway = sin(uTime*1.7 + instanceMatrix[3][0]*0.9 + instanceMatrix[3][2]*0.7) * uWind * position.y * 0.12; transformed.x += sway;');
    };
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.castShadow = true; mesh.receiveShadow = false;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    list.forEach((t, i) => { const y = this.world.groundAt(t.x, t.z); p.set(t.x, y - 0.05, t.z); s.set(t.s, t.s, t.s); m.compose(p, q, s); mesh.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.list = list; mesh.name = 'trees_' + kind;
    this.meshes.push(mesh); this.group.add(mesh);
  }
  get timeUniform() { return this._t ||= { value: 0 }; }
  get windUniform() { return this._w ||= { value: 0.3 }; }
  // 让所有公告板面向相机（绕 Y 轴 + 俯仰）
  faceCamera(camQuat) {
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion();
    for (const mesh of this.meshes) {
      const list = mesh.userData.list;
      for (let i = 0; i < list.length; i++) { mesh.getMatrixAt(i, m); m.decompose(p, q, s); m.compose(p, camQuat, s); mesh.setMatrixAt(i, m); }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  buildRice() {
    // 稻田秧苗：每块田格 2 丛，用小十字面片
    const m = this.world.map; const pts = [];
    for (let z = 0; z < m.D; z++) for (let x = 0; x < m.W; x++) { if (m.kind[m.idx(x, z)] !== 1 /* field */) continue; for (let k = 0; k < 2; k++) pts.push([x + 0.2 + rnd() * 0.6, z + 0.2 + rnd() * 0.6]); }
    const geo = new THREE.PlaneGeometry(0.28, 0.4); geo.translate(0, 0.2, 0);
    const c = document.createElement('canvas'); c.width = 8; c.height = 12; const ctx = c.getContext('2d');
    ctx.fillStyle = '#6ab040'; ctx.fillRect(3, 2, 2, 10); ctx.fillStyle = '#8ad050'; ctx.fillRect(1, 4, 2, 6); ctx.fillRect(5, 3, 2, 7); ctx.fillStyle = '#5a9a30'; ctx.fillRect(2, 8, 4, 4);
    const tex = new THREE.CanvasTexture(c); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.timeUniform; sh.uniforms.uWind = this.windUniform;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(uTime*2.0 + instanceMatrix[3][0]*2.1 + instanceMatrix[3][2]*1.3) * uWind * position.y * 0.5;');
    };
    const mesh = new THREE.InstancedMesh(geo, mat, pts.length); mesh.castShadow = false; mesh.receiveShadow = true;
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    pts.forEach((pt, i) => { p.set(pt[0], this.world.groundAt(pt[0], pt[1]) + 0.02, pt[1]); mm.compose(p, q, s); mesh.setMatrixAt(i, mm); });
    mesh.instanceMatrix.needsUpdate = true; mesh.name = 'rice'; mesh.userData.list = pts;
    this.rice = mesh; this.meshes.push(mesh); this.group.add(mesh);
  }
  update(t, wind) { this.timeUniform.value = t; this.windUniform.value = wind; }
}
