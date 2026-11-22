// Voice Khata – tiny backend. Two jobs only:
//  1. serve the static web app, and
//  2. proxy the browser's mic/speaker WebSockets to the Gnani Vachana API,
//     because browsers cannot set auth headers and the API key must stay server-side.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');

// --- minimal .env loader (no extra dependency) ---
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env optional in production */ }

const KEY = process.env.GNANI_API_KEY;
const PORT = Number(process.env.PORT || 3000);
if (!KEY) console.warn('WARNING: GNANI_API_KEY missing – voice will not work. Copy .env.example to .env');

const STT_URL = 'wss://api.vachana.ai/stt/v3/stream';
const TTS_URL = 'wss://api.vachana.ai/api/v1/tts';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, voice: !!KEY }));
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': rel === '/sw.js' ? 'no-cache' : 'public, max-age=300',
      'permissions-policy': 'microphone=(self)',
      'x-content-type-options': 'nosniff',
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/ws/stt' && url.pathname !== '/ws/tts') return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => {
    if (!KEY) { ws.send(JSON.stringify({ type: 'error', message: 'Server has no GNANI_API_KEY' })); return ws.close(); }
    (url.pathname === '/ws/stt' ? sttProxy : ttsProxy)(ws, url.searchParams);
  });
});

// ---------- STT ----------
// One mic stream is fanned out to two Prisma v3.0 sessions:
//   'w' = transliterate  -> Latin-script words ("teen sau chaalis"), easy to match names
//   'd' = transcribe     -> digits ("340"), used to cross-check the amount
function sttProxy(client, q) {
  const lang = q.get('lang') || 'indic-auto';
  let keyterms = [];
  try { keyterms = JSON.parse(q.get('keyterms') || '[]').slice(0, 200); } catch { /* ignore */ }
  const dual = q.get('dual') !== '0';
  const base = {
    'x-api-key-id': KEY,
    model: 'prisma-v3.0',
    language_code: lang,
    'x-sample-rate': '16000',
    'x-vad-threshold': q.get('vad') || '0.65',
    'x-min-speech-ms': '200',
    'x-min-segment-ms': '200',
    'x-min-silence-ms': q.get('sil') || '450',
    'x-idle-timeout-sec': '300',
  };
  if (keyterms.length) base.keyterms = JSON.stringify(keyterms);
  const streams = [{ tag: 'w', fmt: 'transliterate' }];
  if (dual) streams.push({ tag: 'd', fmt: 'transcribe' });

  const ups = streams.map(({ tag, fmt }) => {
    const pending = [];
    const ws = new WebSocket(STT_URL, { headers: { ...base, format: fmt } });
    ws.on('open', () => { pending.splice(0).forEach((b) => ws.send(b)); });
    ws.on('message', (m) => {
      if (client.readyState !== WebSocket.OPEN) return;
      try { const j = JSON.parse(m.toString()); j.s = tag; client.send(JSON.stringify(j)); } catch { /* ignore */ }
    });
    ws.on('unexpected-response', (_q, r) => {
      client.send(JSON.stringify({ type: 'error', s: tag, message: `Gnani STT refused connection (HTTP ${r.statusCode})` }));
    });
    ws.on('error', (e) => client.readyState === WebSocket.OPEN &&
      client.send(JSON.stringify({ type: 'error', s: tag, message: e.message })));
    ws.on('close', () => { if (tag === 'w' && client.readyState === WebSocket.OPEN) client.close(1011, 'stt closed'); });
    return { ws, pending };
  });

  client.on('message', (data, isBinary) => {
    if (isBinary) {
      for (const u of ups) {
        if (u.ws.readyState === WebSocket.OPEN) u.ws.send(data);
        else if (u.ws.readyState === WebSocket.CONNECTING && u.pending.length < 200) u.pending.push(data);
      }
    } else {
      try { const j = JSON.parse(data.toString()); if (j.type === 'commit') ups.forEach((u) => u.ws.readyState === 1 && u.ws.send('{"type":"commit"}')); } catch { /* ignore */ }
    }
  });
  client.on('close', () => ups.forEach((u) => { try { u.ws.close(); } catch { /* ignore */ } }));
}

// ---------- TTS ----------
function ttsProxy(client) {
  let up = null;
  let queue = [];
  const open = () => {
    up = new WebSocket(TTS_URL, { headers: { 'X-API-Key-ID': KEY } });
    up.on('open', () => { queue.splice(0).forEach((m) => up.send(m)); });
    up.on('message', (m) => client.readyState === WebSocket.OPEN && client.send(m.toString()));
    up.on('error', (e) => client.readyState === WebSocket.OPEN &&
      client.send(JSON.stringify({ type: 'error', message: e.message })));
    up.on('close', () => { up = null; });
  };
  open(); // pre-warm so the first reply has no handshake cost
  client.on('message', (data) => {
    let j; try { j = JSON.parse(data.toString()); } catch { return; }
    if (j.type === 'cancel') { try { up && up.close(); } catch { /* ignore */ } up = null; queue = []; return; }
    if (!j.text) return;
    const msg = JSON.stringify({
      text: j.text,
      voice: j.voice || 'Sunaina',
      model: 'timbre-v3.0',
      language: j.language || 'auto',
      speed: 1.0,
      audio_config: { sample_rate: 24000, num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'raw' },
    });
    if (!up) open();
    if (up.readyState === WebSocket.OPEN) up.send(msg); else queue.push(msg);
  });
  client.on('close', () => { try { up && up.close(); } catch { /* ignore */ } });
}

server.listen(PORT, () => console.log(`Voice Khata running on http://localhost:${PORT}`));
