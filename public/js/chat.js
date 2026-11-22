// Conversational common sense: small talk, "are you in a rush?", parked follow-up questions, day-end catch-up.
// Rules only (no LLM): instant, free, and it can never invent a ledger amount.
import { tokenize } from './nlu/parse.js';
import { nk } from './nlu/numbers.js';

const t = (en, hi, ta, kn) => ({ en, hi, ta, kn });
const P = (o) => (l) => o[l];

export const C = {
  greet: (l, n) => t(`Namaste ${n}! How is business today?`, `नमस्ते ${n} जी! आज धंधा कैसा चल रहा है?`, `வணக்கம் ${n}! இன்று வியாபாரம் எப்படி?`, `ನಮಸ್ಕಾರ ${n}! ಇಂದು ವ್ಯಾಪಾರ ಹೇಗಿದೆ?`)[l],
  how: P(t("I'm doing well, thank you for asking! Tell me what to note, or how your day is going.", 'मैं ठीक हूँ, पूछने के लिए शुक्रिया! बताइए क्या लिखना है, या दिन कैसा रहा?', 'நான் நலமாக இருக்கிறேன், கேட்டதற்கு நன்றி! என்ன எழுத வேண்டும் அல்லது நாள் எப்படி போகிறது என்று சொல்லுங்கள்.', 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಕೇಳಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ! ಏನು ಬರೆಯಬೇಕು ಅಥವಾ ದಿನ ಹೇಗಿದೆ ಹೇಳಿ.')),
  thanks: P(t("You're welcome! I'm here whenever you need me.", 'आपका स्वागत है! जब ज़रूरत हो, मैं यहीं हूँ।', 'பரவாயில்லை! தேவைப்படும்போது நான் இங்கே இருக்கிறேன்.', 'ಪರವಾಗಿಲ್ಲ! ಬೇಕಾದಾಗ ನಾನು ಇಲ್ಲೇ ಇದ್ದೇನೆ.')),
  who: P(t("I'm Voice Khata, an AI assistant for your shop. I note udhaar and payments, track suppliers and stock, and answer by voice.", 'मैं वॉइस खाता हूँ, आपकी दुकान का एआई असिस्टेंट। मैं उधार और जमा लिखता हूँ, सप्लायर और स्टॉक देखता हूँ, और बोलकर जवाब देता हूँ।', 'நான் வாய்ஸ் கணக்கு, உங்கள் கடைக்கான ஏஐ உதவியாளர். கடன், வரவு, சப்ளையர், இருப்பு எல்லாம் குறித்து குரலில் பதில் சொல்கிறேன்.', 'ನಾನು ವಾಯ್ಸ್ ಖಾತಾ, ನಿಮ್ಮ ಅಂಗಡಿಯ ಎಐ ಸಹಾಯಕ. ಸಾಲ, ಜಮೆ, ಸರಬರಾಜುದಾರ, ದಾಸ್ತಾನು ಬರೆದು ಧ್ವನಿಯಲ್ಲಿ ಉತ್ತರಿಸುತ್ತೇನೆ.')),
  bye: P(t('Okay, take care! I will be right here.', 'ठीक है, ध्यान रखिए! मैं यहीं हूँ।', 'சரி, கவனமாக இருங்கள்! நான் இங்கேயே இருக்கிறேன்.', 'ಸರಿ, ಜಾಗರೂಕರಾಗಿರಿ! ನಾನು ಇಲ್ಲೇ ಇರುತ್ತೇನೆ.')),
  slow: P(t("I understand, some days are slow. Want to see who still owes you? A few collections can help today.", 'समझ सकता हूँ, कभी-कभी धंधा धीमा होता है। चाहें तो देखें किससे पैसे लेने बाकी हैं।', 'புரிகிறது, சில நாட்கள் மெதுவாக இருக்கும். யாரிடம் பாக்கி வர வேண்டும் என்று பார்க்கலாமா?', 'ಅರ್ಥವಾಗುತ್ತದೆ, ಕೆಲವು ದಿನ ನಿಧಾನ. ಯಾರಿಂದ ಬಾಕಿ ಬರಬೇಕು ನೋಡೋಣವೇ?')),
  good: P(t("That's great to hear! Keep it going.", 'बहुत बढ़िया! ऐसे ही चलता रहे।', 'மிக நன்று! இப்படியே தொடரட்டும்.', 'ತುಂಬಾ ಒಳ್ಳೆಯದು! ಹೀಗೇ ಮುಂದುವರಿಯಲಿ.')),
  tired: P(t("You've worked hard today. Take a short break — I'll keep the khata.", 'आपने आज बहुत मेहनत की। थोड़ा आराम कर लीजिए — खाता मैं संभालता हूँ।', 'இன்று நிறைய உழைத்தீர்கள். சிறிது ஓய்வெடுங்கள் — கணக்கை நான் பார்த்துக்கொள்கிறேன்.', 'ಇಂದು ತುಂಬಾ ದುಡಿದಿದ್ದೀರಿ. ಸ್ವಲ್ಪ ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ — ಖಾತೆ ನಾನು ನೋಡಿಕೊಳ್ಳುತ್ತೇನೆ.')),
  sorry: P(t('No problem at all.', 'कोई बात नहीं।', 'பரவாயில்லை.', 'ಪರವಾಗಿಲ್ಲ.')),
  time: (l, tm) => t(`It is ${tm}.`, `अभी ${tm} बजे हैं।`, `இப்போது நேரம் ${tm}.`, `ಈಗ ಸಮಯ ${tm}.`)[l],
  rush: P(t("Okay, I'll keep it short and ask my questions at the end of the day.", 'ठीक है, मैं छोटा रखूँगा। सवाल दिन के अंत में पूछूँगा।', 'சரி, சுருக்கமாக வைத்துக்கொள்கிறேன். கேள்விகளை நாளின் இறுதியில் கேட்கிறேன்.', 'ಸರಿ, ಚಿಕ್ಕದಾಗಿ ಇಡುತ್ತೇನೆ. ಪ್ರಶ್ನೆಗಳನ್ನು ದಿನದ ಕೊನೆಯಲ್ಲಿ ಕೇಳುತ್ತೇನೆ.')),
  free: P(t("Great! Then tell me — what's next?", 'बढ़िया! तो बताइए, आगे क्या?', 'நன்று! அடுத்து என்ன?', 'ಒಳ್ಳೆಯದು! ಮುಂದೆ ಏನು?')),
  offTopic: P(t("I can only help with your khata, sales, suppliers and stock. Try an udhaar, a payment, or ask for today's total.", 'मैं सिर्फ़ आपके खाते, बिक्री, सप्लायर और स्टॉक में मदद कर सकता हूँ। उधार, जमा बोलिए या आज का टोटल पूछिए।', 'கணக்கு, விற்பனை, சப்ளையர், இருப்பு பற்றி மட்டுமே உதவ முடியும். கடன், வரவு சொல்லுங்கள் அல்லது இன்றைய மொத்தம் கேளுங்கள்.', 'ಖಾತೆ, ಮಾರಾಟ, ಸರಬರಾಜುದಾರ, ದಾಸ್ತಾನು ಬಗ್ಗೆ ಮಾತ್ರ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಸಾಲ, ಜಮೆ ಹೇಳಿ ಅಥವಾ ಇಂದಿನ ಒಟ್ಟು ಕೇಳಿ.')),
  // --- the rush / follow-up loop ---
  rushAsk: (l, n) => t(`Are you in a rush${n ? ', ' + n : ''}?`, `${n ? n + ' जी, ' : ''}आप जल्दी में हैं?`, `${n ? n + ', ' : ''}அவசரமா இருக்கீங்களா?`, `${n ? n + ', ' : ''}ಅವಸರದಲ್ಲಿದ್ದೀರಾ?`)[l],
  parked: P(t("No problem. I'll ask you at the end of the day.", 'कोई बात नहीं। मैं दिन के अंत में पूछूँगा।', 'பரவாயில்லை. நாளின் இறுதியில் கேட்கிறேன்.', 'ಪರವಾಗಿಲ್ಲ. ದಿನದ ಕೊನೆಯಲ್ಲಿ ಕೇಳುತ್ತೇನೆ.')),
  detail: (l, kind, p) => ({
    credit: t(`What did ${p} take?`, `${p} ने क्या लिया था?`, `${p} என்ன வாங்கினார்?`, `${p} ಏನು ತೆಗೆದುಕೊಂಡರು?`),
    payment: t(`Did ${p} pay by cash or UPI?`, `${p} ने कैश दिया या यूपीआई?`, `${p} ரொக்கமா அல்லது யூபிஐயா?`, `${p} ನಗದೋ ಯುಪಿಐಯೋ?`),
    purchase: t(`What goods came from ${p}?`, `${p} से क्या माल आया?`, `${p} இடமிருந்து என்ன சரக்கு வந்தது?`, `${p} ಅವರಿಂದ ಯಾವ ಸರಕು ಬಂತು?`),
    supplier_payment: t(`What was the payment to ${p} for?`, `${p} को किस चीज़ का पेमेंट था?`, `${p} க்கு எதற்கான பணம்?`, `${p} ಅವರಿಗೆ ಯಾವುದರ ಹಣ?`),
  }[kind] || t(`What happened with ${p}?`, `${p} के साथ क्या हुआ?`, `${p} உடன் என்ன நடந்தது?`, `${p} ಜೊತೆ ಏನಾಯಿತು?`))[l],
  noted: (l, n) => t(`Noted: ${n}.`, `नोट किया: ${n}।`, `குறித்தேன்: ${n}.`, `ಗುರುತಿಸಿದೆ: ${n}.`)[l],
  skipped: P(t('Okay, skipping that.', 'ठीक है, छोड़ देते हैं।', 'சரி, விடுகிறேன்.', 'ಸರಿ, ಬಿಡೋಣ.')),
  snoozed: P(t("Okay, I'll ask again later.", 'ठीक है, बाद में पूछूँगा।', 'சரி, பிறகு கேட்கிறேன்.', 'ಸರಿ, ನಂತರ ಕೇಳುತ್ತೇನೆ.')),
  back: P(t("As promised, I'm back with the questions I kept for the end of the day.", 'वादे के मुताबिक मैं दिन के अंत के सवाल लेकर आया हूँ।', 'சொன்னபடி, நாளின் இறுதிக்கு வைத்த கேள்விகளுடன் வந்துவிட்டேன்.', 'ಹೇಳಿದಂತೆ, ದಿನದ ಕೊನೆಗೆ ಇಟ್ಟಿದ್ದ ಪ್ರಶ್ನೆಗಳೊಂದಿಗೆ ಬಂದಿದ್ದೇನೆ.')),
  about: (l, p, a) => t(`About ${p}'s ${a} rupees —`, `${p} के ${a} रुपये के बारे में —`, `${p} ${a} ரூபாய் பற்றி —`, `${p} ಅವರ ${a} ರೂಪಾಯಿ ಬಗ್ಗೆ —`)[l],
  held: (l, n) => t(`${n} question${n > 1 ? 's' : ''} on hold for the end of the day`, `${n} सवाल दिन के अंत के लिए रुके हैं`, `${n} கேள்விகள் நாளின் இறுதிக்கு காத்திருக்கின்றன`, `${n} ಪ್ರಶ್ನೆಗಳು ದಿನದ ಕೊನೆಗೆ ಕಾಯುತ್ತಿವೆ`)[l],
};

const HAS = (toks, ...w) => w.some((x) => toks.includes(nk(x)));

/** Small-talk intent for short, number-free utterances, else null. */
export function chatIntent(text) {
  if (/\d/.test(text)) return null;
  const toks = tokenize(text).map((x) => nk(x.t));
  if (!toks.length || toks.length > 9) return null;
  const h = (...w) => HAS(toks, ...w);
  if (h('thanks', 'thank', 'shukriya', 'dhanyavad', 'dhanyavaad', 'nandri', 'dhanyavadagalu', 'dhanyavadgalu')) return 'thanks';
  if (h('namaste', 'namaskar', 'namaskara', 'hello', 'hi', 'hey', 'vanakkam', 'salaam') && toks.length <= 4) return 'greet';
  if (h('kaise', 'kaisa', 'kese', 'eppadi', 'hegiddira', 'hegiddiri') || (h('how') && h('you'))) return 'how';
  if ((h('tum', 'aap', 'you', 'nee', 'neenu') && h('kaun', 'who', 'yaar', 'yaru', 'yaaru')) || (h('your') && h('name')) || (h('tumhara', 'aapka') && h('naam'))) return 'who';
  if (h('bye', 'alvida', 'chalta', 'chalti') && toks.length <= 5) return 'bye';
  if (h('dhanda', 'business', 'bikri', 'sale', 'vyapar', 'vyapaaram') && h('slow', 'kam', 'mandham', 'mandam', 'dull', 'kharab')) return 'slow';
  if (h('dhanda', 'business', 'vyapar', 'vyapaaram') && h('badhiya', 'achha', 'accha', 'good', 'zabardast', 'mast', 'nalla', 'chennagide')) return 'good';
  if (h('thak', 'thaka', 'thaki', 'tired', 'thakaan')) return 'tired';
  if (h('sorry', 'maaf', 'kshama')) return 'sorry';
  if (h('time', 'samay', 'baje', 'neram', 'samaya') && h('kya', 'what', 'enna', 'eshtu')) return 'time';
  if (h('jaldi', 'busy', 'rush', 'avasaram', 'avasara') && toks.length <= 6) return 'rush';
  if (h('free', 'fursat', 'araam', 'relax') && toks.length <= 6) return 'free';
  return null;
}

/** Answer to "are you in a rush?" -> 'yes' | 'no' | null */
export function rushAnswer(text) {
  const toks = tokenize(text).map((x) => nk(x.t));
  const neg = HAS(toks, 'nahi', 'nahin', 'no', 'illa', 'illai', 'alla', 'na');
  const now = HAS(toks, 'abhi', 'now');
  if (neg && now) return 'yes'; // "abhi nahi" = not now
  if (HAS(toks, 'fursat', 'free', 'araam', 'time', 'samay') || neg) return 'no';
  if (HAS(toks, 'jaldi', 'busy', 'rush', 'haan', 'han', 'ji', 'yes', 'yeah', 'ha', 'ama', 'aam', 'houdu', 'haudu', 'avasaram', 'avasara', 'baad', 'later', 'ok', 'okay')) return 'yes';
  return null;
}
export const isSkip = (text) => {
  const toks = tokenize(text).map((x) => nk(x.t));
  return HAS(toks, 'skip', 'chhodo', 'chodo', 'bhool', 'bhulo', 'forget', 'vendam', 'bidi', 'bidu', 'gottilla', 'gothilla', 'pata') ||
    (HAS(toks, 'nahi', 'no', 'illa', 'alla') && HAS(toks, 'kuch', 'yaad', 'nothing', 'ethuvum') && toks.length <= 4);
};
export const isLater = (text) => HAS(tokenize(text).map((x) => nk(x.t)), 'baad', 'later', 'abhi', 'nalaiku', 'naale');
