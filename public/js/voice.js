// Browser voice layer: mic -> 16 kHz PCM frames -> /ws/stt, and /ws/tts -> speaker.
// Streaming end to end, with barge-in (speaking over the agent stops it) and echo-safe gating.

const WORKLET = `
class P extends AudioWorkletProcessor {
  constructor(){ super(); this.r = sampleRate/16000; this.t = 0; this.acc = 0; this.cnt = 0; this.buf = new Int16Array(512); this.n = 0; this.ss = 0; }
  process(inputs){
    const ch = inputs[0] && inputs[0][0]; if(!ch) return true;
    for (let i=0;i<ch.length;i++){
      this.acc += ch[i]; this.cnt++; this.t += 1;
      if (this.t >= this.r){
        const v = Math.max(-1, Math.min(1, this.acc/this.cnt)); this.acc = 0; this.cnt = 0; this.t -= this.r;
        this.buf[this.n++] = v*32767; this.ss += v*v;
        if (this.n === 512){ this.port.postMessage({pcm:this.buf.buffer, rms:Math.sqrt(this.ss/512)}, [this.buf.buffer]); this.buf = new Int16Array(512); this.n = 0; this.ss = 0; }
      }
    }
    return true;
  }
}
registerProcessor('pcm16', P);`;

const b64ToBytes = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

export class Voice {
  constructor({ keyterms = () => [], lang = () => 'hi' } = {}) {
    this.keyterms = keyterms; this.lang = lang;
    this.h = {}; this.state = 'idle';
    this.ctx = null; this.stream = null; this.node = null; this.stt = null; this.tts = null;
    this.wantListen = false; this.segs = new Map(); this.ring = []; this.floor = 0.01; this.loud = 0;
    this.speaking = null; this.nextT = 0; this.sources = new Set(); this.endSpeechAt = 0; this.sensitivity = 1;
    this.base = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  }
  on(evt, fn) { this.h[evt] = fn; return this; }
  emit(evt, data) { try { this.h[evt] && this.h[evt](data); } catch (e) { console.error(e); } }
  setState(s) { if (this.state !== s) { this.state = s; this.emit('state', s); } }

