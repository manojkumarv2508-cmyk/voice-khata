// Number understanding for shop talk: digits, Hindi, Tamil and English number words,
// Latin-script spellings of all of them. Pure functions, no DOM, runs in browser and Node.

/** Phonetic-ish normaliser so "chaalis" == "chalis" == "chaaliss". Letters only. */
export function nk(w) {
  return String(w).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
    .replace(/aa+/g, 'a').replace(/ee+|ii+/g, 'i').replace(/oo+|uu+/g, 'u')
    .replace(/w/g, 'v').replace(/(.)\1+/g, '$1');
}

// value -> space separated spellings. Hindi/Hinglish 0..99
const HI = {
  0: 'shunya zero', 1: 'ek', 2: 'do', 3: 'teen tin', 4: 'chaar char', 5: 'paanch panch paach pach', 6: 'chhe chhah che chah',
  7: 'saat sat', 8: 'aath ath', 9: 'nau nao', 10: 'das dus', 11: 'gyarah gyaarah giyarah igyarah', 12: 'barah baarah bara', 13: 'terah tera terha',
  14: 'chaudah chaudaah chaudha', 15: 'pandrah pandra pandhrah', 16: 'solah sola sorah', 17: 'satrah satra', 18: 'atharah athaarah athara athrah',
  19: 'unnis unnees unnis unis', 20: 'bees bis', 21: 'ikkis ikkees ekkis', 22: 'baais bais baaees', 23: 'teis tais teyis', 24: 'chaubis chaubees chaubbis',
  25: 'pachchis pachees pachis pacchis pachhis pachiis', 26: 'chhabbis chabbis chhabbees chabis', 27: 'sattais sattaees sattaaees sataais',
  28: 'atthais atthaais athais athaais', 29: 'untis unatis unatees unatis', 30: 'tees tis', 31: 'iktis ikatis ektis', 32: 'battis battees batis',
  33: 'tentis taintis tainthis', 34: 'chautis chauntis chaunthis', 35: 'paintis pentis', 36: 'chhattis chattis chhattees', 37: 'saintis sentis',
  38: 'adtis artis adhtis', 39: 'untalis untaalis unchalis', 40: 'chalis chaalis chaliis', 41: 'iktalis ektalis', 42: 'bayalis byalis bayaalis beyalis',
  43: 'taintalis tentalis tretalis', 44: 'chauvalis chavalis chauvaalis', 45: 'paintalis pentalis', 46: 'chhiyalis chiyalis chhiyaalis',
  47: 'saintalis sentalis', 48: 'adtalis artalis adhtalis', 49: 'unchas unanchas unaas unachas', 50: 'pachas pachaas pachash pachass',
  51: 'ikyavan ikyaavan ekyavan', 52: 'baavan bavan', 53: 'tirpan trepan tirepan', 54: 'chauvan chauwan chavan', 55: 'pachpan pachpann',
  56: 'chhappan chappan', 57: 'sattavan satavan', 58: 'atthavan athavan', 59: 'unsath unasath unsaath', 60: 'saath sath saadh', 61: 'iksath iksaath eksath',
  62: 'baasath basath baasaath', 63: 'tirsath tirsaath', 64: 'chausath chaunsath', 65: 'painsath pensath', 66: 'chhiyasath chiyasath',
  67: 'sadsath sarsath', 68: 'adsath arsath', 69: 'unhattar unahattar', 70: 'sattar satar', 71: 'ikhattar ekhattar', 72: 'bahattar bahatar',
  73: 'tihattar tehattar', 74: 'chauhattar chauhatar', 75: 'pachhattar pachattar pachhatar', 76: 'chhihattar chihattar', 77: 'satattar sattattar',
  78: 'athattar atthattar', 79: 'unyasi unaasi unnasi', 80: 'assi asi', 81: 'ikyasi ekyasi', 82: 'bayasi byasi', 83: 'tirasi tiraasi',
  84: 'chaurasi chaurasee', 85: 'pachasi pachaasi', 86: 'chhiyasi chiyasi', 87: 'sattasi satasi', 88: 'atthasi athasi', 89: 'navasi nawasi nivasi',
  90: 'nabbe nabbey nabbe', 91: 'ikyanve ikyaanve', 92: 'baanve banve', 93: 'tiranve tiraanve', 94: 'chauranve chauraanve', 95: 'pachanve pachaanve',
  96: 'chhiyanve chiyanve', 97: 'sattanve satanve', 98: 'atthanve athanve', 99: 'ninyanve ninaanve nanave ninanve',
};
const EN = {
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve',
  13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty', 30: 'thirty', 40: 'forty fourty',
  50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety',
};
const TA = {
  1: 'onru ondru onnu', 2: 'irandu rendu', 3: 'moonru munru moonu', 4: 'naangu nangu naalu nalu', 5: 'ainthu anju ainju aindhu', 6: 'aaru aru',
  7: 'ezhu elu yezhu', 8: 'ettu', 9: 'onbathu ombathu onbadhu', 10: 'pathu patthu padhu', 11: 'pathinonru padinonnu pathinonnu', 12: 'panirandu pannirandu',
  13: 'pathimoonru pathimunru', 14: 'pathinaangu pathinangu', 15: 'pathinainthu pathinanju pathinaindhu', 16: 'pathinaaru pathinaru', 17: 'pathinezhu pathinelu',
  18: 'pathinettu', 19: 'pathonbathu pathombathu', 20: 'irubathu irupathu irubadhu', 30: 'muppathu muppadhu', 40: 'naarpathu nalupathu naarpadhu',
  50: 'aimbathu ainbathu aimpathu', 60: 'arubathu arupathu', 70: 'ezhubathu ezhupathu', 80: 'enbathu enpathu', 90: 'thonnooru thonnuru thonuru',
  100: 'nooru nuru noor', 200: 'irunooru irunuru', 300: 'munnooru munnootru munnoothi munnootri munnuru', 400: 'naanooru nanuru naanuru',
  500: 'ainnooru ainjooru ainuru ainnuru', 600: 'aaranooru aaranuru', 700: 'ezhunooru ezhunuru', 800: 'ettunooru ettunuru', 900: 'thollayiram thollaayiram',
};

