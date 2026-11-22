// Monochrome voice sphere: radial spokes + drifting particles. Reacts to mic level (listening),
// pulses while the agent speaks, rotates while thinking. Only animates while a session is active.
export class Viz {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.level = 0; this.state = 'idle'; this.t = 0; this.raf = 0; this.fade = 0;
    this.pts = Array.from({ length: 240 }, () => ({ a: Math.random() * 6.283, r: Math.sqrt(Math.random()), s: .3 + Math.random() }));
  }
  set(state) {
    this.state = state;
    if (state !== 'idle') this.start(); else setTimeout(() => { if (this.state === 'idle') this.stop(); }, 700);
  }
  push(l) { this.level = this.level * .6 + Math.min(1, l * 9) * .4; }
  start() { if (this.raf) return; const loop = () => { this.draw(); this.raf = requestAnimationFrame(loop); }; loop(); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; this.g.clearRect(0, 0, this.c.width, this.c.height); }
  draw() {
    const { g, c, state } = this, W = c.width, cx = W / 2, R = W * .27;
    this.t += .016; const t = this.t;
    const amp = state === 'listening' ? .12 + this.level * 1.1 : state === 'speaking' ? .45 + .3 * Math.sin(t * 7) * Math.sin(t * 2.3) : state === 'thinking' ? .28 : .05;
    this.fade += ((state === 'idle' ? 0 : 1) - this.fade) * .08;
    const ink = getComputedStyle(document.body).color;
    g.clearRect(0, 0, W, W); g.globalAlpha = this.fade; g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round';
    const N = 88;
    for (let i = 0; i < N; i++) {
      const a = i / N * 6.283 + (state === 'thinking' ? t * 1.6 : t * .15);
      const n = Math.abs(Math.sin(i * 1.7 + t * 3.1) * Math.cos(i * .9 - t * 2.2));
      const len = 8 + amp * 62 * (.25 + n);
      g.lineWidth = 3; g.globalAlpha = this.fade * (.45 + n * .55);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cx + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R + len), cx + Math.sin(a) * (R + len)); g.stroke();
    }
    for (const p of this.pts) {
      p.a += p.s * .004 * (state === 'thinking' ? 4 : 1) + amp * .004;
      const r = p.r * R * (.94 + amp * .1 * Math.sin(t * 4 + p.a * 3));
      g.globalAlpha = this.fade * (.25 + p.r * .6); g.beginPath(); g.arc(cx + Math.cos(p.a) * r, cx + Math.sin(p.a) * r, 1.4 + p.s * 1.4, 0, 6.283); g.fill();
    }
    g.globalAlpha = this.fade * .18; g.lineWidth = 1; g.beginPath(); g.arc(cx, cx, R - 4, 0, 6.283); g.stroke();
  }
}
