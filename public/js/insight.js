// "Behind the app": a live, human-readable view of what the voice pipeline is doing, shown beside the phone on desktop.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STEPS = [
  ['Listen', 'Mic · 16 kHz PCM'], ['Hear', 'Gnani Prisma v3.0'], ['Understand', 'Rules · numbers · names'], ['Update ledger', 'On device · AES-GCM'], ['Speak', 'Gnani Timbre v3.0'],
];
export class Insight {
  constructor(root) {
    this.root = root; this.timers = [];
    root.innerHTML = `<div class="ih"><i></i>BEHIND THE APP</div>
      <div class="shopcard"><div class="av" id="i-av">K</div><div><b id="i-shop">Voice Khata</b><small id="i-sub">Sign in to begin</small></div><span class="mode">STREAMING</span></div>
      <ol class="steps">${STEPS.map(([t, s], i) => `<li class="step" data-i="${i}"><div class="row1"><span class="n"><span>${i + 1}</span></span><span class="t">${t}</span><span class="svc">${s}</span></div><div class="body"></div></li>`).join('')}</ol>
      <div class="blk"><div class="lb">HEARD</div><p id="i-heard">—</p></div>
      <div class="blk"><div class="lb">KHATA REPLIED</div><p id="i-said">—</p></div>
      <div class="metrics"><div class="metric"><b id="m-stt">—</b><small>speech → text (ms)</small></div><div class="metric"><b id="m-tts">—</b><small>stop talking → first audio (ms)</small></div></div>
      <div class="trust"><span>AI disclosed first</span><span>Encrypted on device</span><span>Opt-in reminders</span><span>No recordings kept</span><span>Key stays on server</span></div>
      <div class="try"><div class="lb">TRY SAYING</div><div class="tl" id="i-try"></div></div>
      <div class="foot">Live: the app inside the phone is the real Voice Khata, streaming to Gnani Vachana through the server on this page.</div>`;
    this.steps = [...root.querySelectorAll('.step')];
    this.body = (i) => this.steps[i].querySelector('.body');
    this.body(0).innerHTML = `<div class="mbars">${'<i></i>'.repeat(28)}</div>`; this.bars = [...this.body(0).querySelectorAll('i')];
    this.steps[0].classList.add('has');
  }
  setShop(name, sub) { this.root.querySelector('#i-shop').textContent = name; this.root.querySelector('#i-sub').textContent = sub; this.root.querySelector('#i-av').textContent = (name || 'K')[0].toUpperCase(); }
  mark(i, cls) { this.steps.forEach((s, k) => { s.classList.toggle('active', cls === 'active' && k === i); if (k < i) s.classList.add('done'); if (k >= i) s.classList.remove('done'); }); }
  state(s) {
    this.root.dataset.s = s;
    if (s === 'listening') { this.clear(); this.reset(); this.mark(0, 'active'); }
    if (s === 'thinking') { this.mark(1, 'active'); }
    if (s === 'idle') { this.steps.forEach((x) => x.classList.remove('active')); }
  }
  level(r) { const v = Math.min(1, r * 10); this.bars.forEach((b, i) => { b.style.height = `${3 + v * 15 * Math.abs(Math.sin(i * .9 + performance.now() / 120))}px`; }); }
  reset() { for (let i = 1; i < 5; i++) { this.steps[i].classList.remove('has', 'done', 'active'); this.body(i).innerHTML = ''; } }
  clear() { this.timers.forEach(clearTimeout); this.timers = []; }
  at(ms, fn) { this.timers.push(setTimeout(fn, ms)); }
  /** One finished turn, replayed as a short cascade so the pipeline reads left-to-right. */
  turn({ w, d, sttMs, chips, note, ledger, say }) {
    this.clear();
    this.root.querySelector('#i-heard').textContent = w || d || '—';
    if (sttMs) this.root.querySelector('#m-stt').textContent = Math.round(sttMs);
    this.mark(1, 'active'); this.steps[1].classList.add('has');
    this.body(1).innerHTML = `<div><b>words</b> ${esc(w) || '—'}</div><div><b>digits</b> ${esc(d) || '—'}</div>`;
    this.at(220, () => { this.mark(2, 'active'); this.steps[2].classList.add('has'); this.body(2).innerHTML = `<div class="chips2">${chips.map((c) => `<span class="${c.flag ? 'flag' : ''}"><b>${esc(c.k)}</b>${esc(c.v)}</span>`).join('')}</div>${note ? `<div style="margin-top:8px">${esc(note)}</div>` : ''}`; });
    this.at(460, () => { this.mark(3, 'active'); this.steps[3].classList.add('has'); this.body(3).textContent = ledger; });
    this.at(700, () => { this.mark(4, 'active'); this.steps[4].classList.add('has'); this.body(4).textContent = say; this.root.querySelector('#i-said').textContent = say; });
  }
  spoken(ms) { this.root.querySelector('#m-tts').textContent = ms; this.steps[4].classList.remove('active'); this.steps[4].classList.add('done'); }
  examples(list, pick) {
    const el = this.root.querySelector('#i-try'); el.innerHTML = list.map((t, i) => `<button data-i="${i}">${esc(t)}</button>`).join('');
    el.onclick = (e) => { const b = e.target.closest('button'); if (b) pick(list[+b.dataset.i]); };
  }
}