const KA = {
  1: 'ondu', 2: 'eradu', 3: 'mooru muru', 4: 'naalku nalku', 5: 'aidu ayidu', 8: 'entu', 9: 'ombattu ombhattu', 10: 'hattu',
  11: 'hadinondu', 12: 'hannerdu hanneradu', 13: 'hadimooru', 14: 'hadinalku', 15: 'hadinaidu', 16: 'hadinaaru', 17: 'hadinelu', 18: 'hadinentu', 19: 'hathombattu hattombattu',
  20: 'ippattu', 30: 'muvattu moovattu', 40: 'nalavattu nalvattu halavattu', 50: 'aivattu', 60: 'aravattu', 70: 'eppattu', 80: 'embattu', 90: 'tombattu thombattu',
  200: 'innooru innuru innura innoora', 300: 'munnooru munnoora munnuru munnura', 400: 'nalnooru nalkunooru nalakunura nalkunura nalkunuru nalunuru', 500: 'ainooru ainuru ainura',
  600: 'aarunooru arunooru aranuru', 700: 'elunooru elunuru', 800: 'entunooru entunuru', 900: 'ombainooru ombainuru',
};
export const LEX = Object.create(null); // nk(word) -> {v, k}: k = u(unit) m(multiplier) h(half prefix) q(quarter-less prefix)
const add = (words, v, k = 'u') => String(words).split(/\s+/).filter(Boolean).forEach((w) => { LEX[nk(w)] = { v, k }; });
for (const [v, w] of Object.entries(HI)) add(w, +v);
for (const [v, w] of Object.entries(EN)) add(w, +v);
for (const [v, w] of Object.entries(TA)) add(w, +v);
for (const [v, w] of Object.entries(KA)) add(w, +v);
add('sau so sou hundred hunderd', 100, 'm');
add('hazaar hazar hajar hajaar thousand thousands aayiram ayiram aayram saavira savira savirada saviradu', 1000, 'm');
add('lakh lac lakhs latcham latchm laksha lakshada', 100000, 'm');
add('crore karod crores koti', 10000000, 'm');
add('dedh derh der', 1.5); add('dhai dhaai adhai dhaayi dhayi dahi', 2.5); add('sawa sava', 1.25);
add('saade sade sadhe saadhe', 0, 'h'); add('paune pone paun', 0, 'q');
// tolerated stems for fused Tamil forms ("irubathainthu" = irubath + ainthu)
const STEMS = { irubath: 20, muppath: 30, naarpath: 40, aimbath: 50, arubath: 60, ezhubath: 70, enbath: 80, pathin: 10 };

const MULWORD = (t) => { const e = LEX[nk(t)]; return e && e.k === 'm' ? e : null; };

