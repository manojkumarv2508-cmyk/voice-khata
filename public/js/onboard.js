// First-run flow: language -> 4 animated slides -> microphone permission -> (sign-up handled by app.js) -> coach mark on the orb.
const LN = { hi: 'हिन्दी', en: 'English', ta: 'தமிழ்', kn: 'ಕನ್ನಡ' };
const SUB = { hi: 'Hindi', en: 'English', ta: 'Tamil', kn: 'Kannada' };
export const OB = {
  en: { pick: 'Choose your language', pickB: 'You can change it any time.', next: 'Next', skip: 'Skip', go: 'Continue',
    s: [['Just speak.', "Say an entry the way you'd tell a friend. The khata writes itself — no typing."], ['Your language, your way.', 'Hindi, Tamil, Kannada or English — even mixed in one sentence.'],
      ['Every rupee exact.', '“Teen sau chaalis”, “340”, “three-forty” — all become ₹340. Say “nahi, 430” to fix it.'], ['Yours alone.', "Your khata stays encrypted on this phone. Nothing is recorded. I'm an AI, and I'll always say so."]],
    mic: ['Allow the microphone', 'Voice Khata listens only after you tap the mic.', 'Allow microphone', 'Maybe later'], coach: 'Tap the mic and say: “Suresh ka 200 udhaar”',
    pts: ['Encrypted on this phone', 'No recordings stored', 'Reminders only if they agree', 'Always says it is an AI'] },
  hi: { pick: 'अपनी भाषा चुनें', pickB: 'आप इसे कभी भी बदल सकते हैं।', next: 'आगे', skip: 'छोड़ें', go: 'जारी रखें',
    s: [['बस बोलिए।', 'दोस्त को बताने जैसे एंट्री बोलिए। खाता अपने आप लिख जाएगा — टाइपिंग नहीं।'], ['आपकी भाषा, आपका तरीका।', 'हिन्दी, तमिल, कन्नड़ या English — एक ही वाक्य में मिलाकर भी।'],
      ['हर रुपया सटीक।', '“तीन सौ चालीस”, “340”, “three-forty” — सब ₹340 बनते हैं। सुधारने के लिए बोलिए “नहीं, 430”।'], ['सिर्फ़ आपका।', 'आपका खाता इस फ़ोन में एन्क्रिप्टेड रहता है। कुछ रिकॉर्ड नहीं होता। मैं एक एआई हूँ और हमेशा बताऊँगा।']],
    mic: ['माइक की अनुमति दें', 'वॉइस खाता तभी सुनता है जब आप माइक दबाते हैं।', 'माइक चालू करें', 'बाद में'], coach: 'माइक दबाकर बोलिए: “सुरेश का 200 उधार”',
    pts: ['इस फ़ोन में एन्क्रिप्टेड', 'कोई रिकॉर्डिंग नहीं', 'रिमाइंडर सिर्फ़ सहमति पर', 'हमेशा बताता है कि एआई है'] },
  ta: { pick: 'உங்கள் மொழியைத் தேர்ந்தெடுங்கள்', pickB: 'எப்போது வேண்டுமானாலும் மாற்றலாம்.', next: 'அடுத்து', skip: 'தவிர்', go: 'தொடர்',
    s: [['பேசுங்கள் போதும்.', 'நண்பரிடம் சொல்வது போல் பதிவைச் சொல்லுங்கள். கணக்கு தானாக எழுதப்படும் — தட்டச்சு இல்லை.'], ['உங்கள் மொழி, உங்கள் பாணி.', 'இந்தி, தமிழ், கன்னடம் அல்லது ஆங்கிலம் — ஒரே வாக்கியத்தில் கலந்தும்.'],
      ['ஒவ்வொரு ரூபாயும் சரியாக.', '“முந்நூற்று நாற்பது”, “340”, “three-forty” — எல்லாம் ₹340. திருத்த “இல்ல, 430” என்று சொல்லுங்கள்.'], ['உங்களுக்கு மட்டும்.', 'உங்கள் கணக்கு இந்த போனில் குறியாக்கத்துடன் இருக்கும். எதுவும் பதிவு செய்யப்படாது. நான் ஒரு ஏஐ, எப்போதும் சொல்வேன்.']],
    mic: ['மைக் அனுமதி', 'நீங்கள் மைக்கைத் தட்டும்போது மட்டுமே கேட்கும்.', 'மைக்கை அனுமதி', 'பிறகு'], coach: 'மைக்கைத் தட்டி சொல்லுங்கள்: “சுரேஷ் 200 கடன்”',
    pts: ['இந்த போனில் குறியாக்கம்', 'பதிவுகள் இல்லை', 'சம்மதித்தால் மட்டுமே நினைவூட்டல்', 'எப்போதும் ஏஐ என்று சொல்லும்'] },
  kn: { pick: 'ನಿಮ್ಮ ಭಾಷೆ ಆರಿಸಿ', pickB: 'ಯಾವಾಗ ಬೇಕಾದರೂ ಬದಲಾಯಿಸಬಹುದು.', next: 'ಮುಂದೆ', skip: 'ಬಿಡಿ', go: 'ಮುಂದುವರಿಸಿ',
    s: [['ಮಾತನಾಡಿದರೆ ಸಾಕು.', 'ಸ್ನೇಹಿತರಿಗೆ ಹೇಳಿದಂತೆ ದಾಖಲೆ ಹೇಳಿ. ಖಾತೆ ತಾನಾಗಿ ಬರೆಯುತ್ತದೆ — ಟೈಪಿಂಗ್ ಇಲ್ಲ.'], ['ನಿಮ್ಮ ಭಾಷೆ, ನಿಮ್ಮ ರೀತಿ.', 'ಹಿಂದಿ, ತಮಿಳು, ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್ — ಒಂದೇ ವಾಕ್ಯದಲ್ಲಿ ಬೆರೆಸಿಯೂ.'],
      ['ಪ್ರತಿ ರೂಪಾಯಿ ನಿಖರ.', '“ಮುನ್ನೂರ ನಲವತ್ತು”, “340”, “three-forty” — ಎಲ್ಲವೂ ₹340. ಸರಿಪಡಿಸಲು “ಅಲ್ಲ, 430” ಎನ್ನಿ.'], ['ನಿಮಗೆ ಮಾತ್ರ.', 'ನಿಮ್ಮ ಖಾತೆ ಈ ಫೋನ್‌ನಲ್ಲೇ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿರುತ್ತದೆ. ಏನೂ ರೆಕಾರ್ಡ್ ಆಗುವುದಿಲ್ಲ. ನಾನು ಎಐ, ಯಾವಾಗಲೂ ಹೇಳುತ್ತೇನೆ.']],
    mic: ['ಮೈಕ್ ಅನುಮತಿ', 'ನೀವು ಮೈಕ್ ಒತ್ತಿದಾಗ ಮಾತ್ರ ಕೇಳುತ್ತದೆ.', 'ಮೈಕ್ ಅನುಮತಿಸಿ', 'ನಂತರ'], coach: 'ಮೈಕ್ ಒತ್ತಿ ಹೇಳಿ: “ಸುರೇಶ್ 200 ಸಾಲ”',
    pts: ['ಈ ಫೋನ್‌ನಲ್ಲೇ ಎನ್‌ಕ್ರಿಪ್ಟ್', 'ರೆಕಾರ್ಡಿಂಗ್ ಇಲ್ಲ', 'ಒಪ್ಪಿದರೆ ಮಾತ್ರ ನೆನಪೋಲೆ', 'ಯಾವಾಗಲೂ ಎಐ ಎಂದು ಹೇಳುತ್ತದೆ'] },
};
const MIC = '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const VIS = [
  `<div class="v1"><div class="sphere"><div class="wv">${'<i></i>'.repeat(9)}</div></div><div class="bub"><span>Ramesh ka 340 udhaar</span></div><div class="res">Ramesh <small>udhaar</small> ₹340</div></div>`,
  `<div class="v2"><span class="w">नमस्ते</span><span class="w">வணக்கம்</span><span class="w">ನಮಸ್ಕಾರ</span><span class="w">Hello</span><span class="mix">Ramesh ka 340 udhaar — mix freely</span></div>`,
  `<div class="v3"><div class="pair"><span class="a">teen sau chaalis</span><span class="arr">→</span><span class="b">₹340</span></div><div class="pair"><span class="a">three-forty</span><span class="arr">→</span><span class="b">₹340</span></div><div class="pair"><span class="a">dedh sau</span><span class="arr">→</span><span class="b">₹150</span></div><div class="fix"><s>₹340</s><em>₹430</em></div><div class="say">“nahi, 430”</div></div>`,
  (t) => `<div class="v4"><div class="lock">${LOCK}</div><ul>${t.pts.map((p) => `<li>${p}</li>`).join('')}</ul></div>`,
  `<div class="v5"><div class="m">${MIC}</div></div>`,
];

