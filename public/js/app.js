import { Ledger, emptyState, seedDemo } from './ledger.js';
import { Agent } from './agent.js';
import { Voice } from './voice.js';
import { Vault } from './store.js';
import { LANGS, S, money } from './i18n.js';
import { hasWake, stripWake } from './nlu/parse.js';
import { Viz } from './viz.js';
import { C } from './chat.js';
import { Insight } from './insight.js';
import { runOnboarding, OB } from './onboard.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const L3 = (hi, en, ta) => ({ hi, en, ta });

const U = {
  theme: { hi: 'थीम', en: 'Theme', ta: 'தீம்', kn: 'ಥೀಮ್' },
  name: L3('आपका नाम', 'Your name', 'உங்கள் பெயர்'), shop: L3('दुकान का नाम', 'Shop name', 'கடை பெயர்'),
  pinNew: L3('4 अंकों का पिन (डेटा लॉक के लिए)', '4-digit PIN (locks your data)', '4 இலக்க PIN (தரவை பூட்ட)'), pin: L3('अपना पिन डालें', 'Enter your PIN', 'PIN உள்ளிடுக'),
  start: L3('शुरू करें', 'Get started', 'தொடங்கு'), unlock: L3('खोलें', 'Unlock', 'திற'),
  demo: L3('नमूना (नकली) डेटा के साथ शुरू करें', 'Start with sample (synthetic) shop data', 'மாதிரி (போலி) தரவுடன் தொடங்கு'),
  sub: L3('बोलकर अपना उधार खाता लिखिए', 'Speak your udhaar. We write the khata.', 'பேசுங்கள், கணக்கு எழுதுகிறோம்'),
  foot: L3('आपका डेटा सिर्फ़ इसी फ़ोन में, एन्क्रिप्टेड रहता है। यह ऐप एक एआई है।', 'Your ledger stays on this phone, encrypted. This app is an AI.', 'உங்கள் கணக்கு இந்த போனிலேயே, குறியாக்கத்துடன். இது ஒரு ஏஐ.'),
  wrongPin: L3('पिन गलत है', 'Wrong PIN', 'PIN தவறு'), welcome: L3('वापस स्वागत है', 'Welcome back', 'மீண்டும் வருக'),
  reset: L3('सब मिटाकर नया शुरू करें', 'Erase everything and start over', 'அனைத்தையும் அழித்து புதிதாக தொடங்கு'),
  tabs: { home: L3('होम', 'Home', 'முகப்பு'), khata: L3('खाता', 'Khata', 'கணக்கு'), stock: L3('स्टॉक', 'Stock', 'இருப்பு'), log: L3('हिसाब', 'Activity', 'பதிவு') },
  salesToday: L3('आज की बिक्री', "Today's sales", 'இன்றைய விற்பனை'), collected: L3('वापस आया', 'Collected', 'வசூல்'), udhaarGiven: L3('उधार गया', 'Udhaar given', 'கடன் கொடுத்தது'),
  toReceive: L3('मुझे मिलना है', 'To receive', 'வர வேண்டியது'), toPay: L3('मुझे देना है', 'To pay', 'கொடுக்க வேண்டியது'),
  people: L3('लोग', 'people', 'பேர்'), supplierN: L3('सप्लायर', 'suppliers', 'சப்ளையர்'),
  tipsT: L3('आज के सुझाव', 'TODAY', 'இன்று'), customers: L3('ग्राहक', 'Customers', 'வாடிக்கையாளர்'), suppliers: L3('सप्लायर', 'Suppliers', 'சப்ளையர்'),
  noParties: L3('अभी कोई नहीं। बोलिए: "रमेश का 340 उधार"', 'No one yet. Say: "Ramesh ka 340 udhaar"', 'இன்னும் யாரும் இல்லை. சொல்லுங்கள்: "ரமேஷ் 340 கடன்"'),
  noStock: L3('स्टॉक खाली है। बोलिए: "ओरियो के 20 पैकेट आए, एक्सपायरी मार्च"', 'No stock yet. Say: "Oreo ke 20 packet aaye, expiry march"', 'இருப்பு இல்லை. சொல்லுங்கள்: "Oreo 20 packet, expiry march"'),
  noLog: L3('अभी कोई एंट्री नहीं।', 'No entries yet.', 'பதிவுகள் இல்லை.'),
  expiredL: L3('एक्सपायर', 'Expired', 'காலாவதி'), daysL: L3('दिन', 'days', 'நாட்கள்'), noExp: L3('एक्सपायरी नहीं', 'no expiry', 'தேதி இல்லை'),
  selling: L3('अच्छा बिक रहा', 'selling', 'நன்றாக விற்கிறது'), slow: L3('धीमा', 'slow', 'மெதுவாக'),
  hint: { idle: L3('टैप करके बोलिए', 'Tap and speak', 'தட்டி பேசுங்கள்'), listening: L3('सुन रहा हूँ…', 'Listening…', 'கேட்கிறேன்…'), thinking: L3('समझ रहा हूँ…', 'Understanding…', 'புரிந்துகொள்கிறேன்…'), speaking: L3('बीच में बोलकर रोक सकते हैं', 'Speak to interrupt', 'குறுக்கே பேசி நிறுத்தலாம்') },
  undo: L3('हटाएँ', 'Undo', 'நீக்கு'), copy: L3('कॉपी', 'Copy', 'நகல்'), wa: L3('व्हाट्सऐप', 'WhatsApp', 'வாட்ஸ்ஆப்'),
  settings: L3('सेटिंग्स', 'Settings', 'அமைப்புகள்'), hf: L3('हैंड्स-फ़्री', 'Hands-free', 'கை தேவையில்லை'),
  hfSub: L3('"खाता, …" बोलकर शुरू करें। माइक चालू रहता है और ऑडियो Gnani को जाता है।', 'Say "Khata, …" to start. Mic stays on and audio streams to Gnani.', '"கணக்கு, …" என்று தொடங்குங்கள். மைக் இயங்கும், ஆடியோ Gnani க்கு செல்லும்.'),
  loadDemo: L3('नमूना डेटा जोड़ें', 'Add sample data', 'மாதிரி தரவு சேர்'), lock: L3('लॉक करें', 'Lock', 'பூட்டு'), wipe: L3('सारा डेटा मिटाएँ', 'Erase all data', 'தரவை அழி'),
  privacy: L3('एआई आवाज़ सहायक। डेटा इसी डिवाइस पर एन्क्रिप्टेड है; बातचीत सेव नहीं होती।', 'AI voice assistant. Data is encrypted on this device; transcripts are not saved.', 'ஏஐ குரல் உதவியாளர். தரவு இந்த சாதனத்தில் குறியாக்கத்துடன்; உரையாடல் சேமிக்கப்படாது.'),
  optIn: L3('रिमाइंडर के लिए सहमति', 'Agreed to polite reminders', 'நினைவூட்டலுக்கு சம்மதம்'), phone: L3('फ़ोन (वैकल्पिक)', 'Phone (optional)', 'தொலைபேசி (விருப்பம்)'),
  remind: L3('विनम्र रिमाइंडर बनाएँ', 'Write polite reminder', 'பணிவான நினைவூட்டல்'), close: L3('बंद करें', 'Close', 'மூடு'),
  micDenied: L3('माइक की अनुमति दीजिए', 'Please allow the microphone', 'மைக் அனுமதி தேவை'), type: L3('जैसे बोलते हैं वैसे लिखिए…', 'Type like you would speak…', 'பேசுவது போல் தட்டச்சு…'),
  offline: L3('इंटरनेट नहीं है', 'You are offline', 'இணையம் இல்லை'), barge: L3('रोका', 'Stopped', 'நிறுத்தினேன்'),
  kinds: { credit: L3('उधार', 'UDHAAR', 'கடன்'), payment: L3('जमा', 'JAMA', 'வரவு'), purchase: L3('माल', 'MAAL', 'சரக்கு'), supplier_payment: L3('दिया', 'PAID', 'கொடுத்தது'), sale: L3('बिक्री', 'SALE', 'விற்பனை'), stock: L3('स्टॉक', 'STOCK', 'இருப்பு') },
  statusLbl: { selling: L3('अच्छा बिक रहा', 'selling well', 'நன்றாக விற்கிறது'), slow: L3('धीमा', 'slow', 'மெதுவாக'), unknown: L3('', '', '') },
};