/** Parse a digit token like "340", "₹3,40,000", "340/-", "500rs", "2k". Returns number|null. */
export function parseDigits(tok) {
  const m = String(tok).toLowerCase().replace(/[₹,]/g, '').replace(/\/-$/, '').match(/^(?:rs\.?|inr)?(\d+(?:\.\d+)?)(k|rs|rupaye|rupees?|rupai)?$/);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (m[2] === 'k') v *= 1000;
  return v;
}

function fuse(tok) { // split a fused Tamil word into known number morphemes, else null
  const t = nk(tok);
  if (t.length < 6 || LEX[t]) return null;
  const parts = [];
  const rec = (s) => {
    if (!s) return true;
    for (let l = Math.min(s.length, 12); l >= 3; l--) {
      const p = s.slice(0, l);
      const e = LEX[p] || (STEMS[p] != null ? { v: STEMS[p], k: 'u' } : null);
      if (e && e.k === 'u' && rec(s.slice(l))) { parts.unshift(p); return true; }
    }
    return false;
  };
  return rec(t) && parts.length >= 2 && parts.length <= 4 ? parts : null;
}

/**
 * Parse a number starting at tokens[i]. Handles Indian grammar ("do hazaar teen sau chaalis"),
 * fractions ("dedh sau", "dhai hazaar", "saade teen sau", "paune do sau"),
 * colloquial "three forty" (=340) and digit tokens with a multiplier word ("2 hazaar", "1.5 lakh").
 * @returns {{value:number,len:number}|null}
 */
export function parseNumberAt(tokens, i) {
  const t0 = tokens[i];
  const dg = parseDigits(t0);
  if (dg != null) {
    const m = tokens[i + 1] && MULWORD(tokens[i + 1]);
    if (m && /^\d+(\.\d+)?$/.test(String(t0).replace(/,/g, ''))) return { value: Math.round(dg * m.v), len: 2 };
    return { value: Math.round(dg), len: 1 };
  }
  // flatten possibly-fused tokens into morpheme list
  const flat = [];
  const owner = [];
  for (let j = i; j < Math.min(tokens.length, i + 10); j++) {
    const f = LEX[nk(tokens[j])] ? null : fuse(tokens[j]);
    if (f) f.forEach((p) => { flat.push(p); owner.push(j); }); else { flat.push(tokens[j]); owner.push(j); }
  }
  let total = 0, cur = 0, has = false, pend = null, used = 0, mulInGroup = false;
  let k = 0;
  for (; k < flat.length; k++) {
    const w = flat[k];
    const key = nk(w);
    const e = LEX[key] || (STEMS[key] != null ? { v: STEMS[key], k: 'u' } : null) || (key === 'ivatu' && used > 0 ? { v: 50, k: 'u' } : null);
    if (!e) {
      if ((w === 'and' || w === 'aur') && used > 0 && flat[k + 1] && (LEX[nk(flat[k + 1])] || false)) { continue; }
      break;
    }
    if (e.k === 'h' || e.k === 'q') { pend = e.k; used++; continue; }
    if (e.k === 'u') {
      let v = e.v;
      if (pend === 'h') v += 0.5; else if (pend === 'q') v -= 0.25;
      pend = null;
      if (!has) { cur = v; has = true; }
      else if (Number.isInteger(cur) && cur >= 1 && cur <= 9 && v >= 10 && !mulInGroup) cur = cur * 100 + v; // "three forty"
      else if ((cur % 10 === 0 && v < 10) || (cur % 100 === 0 && cur >= 100 && v < 100)) cur += v;
      else break; // starts a new number
      used++;
      continue;
    }
    // multiplier
    if (pend) pend = null;
    if (e.v === 100) {
      if (!has) { cur = 1; has = true; } else if (cur >= 100) break;
      cur *= 100; mulInGroup = true;
    } else {
      total += (has ? cur : 1) * e.v; cur = 0; has = false; mulInGroup = false;
    }
    used++;
  }
  if (!used) return null;
  const value = total + (has ? cur : 0);
  if (!Number.isInteger(value) || value <= 0) return null;
  // map consumed flat morphemes back to original token count
  const lastOwner = owner[Math.max(0, Math.min(k, owner.length) - 1)];
  return { value, len: lastOwner - i + 1 };
}

/** Convenience: first number in a free-text string (used by tests / corrections). */
export function firstNumber(text) {
  const toks = String(text).toLowerCase().replace(/[^\p{L}\p{N}₹,./-]+/gu, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) { const r = parseNumberAt(toks, i); if (r) return r.value; }
  return null;
}
