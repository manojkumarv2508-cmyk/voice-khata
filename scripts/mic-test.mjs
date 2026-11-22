// Drives the REAL app in headless Chrome with a spoken phrase as the fake microphone: worklet -> /ws/stt -> agent -> /ws/tts -> speaker.
import fs from 'node:fs'; import puppeteer from 'puppeteer-core';
const phrase = process.argv[2] || 'Suresh ka teen sau chaalis rupaye udhaar', voice = process.argv[3] || 'Avinash';
const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split('=')));
const r = await fetch('https://api.vachana.ai/api/v1/tts/inference', { method: 'POST', headers: { 'X-API-Key-ID': env.GNANI_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: phrase, voice, model: 'timbre-v3.0', language: 'hi-en', audio_config: { sample_rate: 16000, container: 'raw' } }) });
const sp = Buffer.from(await r.arrayBuffer());
const lead = Buffer.alloc(16000 * 2 * 7), tail = Buffer.alloc(16000 * 2 * 4), all = Buffer.concat([lead, sp, tail]);
const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + all.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(16000, 24); h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(all.length, 40);
fs.mkdirSync('shots', { recursive: true }); fs.writeFileSync('shots/mic.wav', Buffer.concat([h, all]));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${process.cwd()}/shots/mic.wav`, '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const log = []; p.on('pageerror', (e) => log.push('PAGEERROR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') log.push('CONSOLE ' + m.text()); });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('vk_seen', '1'); }); await p.reload({ waitUntil: 'networkidle0' });
await p.click('[data-l=en]'); await p.type('#fName', 'Tester'); await p.type('#fShop', 'Test Stores'); await p.type('#fPin', '1234'); await p.click('#authBtn');
await p.waitForSelector('#main:not([hidden])');
await p.click('.mic-tab'); const t0 = Date.now(); await p.click('#orb');
const seen = new Set(); let last = '';
for (let i = 0; i < 70; i++) {
  await new Promise((r) => setTimeout(r, 500));
  const s = await p.evaluate(() => ({ st: document.querySelector('#dock').dataset.state, heard: document.querySelector('#heard').textContent, said: document.querySelector('#said').textContent, chip: document.querySelector('#chip').hidden ? '' : document.querySelector('#chip').textContent }));
  const k = `${s.st}|${s.heard}|${s.said}|${s.chip}`; if (k !== last) { console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] state=${s.st}  heard=${s.heard}  said=${s.said.slice(0, 90)}  ${s.chip}`); last = k; }
  if (/udhaar noted|Suresh/.test(s.said) && /noted/.test(s.said)) { await new Promise((r) => setTimeout(r, 1500)); break; }
}
await p.screenshot({ path: 'shots/mic-result.png' });
console.log('errors:', JSON.stringify(log));
await b.close();
