// 键盘 / 鼠标 / 触控输入。
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false, rightClicked: false };
    this.touchStick = null; // {dx, dz} -1..1
    this.enabled = true;
    window.addEventListener('keydown', e => { if (e.repeat) return; const k = norm(e); this.keys.add(k); this.pressed.add(k); if (['space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) && !isTyping()) e.preventDefault(); });
    window.addEventListener('keyup', e => { this.keys.delete(norm(e)); });
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('pointerdown', e => { if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; } if (e.button === 2) this.mouse.rightClicked = true; this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    window.addEventListener('pointerup', () => { this.mouse.down = false; });
    canvas.addEventListener('pointermove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { this.wheel = (this.wheel || 0) + Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }
  down(k) { return this.keys.has(k); }
  // 本帧刚按下（读取后清除）
  hit(k) { if (this.pressed.has(k)) { this.pressed.delete(k); return true; } return false; }
  axis() {
    let dx = 0, dz = 0;
    if (this.down('a') || this.down('arrowleft')) dx -= 1; if (this.down('d') || this.down('arrowright')) dx += 1;
    if (this.down('w') || this.down('arrowup')) dz -= 1; if (this.down('s') || this.down('arrowdown')) dz += 1;
    if (this.touchStick) { dx += this.touchStick.dx; dz += this.touchStick.dz; }
    const l = Math.hypot(dx, dz); if (l > 1) { dx /= l; dz /= l; }
    return { dx, dz, run: this.down('shift') };
  }
  endFrame() { this.pressed.clear(); this.mouse.clicked = false; this.mouse.rightClicked = false; this.wheelDelta = this.wheel || 0; this.wheel = 0; }
}
function norm(e) { const k = e.key.toLowerCase(); if (k === ' ') return 'space'; return k; }
function isTyping() { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); }
