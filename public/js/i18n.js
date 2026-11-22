// Spoken + on-screen strings in Hindi, English and Tamil. TTS receives digits; the Gnani
// text-normaliser turns "340 रुपये" into natural speech, so we never hand-spell numbers.
export const LANGS = { hi: { label: 'हिन्दी', short: 'हि', bcp: 'hi-IN' }, en: { label: 'English', short: 'EN', bcp: 'en-IN' } };

const L = (hi, en, ta) => ({ hi, en, ta });
const fmt = (n) => Number(n).toLocaleString('en-IN');

const BASE = {
  disclosure: L(
    'नमस्ते! मैं एक एआई असिस्टेंट हूँ, आपकी वॉइस खाता। बोलिए, क्या लिखना है?',
    'Namaste! I am an AI assistant, your Voice Khata. Tell me what to note.',
    'வணக்கம்! நான் ஒரு ஏஐ உதவியாளர், உங்கள் வாய்ஸ் கணக்கு. என்ன எழுத வேண்டும் என்று சொல்லுங்கள்.'),
  more: L(' और कुछ?', ' Anything else?', ' வேறு ஏதாவது?'),
  credit: (l, n, a, t) => L(`${n}, ${a} रुपये उधार लिखा। कुल ${t} रुपये।`, `${n}, ${a} rupees udhaar noted. Total ${t} rupees.`, `${n}, ${a} ரூபாய் கடன் எழுதினேன். மொத்தம் ${t} ரூபாய்.`)[l],
  payment: (l, n, a, t) => L(`${n} से ${a} रुपये जमा।${t > 0 ? ` अब ${t} रुपये बाकी।` : ' अब कुछ बाकी नहीं।'}`,
    `${a} rupees received from ${n}.${t > 0 ? ` ${t} rupees still due.` : ' Nothing due now.'}`,
    `${n} இடமிருந்து ${a} ரூபாய் வரவு.${t > 0 ? ` இன்னும் ${t} ரூபாய் பாக்கி.` : ' இனி பாக்கி இல்லை.'}`)[l],
  purchase: (l, n, a, t) => L(`${n} से ${a} रुपये का माल लिखा। उन्हें कुल ${t} रुपये देने हैं।`, `${a} rupees of goods from ${n} noted. You owe them ${t} rupees.`,
    `${n} இடமிருந்து ${a} ரூபாய் சரக்கு எழுதினேன். அவர்களுக்கு மொத்தம் ${t} ரூபாய் கொடுக்க வேண்டும்.`)[l],
  supplierPay: (l, n, a, t) => L(`${n} को ${a} रुपये दिए।${t > 0 ? ` ${t} रुपये देने बाकी हैं।` : ' अब कुछ देना बाकी नहीं।'}`,
    `Paid ${a} rupees to ${n}.${t > 0 ? ` ${t} rupees still to pay.` : ' Nothing left to pay.'}`,
    `${n} க்கு ${a} ரூபாய் கொடுத்தேன்.${t > 0 ? ` இன்னும் ${t} ரூபாய் கொடுக்க வேண்டும்.` : ' இனி கொடுக்க வேண்டியது இல்லை.'}`)[l],
  sale: (l, a, tot) => L(`${a} रुपये की बिक्री जोड़ी। आज कुल ${tot} रुपये।`, `Added ${a} rupees sale. Today ${tot} rupees.`, `${a} ரூபாய் விற்பனை சேர்த்தேன். இன்று மொத்தம் ${tot} ரூபாய்.`)[l],
  askWhich: (l, first, a, b) => L(`कौन सा ${first}? ${a} या ${b}?`, `Which ${first}? ${a} or ${b}?`, `எந்த ${first}? ${a} அல்லது ${b}?`)[l],
  askNew: (l, n, type) => L(`${n} नया ${type === 'supplier' ? 'सप्लायर' : 'ग्राहक'} है? हाँ या नहीं?`, `Is ${n} a new ${type}? Yes or no?`, `${n} புதிய ${type === 'supplier' ? 'சப்ளையரா' : 'வாடிக்கையாளரா'}? ஆம் அல்லது இல்லை?`)[l],
  askDir: (l, n, a) => L(`${n}, ${a} रुपये — उधार या जमा?`, `${n}, ${a} rupees — udhaar or payment?`, `${n}, ${a} ரூபாய் — கடனா அல்லது வரவா?`)[l],
  askWho: L('किसके नाम पर?', 'On whose name?', 'யார் பெயரில்?'),
  conflict: (l, a, b) => L(`${a} या ${b}?`, `${a} or ${b}?`, `${a} அல்லது ${b}?`)[l],
  big: (l, n, a) => L(`${n}, ${a} रुपये — सही है?`, `${n}, ${a} rupees — is that right?`, `${n}, ${a} ரூபாய் — சரியா?`)[l],
  fixed: (l, n, a) => L(`ठीक किया। ${n}, अब ${a} रुपये।`, `Corrected. ${n}, now ${a} rupees.`, `சரி செய்தேன். ${n}, இப்போது ${a} ரூபாய்.`)[l],
  fixedDir: (l, n, d) => L(`ठीक किया। ${n} — ${d === 'credit' ? 'उधार' : 'जमा'}।`, `Corrected. ${n} — ${d === 'credit' ? 'udhaar' : 'payment'}.`, `சரி செய்தேன். ${n} — ${d === 'credit' ? 'கடன்' : 'வரவு'}.`)[l],
  undone: L('पिछली एंट्री हटा दी।', 'Removed the last entry.', 'கடைசி பதிவை நீக்கினேன்.'),
  nothingUndo: L('हटाने के लिए कुछ नहीं है।', 'Nothing to remove.', 'நீக்க எதுவும் இல்லை.'),
  nothingFix: L('सुधारने के लिए कोई एंट्री नहीं है।', 'No entry to correct.', 'சரி செய்ய பதிவு இல்லை.'),
  balance: (l, n, t, sup) => (sup
    ? L(`${n} को ${t} रुपये देने हैं।`, `You owe ${n} ${t} rupees.`, `${n} க்கு ${t} ரூபாய் கொடுக்க வேண்டும்.`)
    : t > 0 ? L(`${n} का कुल ${t} रुपये बाकी है।`, `${n} owes ${t} rupees.`, `${n} இடம் ${t} ரூபாய் பாக்கி.`)
      : L(`${n} का कुछ बाकी नहीं।`, `${n} owes nothing.`, `${n} இடம் பாக்கி இல்லை.`))[l],
  todayCredit: (l, a) => L(`आज ${a} रुपये उधार गया।`, `${a} rupees of udhaar given today.`, `இன்று ${a} ரூபாய் கடன் கொடுத்தீர்கள்.`)[l],
  todaySales: (l, tot, sales, cr) => L(`आज की बिक्री ${tot} रुपये — नकद ${sales}, उधार ${cr}।`, `Today's sales ${tot} rupees — cash ${sales}, udhaar ${cr}.`, `இன்றைய விற்பனை ${tot} ரூபாய் — ரொக்கம் ${sales}, கடன் ${cr}.`)[l],
  todayCollected: (l, a) => L(`आज ${a} रुपये वापस आए।`, `${a} rupees collected today.`, `இன்று ${a} ரூபாய் வசூலானது.`)[l],
  receivable: (l, n, t) => L(`${n} लोगों से ${t} रुपये लेने हैं।`, `${n} people owe you ${t} rupees.`, `${n} பேரிடம் ${t} ரூபாய் வர வேண்டும்.`)[l],
  noneOwe: L('अभी किसी का बाकी नहीं।', 'Nobody owes you right now.', 'இப்போது யாரும் பாக்கி இல்லை.'),
  top: (l, arr) => L(`सबसे ज़्यादा: ${arr.map((x) => `${x.n} ${x.a} रुपये`).join(', ')}।`, `Biggest: ${arr.map((x) => `${x.n} ${x.a} rupees`).join(', ')}.`,
    `அதிகம்: ${arr.map((x) => `${x.n} ${x.a} ரூபாய்`).join(', ')}.`)[l],
  payables: (l, t, arr) => L(`सप्लायर्स को कुल ${t} रुपये देने हैं${arr.length ? ` — ${arr.map((x) => `${x.n} ${x.a}`).join(', ')}` : ''}।`,
    `You owe suppliers ${t} rupees${arr.length ? ` — ${arr.map((x) => `${x.n} ${x.a}`).join(', ')}` : ''}.`,
    `சப்ளையர்களுக்கு மொத்தம் ${t} ரூபாய் கொடுக்க வேண்டும்${arr.length ? ` — ${arr.map((x) => `${x.n} ${x.a}`).join(', ')}` : ''}.`)[l],
  noPayables: L('किसी सप्लायर को कुछ देना बाकी नहीं।', 'You owe no supplier anything.', 'சப்ளையர்களுக்கு கொடுக்க வேண்டியது இல்லை.'),
  expiring: (l, arr) => L(`${arr.length} चीज़ें जल्दी एक्सपायर होंगी: ${arr.map((x) => `${x.item} ${x.expired ? 'एक्सपायर हो चुका' : `${x.days} दिन`}`).join(', ')}।`,
    `${arr.length} item${arr.length > 1 ? 's' : ''} expiring soon: ${arr.map((x) => `${x.item} ${x.expired ? 'already expired' : `in ${x.days} days`}`).join(', ')}.`,
    `${arr.length} பொருட்கள் விரைவில் காலாவதியாகும்: ${arr.map((x) => `${x.item} ${x.expired ? 'காலாவதியானது' : `${x.days} நாட்களில்`}`).join(', ')}.`)[l],
  noExpiring: L('अगले 30 दिन में कुछ एक्सपायर नहीं हो रहा।', 'Nothing expires in the next 30 days.', 'அடுத்த 30 நாட்களில் எதுவும் காலாவதியாகாது.'),
  stockAdded: (l, item, q, u, exp) => L(`${item}, ${q} ${u} स्टॉक में जोड़ा${exp ? `, एक्सपायरी ${exp}` : ''}।`, `Added ${q} ${u} of ${item}${exp ? `, expiry ${exp}` : ''}.`,
    `${item}, ${q} ${u} இருப்பில் சேர்த்தேன்${exp ? `, காலாவதி ${exp}` : ''}.`)[l],
  noExpiryHint: L(' एक्सपायरी बता दें तो मैं याद दिला दूँगा।', ' Tell me the expiry and I will remind you.', ' காலாவதி தேதி சொன்னால் நினைவூட்டுவேன்.'),
  stockList: (l, arr) => L(`स्टॉक: ${arr.map((x) => `${x.item} ${x.qty}`).join(', ')}।`, `Stock: ${arr.map((x) => `${x.item} ${x.qty}`).join(', ')}.`, `இருப்பு: ${arr.map((x) => `${x.item} ${x.qty}`).join(', ')}.`)[l],
  noStock: L('स्टॉक में अभी कुछ दर्ज नहीं।', 'No stock recorded yet.', 'இருப்பு பதிவு இல்லை.'),
  eodAsk: (l, item) => L(`आज ${item} बिका या नहीं?`, `Is ${item} selling today?`, `இன்று ${item} விற்றதா?`)[l],
  eodSelling: (l, item) => L(`${item} अच्छा चल रहा है, नोट किया।`, `Noted, ${item} is selling well.`, `${item} நன்றாக விற்கிறது, குறித்தேன்.`)[l],
  eodSlow: (l, item) => L(`${item} धीमा है, नोट किया। अगली बार कम मँगवाइए।`, `Noted, ${item} is slow. Maybe order less next time.`, `${item} மெதுவாக விற்கிறது, குறித்தேன். அடுத்த முறை குறைவாக வாங்கலாம்.`)[l],
  eodOut: (l, item) => L(`${item} खत्म, नोट किया।`, `Noted, ${item} is finished.`, `${item} தீர்ந்தது, குறித்தேன்.`)[l],
  summary: (l, d) => L(`आज की बिक्री ${d.revenue} रुपये, वापस आए ${d.collected}, उधार गया ${d.credit}। लेना ${d.rec} रुपये, देना ${d.pay} रुपये।${d.top ? ` सबसे ज़्यादा बाकी ${d.top.n}, ${d.top.a} रुपये।` : ''}${d.exp ? ` ${d.exp} चीज़ें एक्सपायरी के पास हैं।` : ''}`,
    `Today's sales ${d.revenue} rupees, collected ${d.collected}, udhaar given ${d.credit}. To receive ${d.rec}, to pay ${d.pay}.${d.top ? ` Biggest due: ${d.top.n}, ${d.top.a} rupees.` : ''}${d.exp ? ` ${d.exp} items near expiry.` : ''}`,
    `இன்றைய விற்பனை ${d.revenue} ரூபாய், வசூல் ${d.collected}, கடன் ${d.credit}. வர வேண்டியது ${d.rec}, கொடுக்க வேண்டியது ${d.pay}.${d.top ? ` அதிக பாக்கி ${d.top.n}, ${d.top.a} ரூபாய்.` : ''}${d.exp ? ` ${d.exp} பொருட்கள் காலாவதிக்கு அருகில்.` : ''}`)[l],
  noOptIn: (l, n) => L(`${n} ने रिमाइंडर के लिए हाँ नहीं कहा है, इसलिए नहीं भेज सकता।`, `${n} has not opted in to reminders, so I cannot send one.`, `${n} நினைவூட்டலுக்கு சம்மதிக்கவில்லை, அதனால் அனுப்ப முடியாது.`)[l],
  reminderReady: (l, n) => L(`${n} के लिए विनम्र रिमाइंडर तैयार है। स्क्रीन पर देखिए।`, `A polite reminder for ${n} is ready on screen.`, `${n} க்கான பணிவான நினைவூட்டல் திரையில் தயார்.`)[l],
  reminderText: (l, n, a, shop) => L(`नमस्ते ${n} जी, आपके खाते में ${a} रुपये बाकी हैं। सुविधा अनुसार दे दीजिएगा। धन्यवाद! — ${shop}`,
    `Hello ${n}, a balance of ${a} rupees is pending on your account. Please pay whenever convenient. Thank you! — ${shop}`,
    `வணக்கம் ${n}, உங்கள் கணக்கில் ${a} ரூபாய் பாக்கி உள்ளது. வசதிப்படி செலுத்துங்கள். நன்றி! — ${shop}`)[l],
  notUnderstood: L('समझ नहीं आया, फिर से बोलिए।', 'Sorry, I did not catch that. Please say it again.', 'புரியவில்லை, மீண்டும் சொல்லுங்கள்.'),
  noParty: L('यह नाम नहीं मिला। नाम के साथ फिर बोलिए।', 'I could not find that name. Please say it with the name.', 'அந்த பெயர் கிடைக்கவில்லை. பெயருடன் மீண்டும் சொல்லுங்கள்.'),
  cancelled: L('ठीक है, रद्द किया।', 'Okay, cancelled.', 'சரி, ரத்து செய்தேன்.'),
  bye: L('ठीक है। ज़रूरत हो तो फिर बुलाइए।', 'Okay. Call me whenever you need.', 'சரி. தேவைப்படும்போது அழையுங்கள்.'),
  help: L('आप बोल सकते हैं: रमेश का 340 उधार, सुरेश ने 200 दिए, आज की बिक्री, या रमेश का कुल।', 'You can say: Ramesh ka 340 udhaar, Suresh ne 200 diye, today\'s sales, or Ramesh ka total.',
    'இப்படி சொல்லலாம்: ரமேஷ் 340 கடன், சுரேஷ் 200 கொடுத்தார், இன்றைய விற்பனை, அல்லது ரமேஷ் மொத்தம்.'),
  netErr: L('इंटरनेट में दिक्कत है। थोड़ी देर बाद कोशिश कीजिए।', 'Connection problem. Please try again shortly.', 'இணைப்பில் சிக்கல். சிறிது நேரம் கழித்து முயலுங்கள்.'),
};
export const money = (n) => `₹${fmt(n)}`;
export const when = (l, daysAgo) => (daysAggo(l, daysAgo));
function daysAggo(l, n) {
  const t = { hi: [' (कल)', ' (परसों)'], en: [' (yesterday)', ' (day before)'], ta: [' (நேற்று)', ' (முந்தாநாள்)'], kn: [' (ನಿನ್ನೆ)', ' (ಮೊನ್ನೆ)'] }[l];
  return n === 0 ? '' : n === 1 ? t[0] : n === 2 ? t[1] : ` (${n}d)`;
}

