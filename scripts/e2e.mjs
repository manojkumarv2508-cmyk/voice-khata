// End-to-end accuracy harness. Synthesises shop phrases with Gnani TTS (several voices), optionally buries them in
// street noise + background babble, streams them through OUR proxy to Gnani Prisma v3.0 exactly like the browser does,
// then feeds the transcripts to the agent and checks the resulting ledger. Needs the server running and a valid key.
//   node scripts/e2e.mjs            -> clean + noisy
//   node scripts/e2e.mjs noisy 6    -> only noisy, SNR 6 dB
import fs from 'node:fs';
import WebSocket from 'ws';
import { Ledger, emptyState, seedDemo } from '../public/js/ledger.js';
import { Agent } from '../public/js/agent.js';

const env = Object.fromEntries(fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split('=')));
const BASE = process.env.BASE || 'localhost:3000';
const mode = process.argv[2] || 'both', SNR = Number(process.argv[3] || 8);

const CASES = [
  { say: 'Suresh ka teen sau chaalis rupaye udhaar', tl: 'hi-en', voice: 'Avinash', exp: [{ n: 'Suresh', k: 'credit', a: 340 }] },
  { say: 'Murugan ne paanch sau diya', tl: 'hi-en', voice: 'Shivani', exp: [{ n: 'Murugan', k: 'payment', a: 500 }] },
  { say: 'Geeta Devi ka do sau pachas udhaar', tl: 'hi-en', voice: 'Kalpana', exp: [{ n: 'Geeta Devi', k: 'credit', a: 250 }] },
  { say: 'Ramesh Sharma ka dedh sau udhaar', tl: 'hi-en', voice: 'Arko', exp: [{ n: 'Ramesh Sharma', k: 'credit', a: 150 }] },
  { say: 'Suresh ka teen sau chaalis udhaar, kal do sau diya tha', tl: 'hi-en', voice: 'Avinash', exp: [{ n: 'Suresh', k: 'credit', a: 340 }, { n: 'Suresh', k: 'payment', a: 200 }] },
  { say: 'Murugan ne saade teen sau jama kiye', tl: 'hi-en', voice: 'Devansh', exp: [{ n: 'Murugan', k: 'payment', a: 350 }] },
  { say: 'Geeta Devi ne chaar sau tees diye', tl: 'hi-en', voice: 'Sunaina', exp: [{ n: 'Geeta Devi', k: 'payment', a: 430 }] },
  { say: 'सुरेश का दो हज़ार पाँच सौ उधार', tl: 'hi-IN', voice: 'Chetana', exp: [{ n: 'Suresh', k: 'credit', a: 2500 }] },
  { say: 'मुरुगन का तीन सौ पचास उधार', tl: 'hi-IN', voice: 'Harshad', exp: [{ n: 'Murugan', k: 'credit', a: 350 }] },
  { say: 'Credit of three forty for Suresh', tl: 'en-IN', voice: 'Arko', exp: [{ n: 'Suresh', k: 'credit', a: 340 }] },
  { say: 'முருகன் முந்நூற்று நாற்பது ரூபாய் கடன்', tl: 'ta-IN', voice: 'Kalpana', exp: [{ n: 'Murugan', k: 'credit', a: 340 }] },
  { say: 'சுரேஷ் ஐநூறு ரூபாய் கொடுத்தார்', tl: 'ta-IN', voice: 'Prakash', exp: [{ n: 'Suresh', k: 'payment', a: 500 }] },
  { say: 'Aaj ki bikri pandrah sau', tl: 'hi-en', voice: 'Shubham', exp: [], sale: 1500 },
  { say: 'Murugan ka total kitna hai', tl: 'hi-en', voice: 'Riyaa', exp: [], query: /Murugan/ },
  { say: 'ಸುರೇಶ್ ಮುನ್ನೂರ ನಲವತ್ತು ರೂಪಾಯಿ ಸಾಲ', tl: 'kn-IN', voice: 'Prakash', exp: [{ n: 'Suresh', k: 'credit', a: 340 }] },
  { say: 'ಮುರುಗನ್ ಐನೂರು ರೂಪಾಯಿ ಕೊಟ್ಟರು', tl: 'kn-IN', voice: 'Sunaina', exp: [{ n: 'Murugan', k: 'payment', a: 500 }] },
  { say: 'ಗೀತಾ ದೇವಿ ಇನ್ನೂರ ಐವತ್ತು ಸಾಲ', tl: 'kn-IN', voice: 'Shubham', exp: [{ n: 'Geeta Devi', k: 'credit', a: 250 }] },
  { say: 'ಇವತ್ತಿನ ಮಾರಾಟ ಒಂದು ಸಾವಿರದ ಐನೂರು', tl: 'kn-IN', voice: 'Tarika', exp: [], sale: 1500 },
  { say: 'ಮುರುಗನ್ ಒಟ್ಟು ಎಷ್ಟು ಬಾಕಿ ಇದೆ', tl: 'kn-IN', voice: 'Prakash', exp: [], query: /Murugan/ },
  { say: 'सुरेश का तीन सौ चालीस रुपये उधार', tl: 'hi-IN', voice: 'Avinash', exp: [{ n: 'Suresh', k: 'credit', a: 340 }] },
  { say: 'मुरुगन ने पाँच सौ रुपये दिए', tl: 'hi-IN', voice: 'Shivani', exp: [{ n: 'Murugan', k: 'payment', a: 500 }] },
  { say: 'गीता देवी का ढाई सौ उधार लिख दो', tl: 'hi-IN', voice: 'Kalpana', exp: [{ n: 'Geeta Devi', k: 'credit', a: 250 }] },
  { say: 'सुरेश ने कल दो सौ दिए थे', tl: 'hi-IN', voice: 'Arko', exp: [{ n: 'Suresh', k: 'payment', a: 200 }] },
  { say: 'आज की बिक्री पंद्रह सौ', tl: 'hi-IN', voice: 'Sunaina', exp: [], sale: 1500 },
  { say: 'मुरुगन का कुल कितना बाकी है', tl: 'hi-IN', voice: 'Devansh', exp: [], query: /Murugan/ },
  { say: 'आज कितना उधार गया', tl: 'hi-IN', voice: 'Riyaa', exp: [], query: /udhaar given/ },
  { say: 'सुरेश का चार सौ तीस रुपये जमा', tl: 'hi-IN', voice: 'Harshad', exp: [{ n: 'Suresh', k: 'payment', a: 430 }] },
  { say: 'रमेश शर्मा का साढ़े तीन सौ उधार', tl: 'hi-IN', voice: 'Prakash', exp: [{ n: 'Ramesh Sharma', k: 'credit', a: 350 }] },
  { say: 'सुरेश का एक हज़ार दो सौ उधार', tl: 'hi-IN', voice: 'Tarika', exp: [{ n: 'Suresh', k: 'credit', a: 1200 }] },
  { say: 'सुरेश का पिछला हटा दो', tl: 'hi-IN', voice: 'Shubham', exp: [], undo: true },
];

