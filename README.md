# Voice Khata — a voice ledger for kirana stores

> *Bolo, khata likh jaayega.* A shopkeeper talks to the counter mid-sale — **"Ramesh ka 340 udhaar, kal 200 diya tha"** — and the ledger updates correctly, in **Hindi, Tamil, Kannada or English (with English code-mix)**, without touching the screen.

Built for the **BolBharat – Gnani Voice AI Innovation Challenge, Track PS2 (Voice Khata for kirana stores)** on the **Gnani Vachana API Platform**: Prisma v3.0 (STT) and Timbre v3.0 (TTS) over WebSocket streaming.

## What it does

| Shopkeeper says | Voice Khata does |
|---|---|
| "Ramesh ka 340 udhaar" · "teen sau chaalis" · "three forty" · "3,40" | Adds ₹340 credit. Every spoken form of a number is understood (incl. *dedh sau, dhai hazaar, saade teen sau, paune do sau*, Tamil *munnooru naarpathu*, Kannada *munnoora nalavattu*) |
| "Suresh ne 200 diya" / "Suresh ko 200 diya" | Direction handled: *ne diya* = payment received, *ko diya* = credit given |
| "…kal 200 diya tha" · "parso" · "3 din pehle" | Relative dates; one sentence can hold several entries |
| "nahi, 430" · "galat, payment tha" · "pichla hata do" | Spoken corrections and undo, applied to the last entry only |
| Two customers named Ramesh | Asks a short spoken question: *"Which Ramesh? Ramesh Kumar or Ramesh Sharma?"* |
| "Ramesh ka total?" · "Aaj kitna udhaar gaya?" · "Kitne log udhaar pe hain?" | Answers by voice, typically ~1.2–1.5 s after he stops speaking |
| "Parle se 5000 ka maal liya" · "Parle ko 2000 diya" | **Supplier payables** tracked separately from customer receivables |
| "Aaj 1500 ki bikri" | Cash/UPI sales → **today's revenue** on the home screen |
| "Oreo ke 20 packet aaye, expiry march 2027" | **Stock with expiry**. Warns about items expiring in 30 days; at day end asks *"Is Oreo selling today?"* |
| "Din ka hisab" | Spoken daily summary + daily tips |
| "Suresh ko reminder bhejo" | Polite reminder text — **only for customers who opted in**, never auto-sent |

**Conversation with common sense.** The agent chats naturally (hello, how are you, thanks, who are you, "business is slow", "I'm tired", the time) and is honest about what it can't help with. After each credit/payment it asks **"Are you in a rush?"** — if yes (or if you just carry on), the follow-up question is **parked and asked at the end of the day** ("as promised, I'm back…"); if not, it asks what happened (what did Suresh take? cash or UPI?) and saves your answer on the entry. Parked questions survive restarts and show on the Home screen. The voice agent itself sits behind the **mic in the middle of the nav bar** — hidden until you tap it.

## The demo screen

Open the page on a laptop and you get three columns: the story, a **phone** running the real app (dynamic island shows *Listening / Understanding / Speaking*), and **Behind the app** — a live view of the pipeline for every turn: *Listen → Hear (Prisma words + digits) → Understand (customer, ₹, credit/payment, date) → Update ledger → Speak (Timbre)*, with measured speech→text and first-audio times, the trust checklist, and one-tap **Try saying** phrases. On a phone the same page is simply the full-screen app.

**First run (onboarding):** language → four animated slides (speak · your language · every rupee exact · yours alone) → microphone permission → sign-up with a PIN → a coach mark on the mic. The look is strictly black and white (Auto / White / Black in Settings), with a voice-reactive sphere, a sliding tab indicator and count-up totals.

## Architecture

```mermaid
flowchart LR
  subgraph Phone / Browser (PWA)
    MIC[Mic] --> WK[AudioWorklet<br/>16 kHz PCM, 32 ms frames]
    WK -->|barge-in detector<br/>silence while agent talks| WS1
    NLU[Rule NLU<br/>numbers · names · direction · dates] --> AG[Dialog manager<br/>disambiguation · corrections<br/>amount cross-check]
    AG --> LED[(Encrypted ledger<br/>AES-GCM · PBKDF2 PIN)]
    AG --> TTSC[Streaming player<br/>24 kHz PCM chunks]
  end
  WS1[/ws/stt/] --> PROXY
  PROXY[Node proxy<br/>holds GNANI_API_KEY] -->|fan-out| P1[Prisma v3.0<br/>format=transliterate<br/>'teen sau chaalis']
  PROXY --> P2[Prisma v3.0<br/>format=transcribe<br/>'340']
  P1 --> NLU
  P2 -->|digits cross-check| AG
  AG -->|reply text| WS2[/ws/tts/]
  WS2 --> PROXY2[Node proxy] --> T[Timbre v3.0 WebSocket TTS]
  T --> TTSC --> SPK[Speaker]
```

**Why two STT streams?** One mic feed is sent to two Prisma v3.0 sessions. The *transliterate* stream returns Hindi/Tamil/English all in Latin letters, so a single parser and name matcher handles all three languages. The *transcribe* stream returns digits (`340`). When they disagree on an amount, the agent asks (*"340 or 430?"*) instead of guessing; when only one has a number, it uses that one. This is what makes exact-amount accuracy robust to STT slips such as *dedh sau → "de-do"*.