/** Runs the intro inside `root`. onDone() is called after the mic step (or skip). */
export function runOnboarding(root, { lang, setLang, onDone }) {
  let step = 0; // 0 = language, 1..4 = slides, 5 = mic
  const t = () => OB[lang];
  const dots = (n) => `<div class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${i === n ? 'on' : ''}"></i>`).join('')}</div>`;
  const render = () => {
    const T = t();
    if (step === 0) {
      root.innerHTML = `<div class="ob"><div class="ob-top"><span></span><span></span></div><div class="ob-vis"><div class="v5"><div class="m">${MIC}</div></div></div>
        <h2 class="ob-t">${T.pick}</h2><p class="ob-b">${T.pickB}</p>
        <div class="langgrid">${Object.keys(LN).map((k, i) => `<button data-l="${k}" style="animation-delay:${i * 70}ms">${LN[k]}<small>${SUB[k]}</small></button>`).join('')}</div><div class="ob-sp"></div></div>`;
      root.querySelector('.langgrid').onclick = (e) => { const b = e.target.closest('button'); if (b) { lang = b.dataset.l; setLang(lang); step = 1; render(); } };
    } else {
      const slide = step <= 4, i = step - 1;
      const vis = slide ? (typeof VIS[i] === 'function' ? VIS[i](T) : VIS[i]) : VIS[4];
      const [title, body] = slide ? T.s[i] : T.mic;
      const mic = !slide;
      root.innerHTML = `<div class="ob"><div class="ob-top">${dots(step)}<button class="ob-skip" id="obSkip">${mic ? '' : T.skip}</button></div>
        <div class="ob-vis">${vis}</div><h2 class="ob-t">${title}</h2><p class="ob-b">${body}</p><div class="ob-sp"></div>
        <div class="ob-cta"><button class="btn primary" id="obNext">${mic ? T.mic[2] : T.next}</button>${mic ? `<button class="link" id="obLater">${T.mic[3]}</button>` : ''}</div></div>`;
      const finish = () => onDone(lang);
      root.querySelector('#obSkip').onclick = () => { step = 5; render(); };
      root.querySelector('#obNext').onclick = async () => {
        if (!mic) { step++; render(); return; }
        try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((x) => x.stop()); } catch { /* user can still allow it later */ }
        finish();
      };
      const later = root.querySelector('#obLater'); if (later) later.onclick = finish;
    }
  };
  render();
}