// ---- Kannada (kn): same keys as BASE; functions drop the language argument ----
const KN = {
  disclosure: 'ನಮಸ್ಕಾರ! ನಾನು ಒಂದು ಎಐ ಸಹಾಯಕ, ನಿಮ್ಮ ವಾಯ್ಸ್ ಖಾತಾ. ಏನು ಬರೆಯಬೇಕು ಹೇಳಿ.',
  more: ' ಬೇರೆ ಏನಾದರೂ?',
  credit: (n, a, t) => `${n}, ${a} ರೂಪಾಯಿ ಸಾಲ ಬರೆದಿದ್ದೇನೆ. ಒಟ್ಟು ${t} ರೂಪಾಯಿ.`,
  payment: (n, a, t) => `${n} ಅವರಿಂದ ${a} ರೂಪಾಯಿ ಜಮೆ.${t > 0 ? ` ಇನ್ನೂ ${t} ರೂಪಾಯಿ ಬಾಕಿ.` : ' ಇನ್ನು ಬಾಕಿ ಇಲ್ಲ.'}`,
  purchase: (n, a, t) => `${n} ಅವರಿಂದ ${a} ರೂಪಾಯಿ ಸರಕು ಬರೆದಿದ್ದೇನೆ. ಅವರಿಗೆ ಒಟ್ಟು ${t} ರೂಪಾಯಿ ಕೊಡಬೇಕು.`,
  supplierPay: (n, a, t) => `${n} ಅವರಿಗೆ ${a} ರೂಪಾಯಿ ಕೊಟ್ಟೆ.${t > 0 ? ` ಇನ್ನೂ ${t} ರೂಪಾಯಿ ಕೊಡಬೇಕು.` : ' ಇನ್ನು ಕೊಡಬೇಕಾದದ್ದು ಇಲ್ಲ.'}`,
  sale: (a, tot) => `${a} ರೂಪಾಯಿ ಮಾರಾಟ ಸೇರಿಸಿದ್ದೇನೆ. ಇಂದು ಒಟ್ಟು ${tot} ರೂಪಾಯಿ.`,
  askWhich: (first, a, b) => `ಯಾವ ${first}? ${a} ಅಥವಾ ${b}?`,
  askNew: (n, type) => `${n} ಹೊಸ ${type === 'supplier' ? 'ಸರಬರಾಜುದಾರ' : 'ಗ್ರಾಹಕ'}ರೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ?`,
  askDir: (n, a) => `${n}, ${a} ರೂಪಾಯಿ — ಸಾಲವೋ ಅಥವಾ ಜಮೆಯೋ?`,
  askWho: 'ಯಾರ ಹೆಸರಿನಲ್ಲಿ?',
  conflict: (a, b) => `${a} ಅಥವಾ ${b}?`,
  big: (n, a) => `${n}, ${a} ರೂಪಾಯಿ — ಸರಿಯೇ?`,
  fixed: (n, a) => `ಸರಿಪಡಿಸಿದೆ. ${n}, ಈಗ ${a} ರೂಪಾಯಿ.`,
  fixedDir: (n, d) => `ಸರಿಪಡಿಸಿದೆ. ${n} — ${d === 'credit' ? 'ಸಾಲ' : 'ಜಮೆ'}.`,
  undone: 'ಕೊನೆಯ ದಾಖಲೆ ತೆಗೆದಿದ್ದೇನೆ.',
  nothingUndo: 'ತೆಗೆಯಲು ಏನೂ ಇಲ್ಲ.',
  nothingFix: 'ಸರಿಪಡಿಸಲು ದಾಖಲೆ ಇಲ್ಲ.',
  balance: (n, t, sup) => (sup ? `${n} ಅವರಿಗೆ ${t} ರೂಪಾಯಿ ಕೊಡಬೇಕು.` : t > 0 ? `${n} ಅವರಿಂದ ${t} ರೂಪಾಯಿ ಬರಬೇಕು.` : `${n} ಅವರಿಂದ ಬಾಕಿ ಇಲ್ಲ.`),
  todayCredit: (a) => `ಇಂದು ${a} ರೂಪಾಯಿ ಸಾಲ ಕೊಟ್ಟಿದ್ದೀರಿ.`,
  todaySales: (tot, sales, cr) => `ಇಂದಿನ ಮಾರಾಟ ${tot} ರೂಪಾಯಿ — ನಗದು ${sales}, ಸಾಲ ${cr}.`,
  todayCollected: (a) => `ಇಂದು ${a} ರೂಪಾಯಿ ವಸೂಲಾಗಿದೆ.`,
  receivable: (n, t) => `${n} ಜನರಿಂದ ${t} ರೂಪಾಯಿ ಬರಬೇಕು.`,
  noneOwe: 'ಈಗ ಯಾರಿಂದಲೂ ಬಾಕಿ ಇಲ್ಲ.',
  top: (arr) => `ಅತಿ ಹೆಚ್ಚು: ${arr.map((x) => `${x.n} ${x.a} ರೂಪಾಯಿ`).join(', ')}.`,
  payables: (t, arr) => `ಸರಬರಾಜುದಾರರಿಗೆ ಒಟ್ಟು ${t} ರೂಪಾಯಿ ಕೊಡಬೇಕು${arr.length ? ` — ${arr.map((x) => `${x.n} ${x.a}`).join(', ')}` : ''}.`,
  noPayables: 'ಯಾರಿಗೂ ಕೊಡಬೇಕಾದದ್ದು ಇಲ್ಲ.',
  expiring: (arr) => `${arr.length} ವಸ್ತುಗಳ ಅವಧಿ ಬೇಗ ಮುಗಿಯುತ್ತದೆ: ${arr.map((x) => `${x.item} ${x.expired ? 'ಅವಧಿ ಮುಗಿದಿದೆ' : `${x.days} ದಿನಗಳಲ್ಲಿ`}`).join(', ')}.`,
  noExpiring: 'ಮುಂದಿನ 30 ದಿನಗಳಲ್ಲಿ ಯಾವುದರ ಅವಧಿಯೂ ಮುಗಿಯುವುದಿಲ್ಲ.',
  stockAdded: (item, q, u, exp) => `${item}, ${q} ${u} ದಾಸ್ತಾನಿಗೆ ಸೇರಿಸಿದ್ದೇನೆ${exp ? `, ಅವಧಿ ${exp}` : ''}.`,
  noExpiryHint: ' ಅವಧಿ ದಿನಾಂಕ ಹೇಳಿದರೆ ನೆನಪಿಸುತ್ತೇನೆ.',
  stockList: (arr) => `ದಾಸ್ತಾನು: ${arr.map((x) => `${x.item} ${x.qty}`).join(', ')}.`,
  noStock: 'ದಾಸ್ತಾನು ದಾಖಲೆ ಇಲ್ಲ.',
  eodAsk: (item) => `ಇಂದು ${item} ಮಾರಾಟವಾಯಿತೇ?`,
  eodSelling: (item) => `${item} ಚೆನ್ನಾಗಿ ಮಾರಾಟವಾಗುತ್ತಿದೆ, ಗುರುತಿಸಿದ್ದೇನೆ.`,
  eodSlow: (item) => `${item} ನಿಧಾನ, ಗುರುತಿಸಿದ್ದೇನೆ. ಮುಂದಿನ ಬಾರಿ ಕಡಿಮೆ ತರಿಸಿ.`,
  eodOut: (item) => `${item} ಮುಗಿದಿದೆ, ಗುರುತಿಸಿದ್ದೇನೆ.`,
  summary: (d) => `ಇಂದಿನ ಮಾರಾಟ ${d.revenue} ರೂಪಾಯಿ, ವಸೂಲಿ ${d.collected}, ಸಾಲ ಕೊಟ್ಟದ್ದು ${d.credit}. ಬರಬೇಕಾದದ್ದು ${d.rec}, ಕೊಡಬೇಕಾದದ್ದು ${d.pay}.${d.top ? ` ಹೆಚ್ಚು ಬಾಕಿ ${d.top.n}, ${d.top.a} ರೂಪಾಯಿ.` : ''}${d.exp ? ` ${d.exp} ವಸ್ತುಗಳ ಅವಧಿ ಹತ್ತಿರವಿದೆ.` : ''}`,
  noOptIn: (n) => `${n} ಅವರು ನೆನಪೋಲೆಗೆ ಒಪ್ಪಿಲ್ಲ, ಆದ್ದರಿಂದ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ.`,
  reminderReady: (n) => `${n} ಅವರಿಗೆ ವಿನಯದ ನೆನಪೋಲೆ ಪರದೆಯ ಮೇಲೆ ಸಿದ್ಧವಿದೆ.`,
  reminderText: (n, a, shop) => `ನಮಸ್ಕಾರ ${n}, ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ${a} ರೂಪಾಯಿ ಬಾಕಿ ಇದೆ. ಅನುಕೂಲವಾದಾಗ ಕೊಡಿ. ಧನ್ಯವಾದ! — ${shop}`,
  notUnderstood: 'ಅರ್ಥವಾಗಲಿಲ್ಲ, ಮತ್ತೆ ಹೇಳಿ.',
  noParty: 'ಆ ಹೆಸರು ಸಿಗಲಿಲ್ಲ. ಹೆಸರಿನೊಂದಿಗೆ ಮತ್ತೆ ಹೇಳಿ.',
  cancelled: 'ಸರಿ, ರದ್ದುಪಡಿಸಿದೆ.',
  bye: 'ಸರಿ. ಬೇಕಾದಾಗ ಕರೆಯಿರಿ.',
  help: 'ಹೀಗೆ ಹೇಳಿ: ರಮೇಶ್ 340 ಸಾಲ, ಸುರೇಶ್ 200 ಕೊಟ್ಟರು, ಇಂದಿನ ಮಾರಾಟ, ಅಥವಾ ರಮೇಶ್ ಒಟ್ಟು.',
  netErr: 'ಇಂಟರ್ನೆಟ್ ಸಮಸ್ಯೆ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.',
};
/** Public strings: BASE (hi/en/ta) + KN overlay. Missing KN keys would throw in tests, never silently fall back. */
export const S = Object.fromEntries(Object.entries(BASE).map(([k, v]) => (typeof v === 'function'
  ? [k, (l, ...a) => (l === 'kn' ? KN[k](...a) : v(l, ...a))]
  : [k, { ...v, kn: KN[k] }])));
export const KN_KEYS = Object.keys(KN);