const CACHE = new URL('./.audio-cache/', import.meta.url); fs.mkdirSync(CACHE, { recursive: true });
const ONLY = process.env.ONLY; if (ONLY) for (let k = CASES.length - 1; k >= 0; k--) if (CASES[k].tl !== ONLY) CASES.splice(k, 1);
async function tts(text, language, voice) {
  const f = new URL(`${Buffer.from(text + voice).toString('hex').slice(0, 60)}.pcm`, CACHE);
  if (fs.existsSync(f)) { const b = fs.readFileSync(f); return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch('https://api.vachana.ai/api/v1/tts/inference', { method: 'POST', headers: { 'X-API-Key-ID': env.GNANI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, model: 'timbre-v3.0', language, audio_config: { sample_rate: 16000, container: 'raw' } }) });
    if (r.status === 429) { await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); continue; }
    if (!r.ok) throw new Error(`TTS ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(f, buf);
    return new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
  }
  throw new Error('TTS rate limited');
}
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
function addNoise(speech, babble, snrDb) {
  const out = new Int16Array(speech.length), sr = rms(speech), target = sr / 10 ** (snrDb / 20);
  let lp = 0; const raw = new Float32Array(speech.length);
  for (let i = 0; i < raw.length; i++) { lp = lp * 0.97 + (Math.random() * 2 - 1) * 0.03; raw[i] = (Math.random() * 2 - 1) * 0.5 + lp * 12; } // hiss + street rumble
  const rn = Math.sqrt(raw.reduce((s, v) => s + v * v, 0) / raw.length);
  const bb = babble.length >= speech.length ? babble : Int16Array.from({ length: speech.length }, (_, i) => babble[i % babble.length]);
  const rb = rms(bb) || 1;
  for (let i = 0; i < out.length; i++) {
    let v = speech[i] + raw[i] / rn * target * 0.8 + (bb[i] / rb) * target * 0.6;
    if ((i % 16000) < 1800 && Math.floor(i / 16000) % 3 === 1) v += Math.sin(i / 16000 * 2 * Math.PI * 420) * target * 1.2; // horn blips
    out[i] = Math.max(-32768, Math.min(32767, v));
  }
  return out;
}

function stream(pcm, keyterms) {
  return new Promise((resolve) => {
    const segs = new Map(); let t0 = 0, tLast = 0;
    const ws = new WebSocket(`ws://${BASE}/ws/stt?lang=indic-auto&keyterms=${encodeURIComponent(JSON.stringify(keyterms))}`);
    ws.on('message', (m) => { const j = JSON.parse(m); if (j.type !== 'transcript') return; const s = segs.get(j.segment_index) || {}; s[j.s] = j.text; segs.set(j.segment_index, s); tLast = Date.now(); });
    ws.on('open', async () => {
      const lead = new Int16Array(16000 * 0.7), tail = new Int16Array(16000 * 1.6);
      const all = new Int16Array(lead.length + pcm.length + tail.length); all.set(pcm, lead.length);
      for (let i = 0; i + 512 <= all.length; i += 512) {
        if (!t0 && i >= lead.length + pcm.length) t0 = Date.now();
        ws.send(Buffer.from(all.buffer, i * 2, 1024)); await new Promise((r) => setTimeout(r, 32));
      }
      setTimeout(() => { ws.close(); const ord = [...segs.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]);
        resolve({ w: ord.map((s) => s.w || '').join(' ').trim(), d: ord.map((s) => s.d || '').join(' ').trim(), lat: tLast && t0 ? tLast - t0 : null, nseg: ord.length }); }, 1200);
    });
    ws.on('error', () => resolve({ w: '', d: '', lat: null, nseg: 0 }));
  });
}