const KNU = {
  name: 'ನಿಮ್ಮ ಹೆಸರು', shop: 'ಅಂಗಡಿ ಹೆಸರು', pinNew: '4 ಅಂಕಿಯ ಪಿನ್ (ಡೇಟಾ ಲಾಕ್‌ಗಾಗಿ)', pin: 'ನಿಮ್ಮ ಪಿನ್ ನಮೂದಿಸಿ', start: 'ಪ್ರಾರಂಭಿಸಿ', unlock: 'ತೆರೆಯಿರಿ',
  demo: 'ಮಾದರಿ (ನಕಲಿ) ಡೇಟಾದೊಂದಿಗೆ ಪ್ರಾರಂಭಿಸಿ', sub: 'ಮಾತನಾಡಿ, ನಾವು ಖಾತೆ ಬರೆಯುತ್ತೇವೆ',
  foot: 'ನಿಮ್ಮ ಲೆಕ್ಕ ಈ ಫೋನ್‌ನಲ್ಲೇ, ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿರುತ್ತದೆ. ಇದು ಒಂದು ಎಐ.', wrongPin: 'ಪಿನ್ ತಪ್ಪಾಗಿದೆ', welcome: 'ಮರಳಿ ಸ್ವಾಗತ',
  reset: 'ಎಲ್ಲವನ್ನೂ ಅಳಿಸಿ ಹೊಸದಾಗಿ ಪ್ರಾರಂಭಿಸಿ',
  tabs: { home: 'ಮುಖಪುಟ', khata: 'ಖಾತಾ', stock: 'ದಾಸ್ತಾನು', log: 'ದಾಖಲೆ' },
  salesToday: 'ಇಂದಿನ ಮಾರಾಟ', collected: 'ವಸೂಲಿ', udhaarGiven: 'ಕೊಟ್ಟ ಸಾಲ', toReceive: 'ನನಗೆ ಬರಬೇಕು', toPay: 'ನಾನು ಕೊಡಬೇಕು',
  people: 'ಜನ', supplierN: 'ಸರಬರಾಜುದಾರ', tipsT: 'ಇಂದಿನ ಸಲಹೆ', customers: 'ಗ್ರಾಹಕರು', suppliers: 'ಸರಬರಾಜುದಾರರು',
  noParties: 'ಇನ್ನೂ ಯಾರೂ ಇಲ್ಲ. ಹೇಳಿ: "ರಮೇಶ್ 340 ಸಾಲ"', noStock: 'ದಾಸ್ತಾನು ಇಲ್ಲ. ಹೇಳಿ: "Oreo 20 packet ಬಂತು, expiry march"', noLog: 'ಇನ್ನೂ ದಾಖಲೆ ಇಲ್ಲ.',
  expiredL: 'ಅವಧಿ ಮುಗಿದಿದೆ', daysL: 'ದಿನ', noExp: 'ಅವಧಿ ಇಲ್ಲ', selling: 'ಚೆನ್ನಾಗಿ ಮಾರಾಟ', slow: 'ನಿಧಾನ',
  hint: { idle: 'ಒತ್ತಿ ಮಾತನಾಡಿ', listening: 'ಕೇಳುತ್ತಿದ್ದೇನೆ…', thinking: 'ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ…', speaking: 'ಮಧ್ಯದಲ್ಲಿ ಮಾತನಾಡಿ ನಿಲ್ಲಿಸಬಹುದು' },
  undo: 'ತೆಗೆಯಿರಿ', copy: 'ನಕಲು', wa: 'ವಾಟ್ಸ್‌ಆ್ಯಪ್', settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', hf: 'ಹ್ಯಾಂಡ್ಸ್-ಫ್ರೀ',
  hfSub: '"ಖಾತಾ, …" ಎಂದು ಪ್ರಾರಂಭಿಸಿ. ಮೈಕ್ ಚಾಲನೆಯಲ್ಲಿರುತ್ತದೆ, ಆಡಿಯೋ Gnani ಗೆ ಹೋಗುತ್ತದೆ.', loadDemo: 'ಮಾದರಿ ಡೇಟಾ ಸೇರಿಸಿ', lock: 'ಲಾಕ್ ಮಾಡಿ', wipe: 'ಎಲ್ಲಾ ಡೇಟಾ ಅಳಿಸಿ',
  privacy: 'ಎಐ ಧ್ವನಿ ಸಹಾಯಕ. ಡೇಟಾ ಈ ಸಾಧನದಲ್ಲೇ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿದೆ; ಮಾತುಕತೆ ಉಳಿಸುವುದಿಲ್ಲ.', optIn: 'ವಿನಯದ ನೆನಪೋಲೆಗೆ ಒಪ್ಪಿಗೆ', phone: 'ಫೋನ್ (ಐಚ್ಛಿಕ)',
  remind: 'ವಿನಯದ ನೆನಪೋಲೆ ಬರೆಯಿರಿ', close: 'ಮುಚ್ಚಿ', micDenied: 'ಮೈಕ್ ಅನುಮತಿ ನೀಡಿ', type: 'ಮಾತನಾಡುವಂತೆ ಟೈಪ್ ಮಾಡಿ…', offline: 'ಇಂಟರ್ನೆಟ್ ಇಲ್ಲ', barge: 'ನಿಲ್ಲಿಸಿದೆ',
  kinds: { credit: 'ಸಾಲ', payment: 'ಜಮೆ', purchase: 'ಸರಕು', supplier_payment: 'ಕೊಟ್ಟದ್ದು', sale: 'ಮಾರಾಟ', stock: 'ದಾಸ್ತಾನು' },
  statusLbl: { selling: 'ಚೆನ್ನಾಗಿ ಮಾರಾಟ', slow: 'ನಿಧಾನ', unknown: '' },
};
(function applyKn(t, k) { for (const key of Object.keys(k)) { if (typeof k[key] === 'string') t[key].kn = k[key]; else applyKn(t[key], k[key]); } })(U, KNU);