**Why rules instead of an LLM?** An LLM can invent a digit. Shop talk is a small, closed vocabulary, so a deterministic parser is faster (instant replies), cheaper (no tokens), auditable, and never hallucinates an amount. Spoken replies are templates.

### Gnani API Platform services used
| Service | Use |
|---|---|
| **Prisma v3.0** realtime STT — `wss://api.vachana.ai/stt/v3/stream` | Streaming speech recognition with `indic-auto`, `format=transliterate` + `format=transcribe`, `keyterms` (customer and product names biased in), tuned VAD (`x-vad-threshold`, `x-min-silence-ms`, `x-min-speech-ms`) for noise |
| **Timbre v3.0** realtime TTS — `wss://api.vachana.ai/api/v1/tts` | Streaming replies, raw 24 kHz PCM played chunk by chunk (first audio ≈ 0.2–0.4 s) |

Speech layer details: streaming end to end · **barge-in** (speaking over the agent stops it; the mic sends silence while the agent talks to avoid echo transcripts, with a local energy detector and a 0.5 s ring buffer so the start of the interruption is not lost) · endpointing tuned to 450 ms · noise gate headers · echo cancellation / noise suppression on the mic · push-to-talk **or** hands-free wake word ("Khata, …") · automatic STT reconnect.

## Run it

```bash
npm install
cp .env.example .env        # add your GNANI_API_KEY (never commit .env — it is git-ignored)
npm start                   # http://localhost:3000
```

Microphone access needs **HTTPS or localhost**. To try it on a phone, deploy anywhere that runs Node (Render, Railway, Fly) with `GNANI_API_KEY` as an environment variable, or tunnel with `npx cloudflared tunnel --url http://localhost:3000`. Open the page and use **Add to Home Screen** to install it as an app.

First run: sign up (name, shop, language, 4-digit PIN) → tap the orb → speak. "Start with sample data" loads **synthetic** customers so you can demo immediately.

### Tests
```bash
npm test          # 33 unit/dialog tests: number forms, direction, dates, corrections, disambiguation, reminders…
npm run e2e       # real audio: Gnani TTS voices (+ street noise, babble, horn) -> our proxy -> Prisma -> agent -> ledger
node scripts/mic-test.mjs   # drives the real browser UI with a fake microphone (needs Chrome)
```
Measured on a 19-phrase set (Hindi, Hinglish, Devanagari, Tamil, Kannada, English; ~10 voices): **clean 19/19 · 8 dB SNR + babble + horn 16/19 · 4 dB 11/14 on the first 14**. Kannada alone: clean 5/5, noisy 4/5. Misses fail safe: the agent asks the user to repeat; it never writes a guessed amount. Typical timing: end-of-speech → transcript ≈ 0.9 s (including the 450 ms endpointing wait) + first reply audio ≈ 0.3 s.

## Responsible AI & compliance

| Baseline rule | How it is met |
|---|---|
| **AI disclosure in first turn, in the user's language** | Every session opens with *"Namaste! I am an AI assistant…"* (Hindi / English / Tamil / Kannada) before listening |
| **Synthetic or consented data only** | Demo data is synthetic. No real customer data or call recordings used for testing; test audio is generated |
| **DPDP — encrypted at rest, deleted** | Ledger is **AES-GCM encrypted** in the browser with a PBKDF2 key derived from the shopkeeper's PIN; the key lives only in memory. **Transcripts are never stored** (they exist in memory while a turn is processed). "Erase all data" wipes everything |
| **Reminders: polite, opt-in only** | A reminder can only be prepared for a customer with the *opt-in* switch on; wording is a fixed polite template ("whenever convenient… thank you"), no pressure or threat language; it is shown on screen for the shopkeeper to send himself — nothing is sent automatically |
| **No lending, no pressure** | The product records credit the shopkeeper already gave; it offers no loans or credit scoring |
| **No health advice** | Not applicable to this track; the assistant gives no medical content |
| **Secrets** | `GNANI_API_KEY` lives in `.env` (git-ignored) and is used **only by the Node proxy**; the browser never sees it |
| **No voice cloning** | Stock Timbre v3.0 voice (Sunaina) only |

Privacy note: in **hands-free mode** the microphone stays open and audio streams to Gnani for recognition; utterances without the wake word are discarded and never stored. It is off by default and clearly labelled.

## Project layout
```
server.js                 static server + WebSocket proxies to Gnani (API key stays here)
public/
  index.html, style.css   minimal PWA UI (light/dark, Hindi/Tamil/Kannada/English)
  js/app.js               screens, session lifecycle, wake word
  js/voice.js             mic worklet, STT/TTS streaming, barge-in
  js/agent.js             dialog manager (disambiguation, corrections, cross-check, day-end)
  js/ledger.js            customers, suppliers, sales, stock + balances
  js/store.js             PIN-derived AES-GCM storage
  js/i18n.js              spoken replies in hi / en / ta / kn
  js/nlu/numbers.js       Hindi · Tamil · Kannada · English number grammar
  js/nlu/parse.js         intents, names, direction, dates, corrections
test/                     unit + dialog tests        scripts/  e2e + browser harnesses
```

## Known limits
* Recognition quality drops in very heavy noise; the agent then asks to repeat rather than guess.
* The PIN protects a lost phone, not a determined offline attacker (4–6 digits).
* A web app cannot draw over other apps. The floating mic icon inside the app stays on every tab; an always-on-top bubble over other apps needs the native Android wrapper (not included in this version).