function grade(c, heard) {
  const L = new Ledger(emptyState({ shop: 'T' })); seedDemo(L);
  const ag = new Agent(L, () => 'en');
  const before = L.s.entries.length, sBefore = L.s.sales.length;
  let r = ag.handle(heard), turns = 0;
  while (r && r.kind === 'ask' && turns++ < 2) r = ag.handle({ w: 'haan', d: '' }); // allow a yes/no confirmation turn (e.g. new customer)
  const got = L.s.entries.slice(before).map((e) => ({ n: L.party(e.partyId).name, k: e.kind, a: e.amount }));
  let ok;
  if (c.query) ok = !!r && c.query.test(r.say);
  else if (c.sale) ok = L.s.sales.length === sBefore + 1 && L.s.sales.at(-1).amount === c.sale;
  else ok = JSON.stringify(got) === JSON.stringify(c.exp);
  return { ok, got, r, asked: r?.kind === 'ask' };
}

async function run(label, noisy) {
  console.log(`\n=== ${label} ${noisy ? `(SNR ${SNR} dB + babble + horn)` : ''}`);
  const Lk = new Ledger(emptyState({})); seedDemo(Lk); const kt = new Agent(Lk, () => 'en').keyterms();
  const speech = []; for (const c of CASES) { speech.push(await tts(c.say, c.tl, c.voice)); await new Promise((r) => setTimeout(r, 400)); }
  let pass = 0, ampOk = 0; const lats = [];
  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i];
    const babble = speech[(i + 5) % speech.length];
    const heard = await stream(noisy ? addNoise(speech[i], babble, SNR) : speech[i], kt);
    const g = grade(c, heard); if (g.ok) pass++; if (heard.lat != null) lats.push(heard.lat);
    console.log(`${g.ok ? 'PASS' : 'FAIL'}  "${c.say}"\n      words : ${heard.w}\n      digits: ${heard.d}${g.ok ? '' : `\n      got   : ${JSON.stringify(g.got)}  reply: ${g.r?.say ?? '(none)'}`}`);
  }
  lats.sort((a, b) => a - b);
  console.log(`--> ${label}: ${pass}/${CASES.length} correct   STT end-of-speech->transcript median ${lats[lats.length >> 1]}ms, max ${lats.at(-1)}ms`);
  return pass;
}

if (mode !== 'noisy') await run('CLEAN', false);
if (mode !== 'clean') await run('NOISY', true);