const STORY = {
  en: { k: 'VOICE KHATA', h: 'The whole khata,<br><span class="outline">in your voice.</span>', p: "Speak an entry the way you'd tell a friend. The same pipeline you see on the right writes the ledger, checks every rupee, and answers back — in Hindi or English, mixed freely.",
    f: [['Talk, don\'t type', 'Tap the mic mid-sale, or say “Khata, …” hands-free.'], ['Every rupee exact', '“Teen sau chaalis”, “340”, “three-forty” → ₹340. Fix it with “nahi, 430”.'], ['Yours alone', 'Encrypted on the phone. Nothing recorded. Always says it\'s an AI.']], r: '↺ Replay intro' },
  hi: { k: 'वॉइस खाता', h: 'पूरा खाता,<br><span class="outline">आपकी आवाज़ में।</span>', p: 'दोस्त को बताने जैसे एंट्री बोलिए। दाईं ओर दिख रही वही प्रक्रिया खाता लिखती है, हर रुपया जाँचती है और बोलकर जवाब भी देती है — हिन्दी या English में, मिलाकर भी।',
    f: [['बोलिए, टाइप मत कीजिए', 'बिक्री के बीच माइक दबाइए, या हैंड्स-फ़्री में “खाता, …” कहिए।'], ['हर रुपया सटीक', '“तीन सौ चालीस”, “340”, “three-forty” → ₹340। सुधारने के लिए कहिए “नहीं, 430”।'], ['सिर्फ़ आपका', 'फ़ोन में एन्क्रिप्टेड। कुछ रिकॉर्ड नहीं होता। हमेशा बताता है कि वह एआई है।']], r: '↺ इंट्रो फिर देखें' },
};
const FI = ['<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', '<path d="M4 7h16M4 12h10M4 17h6"/>', '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'];
function renderStory() {
  const T = STORY[lang] || STORY.en;
  $('#story').innerHTML = `<p class="kicker"><i></i>${T.k}</p><h2 class="headline">${T.h}</h2><p class="lede">${T.p}</p><ul class="feats">${T.f.map(([b, s], i) => `<li><span class="fi"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${FI[i]}</svg></span><div><b>${b}</b><small>${s}</small></div></li>`).join('')}</ul><button id="replayBtn" class="btn ghost-btn">${T.r}</button>`;
}
function applyLang() { document.documentElement.lang = lang; renderStory(); if (insight) refreshSide(); const e = document.querySelector('.top .eyebrow'); if (e) e.textContent = lang === 'hi' ? 'वॉइस खाता' : 'VOICE KHATA'; }

let state, ledger, agent, voice, viz, insight, lastHero = 0, lang = 'hi', tab = 'home', seg = 'customer', handsFree = false;
const u = (k) => (typeof k === 'string' ? U[k] : k)[lang];

// ---------- boot ----------
const authEl = $('#auth'), mainEl = $('#main');
function showAuth(mode) {
  queueMicrotask(applyLang);
  authEl.hidden = false; mainEl.hidden = true;
  const create = mode === 'create', pr = Vault.profile();
  if (!create && pr) lang = LANGS[pr.lang] ? pr.lang : 'hi';
  $('#langChips').innerHTML = Object.entries(LANGS).map(([k, v]) => `<button type="button" data-l="${k}" aria-pressed="${k === lang}">${v.label}</button>`).join('');
  $('#langChips').onclick = (e) => { const b = e.target.closest('button'); if (b) { lang = b.dataset.l; showAuth(mode); } };
  $('#signupFields').hidden = !create; $('#demoRow').hidden = !create;
  $('#authTitle').textContent = create ? 'Voice Khata' : `${u('welcome')}${pr?.name ? ', ' + pr.name : ''}`;
  $('#authSub').textContent = create ? u('sub') : pr?.shop || '';
  $('#lblName').textContent = u('name'); $('#lblShop').textContent = u('shop'); $('#lblPin').textContent = create ? u('pinNew') : u('pin');
  $('#lblDemo').textContent = u('demo'); $('#authBtn').textContent = create ? u('start') : u('unlock');
  $('#authFoot').textContent = u('foot'); $('#authErr').textContent = '';
  $('#fName').required = $('#fShop').required = create;
  $('#resetBtn').hidden = create; $('#resetBtn').textContent = u('reset');
  $('#resetBtn').onclick = () => { if (confirm(u('reset') + '?')) { Vault.wipe(); showAuth('create'); } };
  $('#authForm').onsubmit = async (e) => {
    e.preventDefault();
    const pin = $('#fPin').value.trim();
    if (create) {
      const st = emptyState({});
      const L = new Ledger(st); if ($('#fDemo').checked) seedDemo(L);
      state = await Vault.create({ name: $('#fName').value.trim(), shop: $('#fShop').value.trim(), lang }, pin, st);
      enter();
    } else {
      const st = await Vault.unlock(pin);
      if (!st) { $('#authErr').textContent = u('wrongPin'); return; }
      state = st; enter();
    }
  };
}

