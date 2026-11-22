// "Behind the app": a live, human-readable view of what the voice pipeline is doing, shown beside the phone on desktop.
// Fully localized (Hindi / English): setLang() rebuilds the labels.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const D = {
  en: { head: 'BEHIND THE APP', mode: 'STREAMING', steps: [['Listen', 'Mic · 16 kHz PCM'], ['Hear', 'Gnani Prisma v3.0'], ['Understand', 'Rules · numbers · names'], ['Update ledger', 'On device · AES-GCM'], ['Speak', 'Gnani Timbre v3.0']],
    heard: 'HEARD', said: 'KHATA REPLIED', m1: 'speech → text (ms)', m2: 'stop talking → first audio (ms)', words: 'words', digits: 'digits', sign: 'Sign in to begin',
    trust: ['AI disclosed first', 'Encrypted on device', 'Opt-in reminders', 'No recordings kept', 'Key stays on server'], tryT: 'TRY SAYING',
    foot: 'Live: the app inside the phone is the real Voice Khata, streaming to Gnani Vachana through the server on this page.' },
  hi: { head: 'पर्दे के पीछे', mode: 'स्ट्रीमिंग', steps: [['सुनना', 'माइक · 16 kHz PCM'], ['सुना', 'Gnani Prisma v3.0'], ['समझा', 'नियम · संख्या · नाम'], ['खाता अपडेट', 'फ़ोन में · AES-GCM'], ['बोलना', 'Gnani Timbre v3.0']],
    heard: 'सुना', said: 'खाता ने कहा', m1: 'आवाज़ → टेक्स्ट (ms)', m2: 'बोलना रुकने → पहली आवाज़ (ms)', words: 'शब्द', digits: 'अंक', sign: 'शुरू करने के लिए साइन इन करें',
    trust: ['पहले बताता है कि एआई है', 'फ़ोन में एन्क्रिप्टेड', 'रिमाइंडर सिर्फ़ सहमति से', 'कोई रिकॉर्डिंग नहीं', 'की सर्वर पर सुरक्षित'], tryT: 'ये बोलकर देखिए',
    foot: 'लाइव: फ़ोन के अंदर असली वॉइस खाता चल रहा है, जो इसी पेज के सर्वर के ज़रिए Gnani Vachana से जुड़ा है।' },
};
export class Insight {
  constructor(root) { this.root = root; this.timers = []; this.lang = 'en'; this.shop = ['Voice Khata', '']; this.build(); }
  setLang(l) { if (l === this.lang || !D[l]) return; this.lang = l; this.build(); }
  build() {
    const T = D[this.lang], root = this.root;
    root.innerHTML = `<div class="ih"><i></i>${T.head}</div>
      <div class="shopcard"><div class="av" id="i-av">K</div><div><b id="i-shop">Voice Khata</b><small id="i-sub">${T.sign}</small></div><span class="mode">${T.mode}</span></div>
      <ol class="steps">${T.steps.map(([t, s], i) => `<li class="step" data-i="${i}"><div class="row1"><span class="n"><span>${i + 1}</span></span><span class="t">${t}</span><span class="svc">${s}</span></div><div class="body"></div></li>`).join('')}</ol>
      <div class="blk"><div class="lb">${T.heard}</div><p id="i-heard">—</p></div>
      <div class="blk"><div class="lb">${T.said}</div><p id="i-said">—</p></div>
      <div class="metrics"><div class="metric"><b id="m-stt">—</b><small>${T.m1}</small></div><div class="metric"><b id="m-tts">—</b><small>${T.m2}</small></div></div>
      <div class="trust">${T.trust.map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="try"><div class="lb">${T.tryT}</div><div class="tl" id="i-try"></div></div>
      <div class="foot">${T.foot}</div>`;
    this.steps = [...root.querySelectorAll('.step')];
    this.body = (i) => this.steps[i].querySelector('.body');
    this.body(0).innerHTML = `<div class="mbars">${'<i></i>'.repeat(28)}</div>`; this.bars = [...this.body(0).querySelectorAll('i')];
    this.steps[0].classList.add('has');
    if (this.shop[1]) this.setShop(...this.shop);
    if (this.exList) this.examples(this.exList, this.exPick);
  }
  setShop(name, sub) { this.shop = [name, sub]; this.root.querySelector('#i-shop').textContent = name; this.root.querySelector('#i-sub').textContent = sub; this.root.querySelector('#i-av').textContent = (name || 'K')[0].toUpperCase(); }
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
  /** One finished turn, replayed as a short cascade so the pipeline reads top-to-bottom. */
  turn({ w, d, sttMs, chips, note, ledger, say }) {
    const T = D[this.lang]; this.clear();
    this.root.querySelector('#i-heard').textContent = (this.lang === 'hi' && d) || w || d || '—';
    if (sttMs) this.root.querySelector('#m-stt').textContent = Math.round(sttMs);
    this.mark(1, 'active'); this.steps[1].classList.add('has');
    this.body(1).innerHTML = `<div><b>${T.words}</b> ${esc(w) || '—'}</div><div><b>${T.digits}</b> ${esc(d) || '—'}</div>`;
    this.at(220, () => { this.mark(2, 'active'); this.steps[2].classList.add('has'); this.body(2).innerHTML = `<div class="chips2">${chips.map((c) => `<span class="${c.flag ? 'flag' : ''}"><b>${esc(c.k)}</b>${esc(c.v)}</span>`).join('')}</div>${note ? `<div style="margin-top:8px">${esc(note)}</div>` : ''}`; });
    this.at(460, () => { this.mark(3, 'active'); this.steps[3].classList.add('has'); this.body(3).textContent = ledger; });
    this.at(700, () => { this.mark(4, 'active'); this.steps[4].classList.add('has'); this.body(4).textContent = say; this.root.querySelector('#i-said').textContent = say; });
  }
  spoken(ms) { this.root.querySelector('#m-tts').textContent = ms; this.steps[4].classList.remove('active'); this.steps[4].classList.add('done'); }
  /** list = [{label, say}] */
  examples(list, pick) {
    this.exList = list; this.exPick = pick;
    const el = this.root.querySelector('#i-try'); el.innerHTML = list.map((t, i) => `<button data-i="${i}">${esc(t.label)}</button>`).join('');
    el.onclick = (e) => { const b = e.target.closest('button'); if (b) pick(list[+b.dataset.i]); };
  }
}
