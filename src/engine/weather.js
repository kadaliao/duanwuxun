// 雨、闪电、雾气。雨是跟随相机的粒子盒。
import * as THREE from 'three';

export class Weather {
  constructor(scene, renderer) {
    this.scene = scene; this.r = renderer;
    this.intensity = 0; // 0..1
    this.wind = 0.3;
    const N = 5000; this.N = N;
    const pos = new Float32Array(N * 3), seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = Math.random() * 60 - 30; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = Math.random() * 60 - 30; seeds[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    this.uniforms = { uTime: { value: 0 }, uAlpha: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uWind: { value: 0.3 }, uCount: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float seed; uniform float uTime, uWind, uCount; uniform vec3 uCenter; varying float vA;
        void main(){ vA = step(seed, uCount);
          float fall = mod(uTime*(14.0+seed*6.0) + seed*100.0, 30.0);
          vec3 p = position; p.y = 30.0 - fall; p.x += uWind*fall*0.35 + uCenter.x; p.z += uCenter.z; p.x = mod(p.x - uCenter.x + 30.0, 60.0) - 30.0 + uCenter.x;
          vec4 mv = modelViewMatrix * vec4(p,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 2.0 + seed*2.0; }`,
      fragmentShader: `uniform float uAlpha; varying float vA; void main(){ vec2 c = gl_PointCoord-0.5; if(abs(c.x)>0.18) discard; gl_FragColor = vec4(0.75,0.82,0.95, uAlpha*vA*0.55); }`,
    });
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; this.points.visible = false; scene.add(this.points);
    this.lightningTimer = 0; this.thunderCb = null; this.stormy = false;
  }
  set(intensity, stormy = false) { this.intensity = intensity; this.stormy = stormy; }
  update(dt, t, center) {
    this.uniforms.uTime.value = t; this.uniforms.uCenter.value.copy(center);
    this.uniforms.uAlpha.value += (this.intensity > 0 ? 1 : 0 - this.uniforms.uAlpha.value) * Math.min(1, dt);
    this.uniforms.uAlpha.value = THREE.MathUtils.clamp(this.uniforms.uAlpha.value, 0, 1);
    this.uniforms.uCount.value = this.intensity;
    this.uniforms.uWind.value = this.wind + (this.stormy ? Math.sin(t * 0.7) * 0.6 : 0);
    this.points.visible = this.uniforms.uAlpha.value > 0.01;
    if (this.stormy) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) { this.lightningTimer = 4 + Math.random() * 9; this.r.flash(0.8); if (this.thunderCb) this.thunderCb(0.6 + Math.random() * 1.6); }
    }
  }
}