function enter() {
  authEl.hidden = true; mainEl.hidden = false;
  lang = LANGS[state.profile.lang] ? state.profile.lang : 'hi';
  ledger = new Ledger(state, (s) => Vault.save(s));
  agent = new Agent(ledger, () => lang);
  voice = new Voice({ keyterms: () => agent.keyterms(), lang: () => lang });
  viz = new Viz($('#viz')); insight = new Insight($('#insight'));
  wireVoice(); wireUi(); renderAll(); voice.warm();
  if (!state.profile.toured) showCoach();
  new ResizeObserver(() => document.documentElement.style.setProperty('--dock-h', $('#dock').offsetHeight + 'px')).observe($('#dock'));
}

// ---------- rendering ----------
function renderAll() {
  applyLang();
  $('#shopName').textContent = state.profile.shop;
  $('#langBtn').textContent = LANGS[lang].short + ' ▾';
  $('#hint').textContent = u(U.hint[voice.state] ? U.hint[voice.state] : U.hint.idle);
  $('#typeIn').placeholder = u('type');
  const TABS = [['home', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], ['khata', 'M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4zM8 4v16'], ['stock', 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10'], ['log', 'M12 8v5l3 2M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5']];
  const tabsEl = $('#tabs');
  const tabBtn = ([k, d]) => `<button data-t="${k}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg><span class="tl"></span></button>`;
  const MICBTN = '<button class="mic-tab" data-t="voice" aria-label="Voice assistant" aria-pressed="false"><span class="mt"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></span></button>';
  if (!tabsEl.dataset.built) { tabsEl.dataset.built = 1; tabsEl.innerHTML = '<span class="ind"></span>' + tabBtn(TABS[0]) + tabBtn(TABS[1]) + MICBTN + tabBtn(TABS[2]) + tabBtn(TABS[3]); }
  tabsEl.style.setProperty('--i', { home: 0, khata: 1, stock: 3, log: 4 }[tab]);
  tabsEl.querySelectorAll('button[data-t]:not(.mic-tab)').forEach((b) => { b.removeAttribute('aria-current'); if (b.dataset.t === tab) b.setAttribute('aria-current', 'page'); b.querySelector('.tl').textContent = u(U.tabs[b.dataset.t]); });
  $('#suggest').innerHTML = examples().slice(0, 5).map((t, i) => `<button data-i="${i}">${esc(t.label)}</button>`).join('');
  for (const v of ['home', 'khata', 'stock', 'log']) $(`#v-${v}`).hidden = v !== tab;
  ({ home: renderHome, khata: renderKhata, stock: renderStock, log: renderLog })[tab]();
  document.querySelectorAll('.list').forEach((l) => [...l.children].forEach((c, i) => c.style.setProperty('--n', i)));
  if (tab === 'home') countUp($('#heroNum'), ledger.day().revenue);
  refreshSide();
}

const EX_SAY = ['Suresh ka 340 udhaar, kal 200 diya tha', 'Ramesh ka total?', 'nahi, 430', 'Aaj 1500 ki bikri', 'Parle se 5000 ka maal liya', 'Oreo ke 20 packet aaye, expiry march', 'Din ka hisab', 'pichla hata do'];
const EX_HI = ['सुरेश का 340 उधार, कल 200 दिया था', 'रमेश का टोटल?', 'नहीं, 430', 'आज 1500 की बिक्री', 'पारले से 5000 का माल लिया', 'ओरियो के 20 पैकेट आए, एक्सपायरी मार्च', 'दिन का हिसाब', 'पिछला हटा दो'];
/** [{label shown, say (what the agent parses)}] */
function examples() { return EX_SAY.map((say, i) => ({ say, label: lang === 'hi' ? EX_HI[i] : say })); }
function refreshSide() {
  if (!insight) return;
  insight.setLang(lang);
  insight.setShop(state.profile.shop, `${state.profile.name} · ${LANGS[lang].label}`);
  insight.examples(examples(), (t) => onHeard({ w: t.say, d: '', endSpeechAt: performance.now(), typed: true }));
}
function countUp(el, to) {
  if (!el) return; const from = lastHero; lastHero = to; const t0 = performance.now();
  const step = (t) => { const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3); el.textContent = money(Math.round(from + (to - from) * e)); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function showCoach() { const c = $('#coach'); c.textContent = OB[lang].coach; c.hidden = false; $('#orb').classList.add('coachy'); }
function hideCoach() { $('#coach').hidden = true; $('#orb').classList.remove('coachy'); if (state && !state.profile.toured) { state.profile.toured = true; ledger.commit(); } }

function traceInfo(reply) {
  const hi = lang === 'hi', tr = agent.trace || {}, r = tr.r, chips = [];
  const L = hi ? { who: 'कौन', amt: '₹', type: 'प्रकार', when: 'कब', sale: 'बिक्री', via: 'ज़रिया', asks: 'सवाल', intent: 'इरादा', ans: 'जवाब', chat: 'बातचीत', asksT: 'पूछेगा', yday: 'कल', ago: 'दिन पहले',
    ok: 'शब्द और अंक एक जैसे ✓', diff: 'दोनों अलग → आपसे पुष्टि माँगी', wait: 'आपके जवाब का इंतज़ार — अभी कुछ नहीं लिखा', none: 'कोई बदलाव नहीं (सिर्फ़ जवाब)', saved: 'सेव, एन्क्रिप्टेड', bal: 'बाकी' }
    : { who: 'who', amt: '₹', type: 'type', when: 'when', sale: 'sale', via: 'via', asks: 'asks', intent: 'intent', ans: 'answer to', chat: 'small talk', asksT: 'asks', yday: 'yesterday', ago: 'd ago',
    ok: 'Word and digit streams agree ✓', diff: 'Streams differ → asked you to confirm', wait: 'Waiting for your answer — nothing written yet', none: 'No change (answer only)', saved: 'saved, encrypted', bal: 'balance' };
  const K = hi ? { credit: 'उधार', payment: 'जमा', purchase: 'माल', supplier_payment: 'दिया', sale: 'बिक्री' } : {};
  const kw = (k) => K[k] || String(k).replace('_', ' ');
  const names = (ids) => (ids ? ids.map((id) => ledger.party(id)?.name).join(' / ') : null);
  let note = '';
  if (tr.answer) chips.push({ k: L.ans, v: tr.answer });
  else if (r?.kind === 'entries') r.entries.forEach((e) => chips.push({ k: L.who, v: names(e.partyIds) || e.newName || '?', flag: !e.partyIds || e.partyIds.length > 1 }, { k: L.amt, v: e.amount }, { k: L.type, v: e.dir ? kw(e.dir) : L.asksT, flag: !e.dir }, ...(e.daysAgo ? [{ k: L.when, v: e.daysAgo === 1 ? L.yday : `${e.daysAgo} ${L.ago}` }] : [])));
  else if (r?.kind === 'sale') chips.push({ k: L.sale, v: `₹${r.amount}` }, { k: L.via, v: r.mode });
  else if (r?.kind === 'query') chips.push({ k: L.asks, v: r.q });
  else chips.push({ k: L.intent, v: reply.kind === 'chat' ? L.chat : (r?.kind || '?') });
  if (tr.da?.length && r) {
    const wa = r.entries ? r.entries.map((e) => e.amount) : r.amount ? [r.amount] : [];
    if (wa.length) note = wa.join() === tr.da.join() ? L.ok : L.diff;
  }
  const cards = reply.cards || [];
  const ledgerText = cards.length ? cards.map((c) => `${c.party} · ${kw(c.kind)} ₹${c.amount} → ${L.bal} ₹${c.bal} — ${L.saved}`).join('  |  ') : reply.kind === 'ask' ? L.wait : L.none;
  return { chips, note, ledger: ledgerText };
}

function tips() {
  const out = [], t4 = (hi, en, ta, kn) => ({ hi, en, ta, kn })[lang];
  for (const x of agent.expiringList().slice(0, 2)) out.push({ warn: true, t: x.expired
    ? t4(`${x.item} एक्सपायर हो चुका — शेल्फ़ से हटाइए`, `${x.item} has expired — pull it from the shelf`, `${x.item} காலாவதியானது — அலமாரியிலிருந்து எடுக்கவும்`, `${x.item} ಅವಧಿ ಮುಗಿದಿದೆ — ಶೆಲ್ಫ್‌ನಿಂದ ತೆಗೆಯಿರಿ`)
    : t4(`${x.item} ${x.days} दिन में एक्सपायर — पहले बेचिए`, `${x.item} expires in ${x.days} days — sell it first`, `${x.item} ${x.days} நாட்களில் காலாவதி — முதலில் விற்கவும்`, `${x.item} ${x.days} ದಿನಗಳಲ್ಲಿ ಅವಧಿ ಮುಗಿಯುತ್ತದೆ — ಮೊದಲು ಮಾರಿ`) });
  for (const s of ledger.s.stock.filter((x) => x.status === 'slow').slice(0, 1)) out.push({ warn: true, t: t4(`${s.item} धीमा बिक रहा — अगली बार कम मँगवाइए`, `${s.item} is slow — order less next time`, `${s.item} மெதுவாக விற்கிறது — அடுத்த முறை குறைவாக வாங்குங்கள்`, `${s.item} ನಿಧಾನವಾಗಿ ಮಾರಾಟವಾಗುತ್ತಿದೆ — ಮುಂದಿನ ಬಾರಿ ಕಡಿಮೆ ತರಿಸಿ`) });
  const top = ledger.debtors().find((d) => d.p.optIn);
  if (top) out.push({ t: t4(`${top.p.name} का ${money(top.bal)} बाकी — विनम्र रिमाइंडर बनाएँ?`, `${top.p.name} has ${money(top.bal)} pending — send a polite reminder?`, `${top.p.name} இடம் ${money(top.bal)} பாக்கி — பணிவான நினைவூட்டல்?`, `${top.p.name} ಅವರಿಂದ ${money(top.bal)} ಬಾಕಿ — ವಿನಯದ ನೆನಪೋಲೆ ಬರೆಯಲೇ?`) });
  const held = ledger.openFollowups().length; if (held) out.push({ t: C.held(lang, held) });
  if (!out.length) out.push({ t: t4('बोलिए: "रमेश का 340 उधार, कल 200 दिया था"', 'Try: "Ramesh ka 340 udhaar, kal 200 diya tha"', 'சொல்லுங்கள்: "ரமேஷ் 340 கடன், நேற்று 200 கொடுத்தார்"', 'ಹೇಳಿ: "ರಮೇಶ್ 340 ಸಾಲ, ನಿನ್ನೆ 200 ಕೊಟ್ಟರು"') });
  return out;
}

function renderHome() {
  const d = ledger.day(), rec = ledger.debtors(), pay = ledger.payables();
  $('#v-home').innerHTML = `
    <div class="hero"><div class="label">${esc(u('salesToday'))}</div><div class="big num" id="heroNum">${money(d.revenue)}</div>
      <div class="split"><div><b class="num">${money(d.collected)}</b><small>${esc(u('collected'))}</small></div><div><b class="num">${money(d.credit)}</b><small>${esc(u('udhaarGiven'))}</small></div></div></div>
    <div class="rows">
      <button class="row in" data-go="khata:customer"><div><div class="t">${esc(u('toReceive'))}</div><div class="v num">${money(ledger.receivableTotal())}</div></div><div class="side">${rec.length} ${esc(u('people'))} ›</div></button>
      <button class="row out" data-go="khata:supplier"><div><div class="t">${esc(u('toPay'))}</div><div class="v num">${money(ledger.payableTotal())}</div></div><div class="side">${pay.length} ${esc(u('supplierN'))} ›</div></button>
    </div>
    <div class="section-t">${esc(u('tipsT'))}</div>
    ${tips().map((t) => `<div class="tip ${t.warn ? 'warn' : ''}"><span class="dot"></span><span>${esc(t.t)}</span></div>`).join('')}`;
}

function renderKhata() {
  const type = seg;
  const rows = ledger.parties.filter((p) => p.type === type).map((p) => ({ p, bal: ledger.balance(p.id), last: ledger.entriesOf(p.id)[0] })).sort((a, b) => b.bal - a.bal);
  $('#v-khata').innerHTML = `<div class="seg"><button data-seg="customer" aria-pressed="${type === 'customer'}">${esc(u('customers'))}</button><button data-seg="supplier" aria-pressed="${type === 'supplier'}">${esc(u('suppliers'))}</button></div>` +
    (rows.length ? `<div class="list">${rows.map(({ p, bal, last }) => `<button class="item" data-party="${p.id}"><span class="avatar">${esc(p.name[0].toUpperCase())}</span>
      <span class="main"><b>${esc(p.name)}</b><small>${last ? esc(last.date) : ''}${p.optIn ? ' · ✓' : ''}</small></span>
      <span class="amt ${bal > 0 ? (type === 'supplier' ? 'neg' : 'pos') : 'zero'} num">${money(Math.abs(bal))}</span></button>`).join('')}</div>` : `<div class="empty">${esc(u('noParties'))}</div>`);
}

function renderStock() {
  const now = new Date().toISOString().slice(0, 10);
  const items = [...ledger.s.stock].filter((x) => x.status !== 'out').sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
  $('#v-stock').innerHTML = items.length ? `<div class="list">${items.map((x) => {
    const days = x.expiry ? Math.ceil((new Date(x.expiry) - new Date(now)) / 864e5) : null;
    const b = days == null ? `<span class="badge">${esc(u('noExp'))}</span>` : days < 0 ? `<span class="badge bad">${esc(u('expiredL'))}</span>` : `<span class="badge ${days <= 30 ? 'warn' : ''}">${days} ${esc(u('daysL'))}</span>`;
    return `<div class="item"><span class="avatar">${esc(x.item[0] || '?')}</span><span class="main"><b>${esc(x.item)}</b><small>${x.qty} ${esc(x.unit)}${x.status !== 'unknown' ? ' · ' + esc(u(U.statusLbl[x.status])) : ''}</small></span>${b}</div>`;
  }).join('')}</div>` : `<div class="empty">${esc(u('noStock'))}</div>`;
}

function renderLog() {
  const recs = [...ledger.s.entries.map((e) => ({ ...e, who: ledger.party(e.partyId)?.name || '?' })), ...ledger.s.sales.map((s) => ({ ...s, kind: 'sale', who: s.mode === 'upi' ? 'UPI' : 'Cash' }))].sort((a, b) => b.ts - a.ts).slice(0, 80);
  $('#v-log').innerHTML = recs.length ? `<div class="list">${recs.map((e) => `<div class="item"><span class="kind ${e.kind}">${esc(u(U.kinds[e.kind]))}</span><span class="main"><b>${esc(e.who)}</b><small>${esc(e.date)}${e.note ? " · " + esc(e.note) : ""}</small></span><span class="amt num">${money(e.amount)}</span><button class="x" data-del="${e.id}" data-sale="${e.sale ? 1 : ''}" aria-label="delete">×</button></div>`).join('')}</div>` : `<div class="empty">${esc(u('noLog'))}</div>`;
}

// ---------- sheets ----------
const sheetWrap = $('#sheetWrap'), sheet = $('#sheet');
const openSheet = (html) => { sheet.innerHTML = html; sheetWrap.hidden = false; };
const closeSheet = () => { sheetWrap.hidden = true; };
$('#scrim').onclick = closeSheet;

function partySheet(id) {
  const p = ledger.party(id), bal = ledger.balance(id), ents = ledger.entriesOf(id).slice(0, 12);
  openSheet(`<h2>${esc(p.name)}</h2><p class="sub num">${money(Math.abs(bal))} ${p.type === 'supplier' ? esc(u('toPay')) : esc(u('toReceive'))}</p>
    ${p.type === 'customer' ? `<div class="toggle"><div>${esc(u('optIn'))}<small>${esc(u('privacy'))}</small></div><button class="switch" id="optSw" role="switch" aria-checked="${p.optIn}"></button></div>
    <label style="margin-top:14px"><span>${esc(u('phone'))}</span><input id="phoneIn" type="tel" value="${esc(p.phone || '')}" placeholder="+91 …"></label>` : ''}
    <div class="list" style="margin-top:8px">${ents.map((e) => `<div class="item"><span class="kind ${e.kind}">${esc(u(U.kinds[e.kind]))}</span><span class="main"><small>${esc(e.date)}${e.note ? " · " + esc(e.note) : ""}</small></span><span class="amt num">${money(e.amount)}</span></div>`).join('')}</div>
    <div class="btnrow">${p.type === 'customer' && p.optIn && bal > 0 ? `<button class="btn primary" id="remBtn">${esc(u('remind'))}</button>` : ''}<button class="btn" id="closeBtn">${esc(u('close'))}</button></div>`);
  $('#closeBtn').onclick = closeSheet;
  const sw = $('#optSw'); if (sw) sw.onclick = () => { const v = sw.getAttribute('aria-checked') !== 'true'; ledger.setOptIn(id, v); partySheet(id); renderAll(); };
  const ph = $('#phoneIn'); if (ph) ph.onchange = () => { p.phone = ph.value.trim(); ledger.commit(); };
  const rb = $('#remBtn'); if (rb) rb.onclick = () => { closeSheet(); const r = agent.doQuery({ q: 'reminder', partyIds: [id] }); showReply(r); speak(r.say); };
}

function settingsSheet() {
  openSheet(`<h2>${esc(u('settings'))}</h2><p class="sub">${esc(state.profile.name)} · ${esc(state.profile.shop)}</p>
    <div class="toggle"><div>${esc(u('hf'))}<small>${esc(u('hfSub'))}</small></div><button class="switch" id="hfSw" role="switch" aria-checked="${handsFree}"></button></div>
    <div class="toggle"><div>${esc(u('theme'))}</div><div class="seg" id="thSeg" style="margin:0">${[['', lang === 'hi' ? 'ऑटो' : 'Auto'], ['light', lang === 'hi' ? 'सफ़ेद' : 'White'], ['dark', lang === 'hi' ? 'काला' : 'Black']].map(([k, n]) => `<button data-th="${k}" aria-pressed="${(document.documentElement.dataset.theme || '') === k}">${n}</button>`).join('')}</div></div>
    <p class="tiny muted" style="margin:14px 0">${esc(u('privacy'))}</p>
    <div class="btnrow"><button class="btn" id="demoBtn">${esc(u('loadDemo'))}</button><button class="btn" id="lockBtn">${esc(u('lock'))}</button></div>
    <div class="btnrow"><button class="btn danger" id="wipeBtn">${esc(u('wipe'))}</button></div>`);
  $('#hfSw').onclick = async () => { handsFree = !handsFree; $('#hfSw').setAttribute('aria-checked', handsFree); handsFree ? await startSession(true) : endSession(); };
  $('#thSeg').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.th; if (k) document.documentElement.dataset.theme = k; else delete document.documentElement.dataset.theme; try { k ? localStorage.setItem('vk_theme', k) : localStorage.removeItem('vk_theme'); } catch { /* ignore */ } $('#thSeg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); };
  $('#demoBtn').onclick = () => { seedDemo(ledger); closeSheet(); renderAll(); toast('✓'); };
  $('#lockBtn').onclick = () => { endSession(); Vault.lock(); closeSheet(); showAuth('unlock'); };
  $('#wipeBtn').onclick = () => { if (confirm(u('wipe') + '?')) { endSession(); Vault.wipe(); closeSheet(); showAuth('create'); } };
}

// ---------- UI wiring ----------
let uiWired = false;
function wireUi() {
  if (uiWired) return; uiWired = true;
  $('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.t === 'voice') { toggleVoice(); return; } tab = b.dataset.t; renderAll(); $('#views').scrollTo(0, 0); };
  $('#views').onclick = (e) => {
    const go = e.target.closest('[data-go]'); if (go) { const [t, s] = go.dataset.go.split(':'); tab = t; seg = s; renderAll(); return; }
    const sg = e.target.closest('[data-seg]'); if (sg) { seg = sg.dataset.seg; renderKhata(); return; }
    const pt = e.target.closest('[data-party]'); if (pt) { partySheet(pt.dataset.party); return; }
    const del = e.target.closest('[data-del]'); if (del) { removeRec(del.dataset.del, !!del.dataset.sale); }
  };
  $('#langBtn').onclick = () => { const ks = Object.keys(LANGS); lang = ks[(ks.indexOf(lang) + 1) % ks.length]; state.profile.lang = lang; ledger.commit(); renderAll(); voice.interrupt(); if (!$('#coach').hidden) showCoach(); };
  $('#menuBtn').onclick = settingsSheet;
  $('#suggest').onclick = (e) => { const b = e.target.closest('button'); if (b) { hideCoach(); onHeard({ w: examples()[+b.dataset.i].say, d: '', endSpeechAt: performance.now(), typed: true }); } };
  $('#orb').onclick = onOrb;
  $('#kbBtn').onclick = () => { const r = $('#typeRow'); r.hidden = !r.hidden; if (!r.hidden) $('#typeIn').focus(); };
  $('#typeRow').onsubmit = (e) => { e.preventDefault(); const v = $('#typeIn').value.trim(); if (v) { $('#typeIn').value = ''; onHeard({ w: v, d: '', endSpeechAt: performance.now(), typed: true }); } };
  $('#eodBtn').onclick = async () => { await startSession(); const r = agent.dayEnd(); showReply(r); speak(r.say); };
  window.addEventListener('offline', () => toast(u('offline')));
}

/** The voice agent lives behind the centre mic of the nav bar: hidden until asked for, fully stopped when closed. */
function openVoice() { const p = $('#voicePanel'); if (p.hidden) { p.hidden = false; $('.mic-tab').setAttribute('aria-pressed', 'true'); } }
function toggleVoice() {
  const p = $('#voicePanel');
  if (p.hidden) { openVoice(); return; }
  endSession(); p.hidden = true; $('.mic-tab').setAttribute('aria-pressed', 'false');
  $('#heard').textContent = ''; $('#said').textContent = ''; $('#cards').innerHTML = ''; $('#chip').hidden = true; $('#typeRow').hidden = true;
}

function removeRec(id, isSale) {
  if (isSale) { ledger.s.sales = ledger.s.sales.filter((x) => x.id !== id); ledger.commit(); } else ledger.removeEntry(id);
  renderAll();
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200); }

// ---------- voice session ----------
let lastErrToast = 0, sessionOpen = false, lastGreet = 0, idleT, convoUntil = 0, chain = Promise.resolve();

const ISLAND = { en: { idle: '', listening: 'Listening', thinking: 'Understanding', speaking: 'Speaking' }, hi: { idle: '', listening: 'सुन रहा हूँ', thinking: 'समझ रहा हूँ', speaking: 'बोल रहा हूँ' } };
function wireVoice() {
  voice.on('state', (st) => {
    $('#dock').dataset.state = st; $('#hint').textContent = u(U.hint[st] || U.hint.idle);
    const isl = $('#island'); isl.dataset.s = st; $('#islandTxt').textContent = (ISLAND[lang] || ISLAND.en)[st] || (lang === 'hi' ? 'वॉइस खाता' : 'Voice Khata');
    viz.set(st); insight.state(st);
  })
    .on('level', (r) => { $('#dock').style.setProperty('--lvl', voice.state === 'listening' ? Math.min(1, r * 9).toFixed(2) : 0); viz.push(r); if (voice.state === 'listening') insight.level(r); })
    .on('heard', (h) => { chain = chain.then(() => onHeard(h)).catch(console.error); })
    .on('ttfa', (ms) => { const c = $('#chip'); c.textContent = `⚡ ${(ms / 1000).toFixed(1)}s`; c.hidden = false; insight.spoken(ms); })
    .on('barge', () => toast(u('barge')))
    .on('error', (m) => { console.warn('voice error', m); if (Date.now() - lastErrToast > 8000) { lastErrToast = Date.now(); toast(S.netErr[lang]); } });
}

async function onOrb() {
  hideCoach();
  if (voice.state === 'speaking') { voice.interrupt(); armIdle(10000); return; }
  if (sessionOpen) { endSession(); return; }
  await startSession();
}

async function startSession(silent) {
  try { await voice.start(); } catch (e) { toast(u('micDenied')); return false; }
  sessionOpen = true;
  const needGreet = Date.now() - lastGreet > 30 * 60 * 1000;
  if (needGreet && !silent) { lastGreet = Date.now(); const g = agent.greeting(); $('#said').textContent = g.say; await voice.speak(g.say); }
  const today = new Date().toDateString();
  if (new Date().getHours() >= 19 && ledger.openFollowups().length && state.profile.nudged !== today) { // "as promised, I'm back"
    state.profile.nudged = today; ledger.commit();
    const r = agent.dayEnd(true); showReply(r); await speak(r.say);
  }
  convoUntil = Date.now() + 15000; armIdle(14000);
  return true;
}
function endSession() { clearTimeout(idleT); sessionOpen = false; handsFree = false; agent && agent.expirePending(); voice.stop(); $('#heard').textContent = ''; }
function armIdle(ms) { clearTimeout(idleT); if (handsFree) return; idleT = setTimeout(() => { if (voice.state !== 'speaking') endSession(); else armIdle(5000); }, ms); }

async function onHeard({ w, d, endSpeechAt, typed, sttMs }) {
  if (typed) openVoice();
  if (handsFree && !typed && Date.now() > convoUntil && !agent.pending) {
    if (!hasWake(w)) return; // not addressed to us: ignored and never stored
    w = stripWake(w); d = '';
    if (!w) { await speak({ hi: 'जी, बोलिए।', ta: 'சொல்லுங்கள்.', kn: 'ಹೇಳಿ.', en: 'Yes, go ahead.' }[lang]); return; }
  }
  $('#heard').textContent = `“${lang === 'hi' && d && !typed ? d : (w || d)}”`;
  const r = agent.handle({ w, d });
  if (!r) { voice.setState(voice.wantListen ? 'listening' : 'idle'); return; }
  if (r.kind === 'unknown' && (w || d).trim().split(/\s+/).length < 2) { voice.setState(voice.wantListen ? 'listening' : 'idle'); return; } // noise: stay quiet
  insight.turn({ w, d, sttMs, say: r.say, ...traceInfo(r) });
  showReply(r);
  renderAll();
  convoUntil = Date.now() + 15000;
  await speak(r.say, endSpeechAt);
  armIdle(agent.pending ? 20000 : r.more ? 10000 : 8000);
}

function speak(text, t0) { $('#said').textContent = text; return voice.speak(text, 'auto', t0); }

let cardT;
function showReply(r) {
  openVoice();
  $('#said').textContent = r.say;
  const box = $('#cards'); box.innerHTML = '';
  for (const c of r.cards || []) {
    const el = document.createElement('div'); el.className = 'card';
    const k = u(U.kinds[c.kind] || U.kinds.credit);
    el.innerHTML = `<span class="kind ${c.kind}">${esc(k)}</span><span class="main"><b>${esc(c.party)}</b><small class="num">${c.kind === 'stock' ? `${c.amount} · ${esc(c.note || '')}` : `${money(c.amount)}${esc(c.note || '')}`}</small></span>${c.kind === 'stock' ? '' : `<button class="undo">${esc(u('undo'))}</button>`}`;
    const ub = $('.undo', el); if (ub) ub.onclick = () => { c.kind === 'sale' ? removeRec(c.id, true) : ledger.removeEntry(c.id); el.remove(); renderAll(); };
    box.appendChild(el);
  }
  if (r.reminder) {
    const el = document.createElement('div'); el.className = 'card reminder';
    const wa = r.reminder.phone ? `https://wa.me/${r.reminder.phone.replace(/\D/g, '')}?text=${encodeURIComponent(r.reminder.text)}` : '';
    el.innerHTML = `<b>${esc(r.reminder.name)}</b><p>${esc(r.reminder.text)}</p><div class="acts"><button class="btn small" id="cp">${esc(u('copy'))}</button>${wa ? `<a class="btn small primary" href="${wa}" target="_blank" rel="noopener">${esc(u('wa'))}</a>` : ''}</div>`;
    box.appendChild(el); $('#cp', el).onclick = () => { navigator.clipboard?.writeText(r.reminder.text); toast('✓'); };
  }
  clearTimeout(cardT); if (box.children.length) cardT = setTimeout(() => { box.innerHTML = ''; }, 14000);
}

// ---------- start ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
const obRoot = $('#onboard');
function intro(after) { obRoot.hidden = false; authEl.hidden = true; runOnboarding(obRoot, { lang, setLang: (l) => { lang = l; applyLang(); }, onDone: (l) => { lang = l; obRoot.hidden = true; try { localStorage.setItem('vk_seen', '1'); } catch { /* ignore */ } after(); } }); }
let seen = false; try { seen = !!localStorage.getItem('vk_seen'); } catch { /* ignore */ }
$('#story').onclick = (e) => { if (e.target.closest('#replayBtn')) intro(() => { if (Vault.profile() && !state) showAuth('unlock'); }); };
applyLang();
if (Vault.profile()) showAuth('unlock'); else if (seen) showAuth('create'); else intro(() => showAuth('create'));

// ---- desktop: scale the phone to fit the window; live clock in the status bar ----
function fit() { const w = document.querySelector('.phone-wrap'); w.style.transform = innerWidth < 900 ? '' : `scale(${Math.min(1, (innerHeight - 20) / 824).toFixed(3)})`; }
addEventListener('resize', fit); fit();
const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); }; tick(); setInterval(tick, 30000);