  async ensureAudio() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  // ---------- listening ----------
  async start() {
    await this.ensureAudio();
    this.wantListen = true;
    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
      await this.ctx.audioWorklet.addModule(url);
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, 'pcm16', { numberOfOutputs: 1, outputChannelCount: [1] });
      this.node.port.onmessage = (e) => this.onFrame(e.data);
      const mute = this.ctx.createGain(); mute.gain.value = 0;
      src.connect(this.node); this.node.connect(mute); mute.connect(this.ctx.destination);
    }
    this.openStt();
    this.wake(true);
    if (this.state !== 'speaking') this.setState('listening');
  }
  stop() {
    this.wantListen = false;
    this.interrupt();
    try { this.stt && this.stt.close(); } catch { /* ignore */ }
    this.stt = null;
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    try { this.node && this.node.disconnect(); } catch { /* ignore */ }
    this.node = null; this.wake(false); this.setState('idle');
  }
  async wake(on) {
    try { if (on) this.lock = await navigator.wakeLock?.request('screen'); else { await this.lock?.release(); this.lock = null; } } catch { /* optional */ }
  }

  openStt() {
    if (this.stt && this.stt.readyState <= 1) return;
    const q = new URLSearchParams({ lang: 'indic-auto', keyterms: JSON.stringify(this.keyterms()) });
    const ws = new WebSocket(`${this.base}/ws/stt?${q}`);
    ws.binaryType = 'arraybuffer';
    ws.onmessage = (m) => { try { this.onStt(JSON.parse(m.data)); } catch { /* ignore */ } };
    ws.onclose = () => { if (this.stt === ws) { this.stt = null; if (this.wantListen) setTimeout(() => this.wantListen && this.openStt(), 400); } };
    ws.onerror = () => this.emit('error', 'stt');
    this.stt = ws;
  }

  onFrame({ pcm, rms }) {
    this.emit('level', rms);
    this.ring.push(pcm); if (this.ring.length > 16) this.ring.shift();
    if (this.state === 'speaking') {
      // echo-safe: send silence while the agent talks; detect a real interruption locally
      const thr = Math.max(0.05, this.floor * 4) / this.sensitivity;
      this.loud = rms > thr ? this.loud + 1 : 0;
      if (this.loud >= 8) { this.interrupt(); this.emit('barge'); this.ring.forEach((b) => this.sendPcm(b)); this.ring = []; return; }
      this.sendPcm(new ArrayBuffer(1024));
      return;
    }
    if (rms < 0.04) this.floor = this.floor * 0.97 + rms * 0.03;
    this.sendPcm(pcm);
  }
  sendPcm(buf) { if (this.stt && this.stt.readyState === 1) this.stt.send(buf); }

  onStt(j) {
    if (j.type === 'error') { this.emit('error', j.message); return; }
    if (j.type === 'speech_start' && j.s === 'w') this.emit('speechstart');
    if (j.type === 'processing' && j.s === 'w') { this.endSpeechAt = performance.now(); this.setState('thinking'); }
    if (j.type !== 'transcript') return;
    const idx = j.segment_index;
    const seg = this.segs.get(idx) || { at: performance.now() };
    seg[j.s] = j.text || '';
    this.segs.set(idx, seg);
    if (j.s === 'w' && seg.d == null) seg.timer = setTimeout(() => this.finishSeg(idx), 380); // wait briefly for the digits stream
    if (seg.w != null && seg.d != null) this.finishSeg(idx);
  }
  finishSeg(idx) {
    const seg = this.segs.get(idx); if (!seg || seg.done) return;
    seg.done = true; clearTimeout(seg.timer);
    setTimeout(() => this.segs.delete(idx), 5000);
    if (!(seg.w || '').trim() && !(seg.d || '').trim()) { if (this.state === 'thinking') this.setState('listening'); return; }
    this.emit('heard', { w: seg.w || '', d: seg.d || '', endSpeechAt: this.endSpeechAt, sttMs: this.endSpeechAt ? performance.now() - this.endSpeechAt : 0 });
  }

  // ---------- speaking ----------
  openTts() {
    if (this.tts && this.tts.readyState <= 1) return this.tts;
    const ws = new WebSocket(`${this.base}/ws/tts`);
    ws.onmessage = (m) => { try { this.onTts(JSON.parse(m.data)); } catch { /* ignore */ } };
    ws.onclose = () => { if (this.tts === ws) this.tts = null; };
    ws.onerror = () => { if (this.speaking) this.fallbackSpeak(); };
    this.tts = ws; return ws;
  }
  warm() { try { this.openTts(); } catch { /* ignore */ } }

  /** Speak text. Resolves 'done' or 'interrupted'. */
  async speak(text, langCode = 'auto', t0 = 0) {
    await this.ensureAudio();
    this.interrupt(true);
    this.setState('speaking'); this.loud = 0;
    return new Promise((resolve) => {
      const sp = { resolve, text, t0: t0 || performance.now(), first: false, complete: false, carry: null, timer: null };
      this.speaking = sp; this.nextT = this.ctx.currentTime + 0.03;
      const payload = JSON.stringify({ text, language: langCode });
      const ws = this.openTts();
      if (ws.readyState === 1) ws.send(payload); else ws.addEventListener('open', () => ws.send(payload), { once: true });
      sp.timer = setTimeout(() => { if (this.speaking === sp && !sp.first) this.fallbackSpeak(); }, 4500);
      setTimeout(() => { if (this.speaking === sp) { sp.complete = true; this.sources.forEach((x) => { try { x.stop(); } catch { /* ignore */ } }); this.sources.clear(); this.maybeEnd(sp); } }, 30000);
    });
  }
  onTts(j) {
    const sp = this.speaking; if (!sp) return;
    if (j.type === 'error') { this.fallbackSpeak(); return; }
    if (j.type === 'start') { sp.started = true; return; }
    if (!sp.started) return; // stale message from the previous reply
    if (j.type === 'audio' && j.data?.audio) {
      let bytes = b64ToBytes(j.data.audio);
      if (sp.carry) { const m = new Uint8Array(sp.carry.length + bytes.length); m.set(sp.carry); m.set(bytes, sp.carry.length); bytes = m; sp.carry = null; }
      if (bytes.length % 2) { sp.carry = bytes.slice(bytes.length - 1); bytes = bytes.slice(0, bytes.length - 1); }
      const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
      // some responses start with a 44-byte WAV header; skip it if present
      let off = 0; if (!sp.first && bytes.length > 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46) off = 22;
      const f = new Float32Array(pcm.length - off);
      for (let i = 0; i < f.length; i++) f[i] = pcm[i + off] / 32768;
      if (!f.length) return;
      const buf = this.ctx.createBuffer(1, f.length, 24000); buf.copyToChannel(f, 0);
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.connect(this.ctx.destination);
      const at = Math.max(this.ctx.currentTime + 0.01, this.nextT); src.start(at); this.nextT = at + buf.duration;
      this.sources.add(src); src.onended = () => { this.sources.delete(src); this.maybeEnd(sp); };
      if (!sp.first) { sp.first = true; clearTimeout(sp.timer); this.emit('ttfa', Math.round(performance.now() - sp.t0)); }
      clearTimeout(sp.dog); sp.dog = setTimeout(() => { if (this.speaking === sp) { sp.complete = true; this.maybeEnd(sp); } }, 2500);
    }
    if (j.data?.is_final === true) { sp.complete = true; this.maybeEnd(sp); }
  }
  maybeEnd(sp) {
    if (this.speaking !== sp || !sp.complete || this.sources.size) return;
    clearTimeout(sp.dog); this.speaking = null; sp.resolve('done');
    this.setState(this.wantListen ? 'listening' : 'idle');
  }
  interrupt(silent = false) {
    const sp = this.speaking;
    this.sources.forEach((s) => { try { s.onended = null; s.stop(); } catch { /* ignore */ } });
    this.sources.clear();
    window.speechSynthesis && speechSynthesis.cancel();
    if (sp) {
      clearTimeout(sp.timer); clearTimeout(sp.dog); this.speaking = null;
      try { this.tts && this.tts.readyState === 1 && this.tts.send(JSON.stringify({ type: 'cancel' })); } catch { /* ignore */ }
      sp.resolve('interrupted');
      if (!silent) this.setState(this.wantListen ? 'listening' : 'idle');
    }
  }
  /** Last resort when Gnani TTS is unreachable: the phone's own voice. */
  fallbackSpeak() {
    const sp = this.speaking; if (!sp || !window.speechSynthesis) { if (sp) { this.speaking = null; sp.resolve('error'); this.setState('listening'); } return; }
    clearTimeout(sp.timer);
    const u = new SpeechSynthesisUtterance(sp.text); u.lang = { hi: 'hi-IN', ta: 'ta-IN', kn: 'kn-IN', en: 'en-IN' }[this.lang()] || 'hi-IN';
    u.onend = () => { if (this.speaking === sp) { this.speaking = null; sp.resolve('done'); this.setState(this.wantListen ? 'listening' : 'idle'); } };
    speechSynthesis.speak(u);
  }
}
