// Rule-based NLU for kirana shop talk (Hindi / Tamil / English, Latin-script transcripts).
// Deterministic on purpose: an LLM can never "invent" an amount, and replies stay instant.
import { nk, parseNumberAt, parseDigits } from './numbers.js';

const S = (s) => new Set(s.split(/\s+/).filter(Boolean).map(nk));

export const KW = {
  corr: S('alla nahi nahin nai no galat wrong sorry matlab actually arre are illa illai ille thappu correction sudhar nahin'),
  undo: S('hata hatao hatado delete undo cancel remove mita mitao mitado neekku azhi tegedu tegi tegiri'),
  undoCtx: S('pichla pichhla pichli last previous ye yeh woh wo that it'),
  credit: S('sala saala udhaar udhar uthar uddhar baaki baki bakaya credit khata khate likh likho likhdo likhna kadan kadal kadhan kuduthen koduthen'),
  pay: S('jama wapas vapas paid pay payment chukaya chuka bhara bhar mila mile received receive upi gpay phonepe paytm online kuduthaar koduthaar kuduthanga koduthanga thanthaar thandhaar thanthanga thandhanga katti kattinaar kattinanga returned return repaid bantu banthu banditu bandide kattidaru kattidru'),
  cash: S('cash'),
  give: S('diya diye di dia dediya dedi gaya gaye'),
  purchase: S('sarakku saraku tandenu tandidde maal saman samaan stock supply purchase bought laya laye liya liye aaya aaye aayi mangaya mangvaya order vangi vangiyachu vandhuchu vandhadhu'),
  supplierHint: S('supplier wholesaler distributor vendor agency company dealer mandi'),
  sale: S('marata maaraata bikri bikree sale sales bechi becha bechna vikri vikrai virpanai vilai collection galla gulla vyapar vyapaar'),
  query: S('eshtu yaru heli helu tilisi torisi ottu lekka kitna kitni kitne kya total balance how much many who kaun kon batao bata bataiye batana dikhao hisab hisaab summary evlo evvalavu enna yaar sollu sollunga solu check dikha show tell what list'),
  today: S('aaj aj today inniku indru innaiku ivattu ivattina indu indina'),
  yest: S('kal yesterday nethu netru ninne'),
  parso: S('parso parson parsu monne'),
  ago: S('pehle pehle ago munnadi'),
  days: S('din days day dinon naal naatkal'),
  unit: S('packet packets pkt pkts box boxes carton cartons dozen darjan bori bag bags kg kilo litre liter pcs piece pieces bottle bottles tin tins'),
  expiry: S('expiry expire expires expired exp kharab bestbefore'),
  money: S('rupaye rupees rupee rs rupai roobai ruba rubai rubayi rupayi rupaya inr'),
  marker: S('ka ki ke ko ne se ku kku oda udaiya kitta ge inda'),
  gen: S('ka ki ke oda udaiya'),
  erg: S('ne'), dat: S('ko ku kku ge'), abl: S('se kitta inda'),
  split: S('aur and phir fir also matrum appuram then mattu matte'),
  stop: S('ide idu adu avaru avara nanna hai hain tha the thi ho hua hue tak bhi to toh ek yeh ye wo woh is us mein me main mera meri mere hum aap please zara jara bolo bol ji bhai bhaiya sir madam anna akka sahab saab sahib uncle aunty mr mrs shri smt the a an of for on in at is was'),
  help: S('help madad sahayata udhavi'),
  remind: S('remind reminder yaad bhejo bhej message sms whatsapp nyabagam'),
  summary: S('summary hisab hisaab khatam close report tip dinbhar'),
  top: S('sabse zyada top biggest most maximum jyada adhik adhigam'),
  count: S('kitne how many count ethanai'),
  people: S('log logon customers customer people peeps aadmi pere makkal'),
  payable: S('kodabeku kodbeku dena denaa payable supplier suppliers wholesaler distributor vendor kodukanum'),
  receivable: S('milna milnahai receivable outstanding lena'),
  stockw: S('stock inventory maal saaman'),
  yes: S('houdu haudu haan han ha haa ji jee sahi theek thik yes yeah yep ok okay correct right ama aam sari seri shi bilkul done'),
  no: S('alla nahi nahin nai no na galat mat illa illai illae vendam cancel'),
  ordinal1: S('pehla pehle pahla first one ek ondru mudhal mudhalavadhu'),
  ordinal2: S('dusra doosra dusre doosre second two do rendu irandavadhu'),
  ordinal3: S('teesra tisra third three teen moonru'),
  selling: S('haan bik bika bikta chal chalraha achha accha good fast selling sold hot vikkuthu nalla'),
  slow: S('slow kam dheere dhire nahi bikta bika nahi not poor kamm mandham'),
  out: S('khatam finish finished over empty out soldout theernthuduchu'),
};
const MONTHS = { jan: 1, janvari: 1, january: 1, feb: 2, farvari: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, mai: 5, jun: 6, june: 6, joon: 6, jul: 7, july: 7, julai: 7,
  aug: 8, august: 8, agast: 8, sep: 9, sept: 9, september: 9, sitambar: 9, oct: 10, october: 10, aktubar: 10, nov: 11, november: 11, navambar: 11, dec: 12, december: 12, disambar: 12 };
const MONTH_KEYS = new Map(Object.entries(MONTHS).map(([k, v]) => [nk(k), v]));
const MONTH_WORD = S('mahine mahina mahinon months month maatham');

const has = (set, w) => set.has(nk(w));
/** Tamil 'give' family: koduttar/kuduthanga (he gave -> payment) vs koduthen/kuduthen (I gave -> credit). */
const tamilGive = (key) => (/^(kod|kud|thant|thand|tant)/.test(key) && key.length >= 4 ? (/en$/.test(key) ? 'credit' : 'pay')
  : /^kot/.test(key) && key.length >= 4 ? (/(e|enu)$/.test(key) ? 'credit' : 'pay') : null); // Kannada: kotte/kottenu = I gave, kottaru = he gave
const anyTok = (items, set) => items.some((x) => x.k === 'w' && set.has(x.key));

// ---------- text helpers ----------
const NATIVE_DIGITS = { '०': 0, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9, '௦': 0, '௧': 1, '௨': 2, '௩': 3, '௪': 4, '௫': 5, '௬': 6, '௭': 7, '௮': 8, '௯': 9 };
const HONORIFIC = S('ji bhai bhaiya sir madam anna akka sahab saab sahib uncle aunty mr mrs shri smt ammaa amma');

/** Phonetic key for personal names: Ramesh/Ramesh/Rameshh equal; Ramesh != Rajesh. */
export function nameKey(w) {
  return nk(w).replace(/h/g, '').replace(/e/g, 'i').replace(/o/g, 'u').replace(/y/g, 'i').replace(/(.)\1+/g, '$1');
}
function lev1(a, b) { // true if edit distance <= 1
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

export function tokenize(text) {
  let s = String(text || '').toLowerCase().replace(/[०-९௦-௯]/g, (c) => NATIVE_DIGITS[c]);
  s = s.replace(/[“”"']/g, '').replace(/(\d)\s*\/\s*-/g, '$1').replace(/₹\s*/g, '₹');
  s = s.replace(/\b(hata|likh|kar|de|bata|rakh|bhej|dikha|mita)\s+do\b/g, '$1do');
  const out = [];
  for (const raw of s.split(/\s+/).filter(Boolean)) {
    const brk = /[,.;!?।]+$/.test(raw) && !/^\d+[.,]\d+$/.test(raw);
    const t = raw.replace(/^[^\p{L}\p{N}₹]+|[^\p{L}\p{N}₹/]+$/gu, '').replace(/\.$/, '');
    if (t) out.push({ t, brk, q: /\?$/.test(raw) });
  }
  return out;
}

function matchParties(tokens, parties) {
  // returns Map startIndex -> {ids, len}
  const idx = [];
  for (const p of parties) {
    const toks = p.name.split(/\s+/).filter((w) => w && !HONORIFIC.has(nk(w)));
    toks.forEach((w, n) => idx.push({ key: nameKey(w), id: p.id, first: n === 0, w }));
    (p.aliases || []).forEach((w) => idx.push({ key: nameKey(w), id: p.id, first: false, w }));
  }
  const res = new Map();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].t;
    if (parseDigits(t) != null || t.length < 3 || HONORIFIC.has(nk(t))) continue;
    const k = nameKey(t);
    let ids = idx.filter((e) => e.key === k).map((e) => e.id);
    if (!ids.length && k.length >= 6) { const f = [...new Set(idx.filter((e) => lev1(e.key, k)).map((e) => e.id))]; if (f.length === 1) ids = f; }
    ids = [...new Set(ids)];
    if (!ids.length) continue;
    let len = 1;
    // two-token names ("Ramesh Kumar") narrow the candidates
    const nxt = tokens[i + 1];
    if (nxt) {
      const k2 = nameKey(nxt.t);
      const both = ids.filter((id) => idx.some((e) => e.id === id && e.key === k2));
      if (both.length) { ids = both; len = 2; }
    }
    res.set(i, { ids, len });
    i += len - 1;
  }
  return res;
}

/** Break the token stream into typed items: numbers, party mentions, words. */
function annotate(tokens, parties) {
  const pm = matchParties(tokens, parties);
  const items = [];
  for (let i = 0; i < tokens.length;) {
    const tk = tokens[i];
    const m = pm.get(i);
    const prevNum = items.length && items[items.length - 1].k === 'num' && !items[items.length - 1].brk;
    const num = tk.t === 'ninne' ? null : parseNumberAt(tokens.map((x) => x.t), i); // 'ninne' (Kannada: yesterday) sounds like 'nine'
    if (m && !(num && prevNum)) { items.push({ k: 'party', ids: m.ids, i, len: m.len, brk: tokens[i + m.len - 1].brk }); i += m.len; continue; }
    if (num) {
      const last = tokens[i + num.len - 1];
      items.push({ k: 'num', value: num.value, i, len: num.len, brk: last.brk, digits: parseDigits(tk.t) != null });
      i += num.len; continue;
    }
    items.push({ k: 'w', key: nk(tk.t), raw: tk.t, i, brk: tk.brk, q: tk.q });
    i++;
  }
  return items;
}

const daysAgoOf = (items) => {
  for (let n = 0; n < items.length; n++) {
    const x = items[n];
    if (x.k === 'w') {
      if (KW.parso.has(x.key)) return 2;
      if (KW.yest.has(x.key)) return 1;
      if (KW.today.has(x.key)) return 0;
    }
    if (x.k === 'num' && items[n + 1]?.k === 'w' && KW.days.has(items[n + 1].key) && items[n + 2]?.k === 'w' && KW.ago.has(items[n + 2].key)) return x.value;
  }
  return 0;
};

/** Quantity numbers (followed by a unit word) are not rupee amounts. */
function amountsOf(items) {
  const out = [];
  items.forEach((x, n) => {
    if (x.k !== 'num') return;
    const nx = items[n + 1];
    if (nx && nx.k === 'w' && (KW.unit.has(nx.key) || MONTH_WORD.has(nx.key) || KW.days.has(nx.key))) return;
    if (items[n - 1]?.k === 'w' && MONTH_KEYS.has(items[n - 1].key)) return; // "march 2027"
    if (nx && nx.k === 'w' && MONTH_KEYS.has(nx.key)) return; // "12 march"
    out.push(x.value);
  });
  return out;
}

function directionOf(items, ptype) {
  const w = items.filter((x) => x.k === 'w');
  const f = (set) => w.some((x) => set.has(x.key));
  const hasPartyBefore = items.some((x) => x.k === 'party');
  const tg = w.map((x) => tamilGive(x.key)).filter(Boolean);
  const credit = f(KW.credit) || tg.includes('credit'), pay = f(KW.pay) || tg.includes('pay') || (f(KW.cash) && hasPartyBefore), give = f(KW.give), ne = f(KW.erg), ko = f(KW.dat), buy = f(KW.purchase);
  if (ptype === 'supplier') {
    if (buy || credit) return 'purchase';
    if (pay || give) return 'supplier_payment';
    return null;
  }
  if (pay) return 'payment';
  if (credit) return 'credit';
  if (give) return ne ? 'payment' : ko ? 'credit' : 'payment';
  if (buy && ne) return 'credit';
  return null;
}

function splitClauses(items) {
  // boundaries: punctuation, conjunction, date word after an amount, 2nd amount after (amount+direction)
  const clauses = [];
  let cur = [];
  let seenNum = false, seenDir = false;
  const flush = () => { if (cur.some((x) => x.k === 'num')) clauses.push(cur); else if (clauses.length && cur.length) clauses[clauses.length - 1].push(...cur); cur = []; seenNum = seenDir = false; };
  for (const x of items) {
    const isDate = x.k === 'w' && (KW.today.has(x.key) || KW.yest.has(x.key) || KW.parso.has(x.key));
    const isDir = x.k === 'w' && (KW.credit.has(x.key) || KW.pay.has(x.key) || KW.give.has(x.key));
    if (x.k === 'w' && KW.split.has(x.key)) { flush(); continue; }
    if (cur.length && ((isDate && seenNum) || (x.k === 'num' && seenNum && seenDir) || (x.k === 'party' && seenNum && seenDir))) flush();
    cur.push(x);
    if (x.k === 'num') seenNum = true;
    if (isDir) seenDir = true;
    if (x.brk && seenNum) flush();
  }
  flush();
  return clauses;
}

function unknownName(items) {
  // token(s) right before a marker (ka/ne/ko/se...) that are not otherwise meaningful
  for (let n = 0; n < items.length; n++) {
    const x = items[n];
    if (x.k !== 'w' || !KW.marker.has(x.key)) continue;
    const p = items[n - 1];
    if (p && p.k === 'w' && p.raw.length >= 3 && !isKnownWord(p.key)) {
      const pp = items[n - 2];
      const two = pp && pp.k === 'w' && pp.raw.length >= 3 && !isKnownWord(pp.key) && !pp.brk;
      return { name: cap(two ? `${pp.raw} ${p.raw}` : p.raw), at: n };
    }
  }
  return null;
}
function isKnownWord(key) {
  return Object.values(KW).some((s) => s.has(key)) || MONTH_KEYS.has(key);
}
const cap = (s) => s.replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());

// ---------- public API ----------
/**
 * @param {string} text  Latin-script transcript
 * @param {{parties:Array<{id:string,name:string,type:string,aliases?:string[]}>}} ctx
 */
export function interpret(text, ctx = { parties: [] }) {
  const tokens = tokenize(text);
  if (!tokens.length) return { kind: 'empty' };
  const items = annotate(tokens, ctx.parties || []);
  const words = items.filter((x) => x.k === 'w');
  const nums = amountsOf(items);
  const partyItems = items.filter((x) => x.k === 'party');
  const first = words[0]?.i === 0 ? words[0] : null;
  const isQ = tokens.some((t) => t.q) || anyTok(items, KW.query);

  // 1. undo
  if (anyTok(items, KW.undo) && !nums.length) return { kind: 'undo' };

  // 2. correction ("nahi, 430" / "430 nahi 340" -> last number wins)
  const corrIdx = items.findIndex((x) => x.k === 'w' && KW.corr.has(x.key));
  if (corrIdx >= 0 && nums.length && (corrIdx === 0 || items[corrIdx - 1].k === 'num' || items[corrIdx - 1].k === 'party')) {
    const after = items.slice(corrIdx + 1);
    const a = amountsOf(after.length ? after : items);
    const ptype = null;
    return { kind: 'correction', amount: a.length ? a[a.length - 1] : nums[nums.length - 1], dir: directionOf(after, ptype),
      partyIds: after.find((x) => x.k === 'party')?.ids || null };
  }
  if (corrIdx === 0 && !nums.length) {
    const rest = items.slice(1);
    const dir = directionOf(rest, null);
    const pi = rest.find((x) => x.k === 'party');
    if (dir || pi) return { kind: 'correction', amount: null, dir, partyIds: pi?.ids || null };
  }

  // 3. expiry / stock queries
  const expiryQ = anyTok(items, KW.expiry) && isQ && !nums.length;
  if (expiryQ) return { kind: 'query', q: 'expiring' };

  // 4. stock arrival: "Oreo ke 20 packet aaye, expiry march"
  const qtyIdx = items.findIndex((x, n) => x.k === 'num' && items[n + 1]?.k === 'w' && KW.unit.has(items[n + 1].key));
  if ((qtyIdx >= 0 || anyTok(items, KW.expiry)) && !isQ && !partyItems.some((p) => ctx.parties.find((q) => q.id === p.ids[0])?.type === 'customer')) {
    return stockIntent(items, ctx, qtyIdx);
  }

  // 5. queries (no amount, or explicit question words)
  if (isQ && (!nums.length || anyTok(items, KW.summary))) return queryIntent(items, ctx, partyItems);
  if (!nums.length && (anyTok(items, KW.remind) || anyTok(items, KW.summary) || anyTok(items, KW.help))) return queryIntent(items, ctx, partyItems);
  if (!nums.length && partyItems.length) return queryIntent(items, ctx, partyItems, true);

  // 6. cash sale: amount + sale word, no party
  if (nums.length && anyTok(items, KW.sale) && !partyItems.length) {
    const mode = anyTok(items, S('upi gpay phonepe paytm online')) ? 'upi' : 'cash';
    return { kind: 'sale', amount: nums[0], mode, daysAgo: daysAgoOf(items) };
  }
  if (nums.length && !partyItems.length && anyTok(items, KW.cash) && anyTok(items, KW.pay)) {
    return { kind: 'sale', amount: nums[0], mode: 'cash', daysAgo: daysAgoOf(items) };
  }

  // 7. ledger entries
  if (nums.length) {
    const clauses = splitClauses(items);
    const entries = [];
    let lastParty = null;
    const unk = unknownName(items);
    for (const c of clauses) {
      const pi = c.find((x) => x.k === 'party');
      const am = amountsOf(c);
      if (!am.length) continue;
      let partyIds = pi ? pi.ids : null, newName = null, type = null;
      if (!partyIds && lastParty) { partyIds = lastParty.ids || null; newName = lastParty.newName || null; type = lastParty.type || null; }
      if (!partyIds && !newName && unk) newName = unk.name;
      const known = partyIds && partyIds.length === 1 ? ctx.parties.find((p) => p.id === partyIds[0]) : null;
      const wordsC = c.filter((x) => x.k === 'w');
      const supplierish = wordsC.some((x) => KW.supplierHint.has(x.key)) || (wordsC.some((x) => KW.purchase.has(x.key)) && wordsC.some((x) => KW.abl.has(x.key)));
      const ptype = known ? known.type : (newName && supplierish ? 'supplier' : 'customer');
      let dir = directionOf(c, ptype);
      if (!dir && lastParty?.dir && !c.some((x) => x.k === 'party')) dir = null;
      entries.push({ partyIds, newName, newType: known ? null : ptype, amount: am[0], dir, daysAgo: daysAgoOf(c) });
      lastParty = { ids: partyIds, newName, type: ptype, dir };
    }
    if (entries.length) return { kind: 'entries', entries };
  }
  // number alone -> maybe an answer to a question ("340")
  if (nums.length === 1 && words.every((w) => KW.money.has(w.key) || KW.stop.has(w.key))) return { kind: 'number', amount: nums[0] };
  return { kind: 'unknown' };
}

function queryIntent(items, ctx, partyItems, bare = false) {
  const has_ = (set) => anyTok(items, set);
  if (has_(KW.remind) && partyItems.length) return { kind: 'query', q: 'reminder', partyIds: partyItems[0].ids };
  if (has_(KW.undo)) return { kind: 'undo' };
  if (has_(KW.help)) return { kind: 'query', q: 'help' };
  if (partyItems.length && !has_(KW.today)) return { kind: 'query', q: 'balance', partyIds: partyItems[0].ids };
  if (has_(KW.summary) && !has_(KW.credit)) return { kind: 'query', q: 'summary' };
  if (has_(KW.top)) return { kind: 'query', q: has_(S('supplier suppliers wholesaler distributor vendor kisko')) ? 'payables' : 'top_debtors' };
  if (has_(KW.today) && has_(KW.credit)) return { kind: 'query', q: 'today_credit' };
  if (has_(KW.today) && (has_(KW.sale))) return { kind: 'query', q: 'today_sales' };
  if (has_(KW.today) && (has_(KW.pay) || has_(S('aaya mila mile')))) return { kind: 'query', q: 'today_collected' };
  if (has_(KW.today)) return { kind: 'query', q: 'today_sales' };
  if (has_(KW.sale)) return { kind: 'query', q: 'today_sales' };
  if (has_(KW.payable)) return { kind: 'query', q: 'payables' };
  if (has_(KW.stockw)) return { kind: 'query', q: 'stock' };
  if (has_(KW.count) || (has_(KW.people) && has_(KW.credit))) return { kind: 'query', q: 'debtors' };
  if (has_(KW.receivable) || has_(KW.credit) || has_(S('total hisab hisaab'))) return { kind: 'query', q: 'receivable' };
  return { kind: 'unknown' };
}

function monthDate(items) {
  // "12 march 2027" | "march 2027" | "12/03/2027" | "3 mahine baad"
  for (let n = 0; n < items.length; n++) {
    const x = items[n];
    if (x.k === 'w' && MONTH_KEYS.has(x.key)) {
      const m = MONTH_KEYS.get(x.key);
      const a = items[n - 1], b = items[n + 1];
      let d = a?.k === 'num' && a.value >= 1 && a.value <= 31 ? a.value : null;
      let y = b?.k === 'num' && b.value >= 2025 && b.value <= 2040 ? b.value : null;
      return { m, d, y };
    }
    if (x.k === 'num' && items[n + 1]?.k === 'w' && MONTH_WORD.has(items[n + 1].key)) return { rel: x.value };
  }
  return null;
}
function stockIntent(items, ctx, qtyIdx) {
  const qItem = qtyIdx >= 0 ? items[qtyIdx] : items.find((x) => x.k === 'num');
  const unit = qtyIdx >= 0 ? items[qtyIdx + 1].raw : 'pcs';
  const when = monthDate(items);
  const drop = new Set();
  items.forEach((x, n) => { if (x.k === 'num' || x.k === 'party') drop.add(n); });
  if (qtyIdx >= 0) drop.add(qtyIdx + 1);
  const nameToks = items.filter((x, n) => x.k === 'w' && !drop.has(n) && !isKnownWord(x.key) && !MONTH_KEYS.has(x.key) && !KW.stop.has(x.key) && !KW.marker.has(x.key) && x.raw.length > 1).map((x) => x.raw);
  const sup = items.find((x) => x.k === 'party' && ctx.parties.find((p) => p.id === x.ids[0])?.type === 'supplier');
  return { kind: 'stock', item: cap(nameToks.join(' ')), qty: qItem ? qItem.value : 1, unit, when, supplierIds: sup?.ids || null,
    amount: amountsOf(items.filter((x) => x.k !== 'num' || x !== qItem))[0] || null };
}

/** Resolve a month/date mention into an ISO date (end of month when day is absent). */
export function resolveExpiry(when, today = new Date()) {
  if (!when) return null;
  if (when.rel) { const d = new Date(today); d.setMonth(d.getMonth() + when.rel); return iso(d); }
  let y = when.y || today.getFullYear();
  if (!when.y && new Date(y, when.m - 1, when.d || 28) < today) y++;
  const d = when.d || new Date(y, when.m, 0).getDate();
  return iso(new Date(y, when.m - 1, d));
}
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------- dialog helpers ----------
export function yesNo(text) {
  const toks = tokenize(text).map((t) => nk(t.t));
  const y = toks.some((k) => KW.yes.has(k)) , n = toks.some((k) => KW.no.has(k));
  if (n && !y) return 'no';
  if (y && !n) return 'yes';
  if (n && y) return toks.findIndex((k) => KW.no.has(k)) < toks.findIndex((k) => KW.yes.has(k)) ? 'no' : 'yes';
  return null;
}
export function pickCandidate(text, cands) {
  const toks = tokenize(text).map((t) => t.t);
  const keys = toks.map(nk);
  if (keys.some((k) => KW.ordinal1.has(k))) return cands[0];
  if (keys.some((k) => KW.ordinal2.has(k))) return cands[1] || null;
  if (keys.some((k) => KW.ordinal3.has(k))) return cands[2] || null;
  const scored = cands.map((c) => ({ c, hit: toks.some((t) => c.name.split(/\s+/).slice(1).some((w) => nameKey(w) === nameKey(t))) || toks.some((t) => nameKey(c.name) === nameKey(t)) }));
  const hits = scored.filter((s) => s.hit);
  return hits.length === 1 ? hits[0].c : null;
}
export function stockAnswer(text) {
  const k = tokenize(text).map((t) => nk(t.t));
  if (k.some((x) => KW.out.has(x))) return 'out';
  if (k.some((x) => KW.slow.has(x)) && !k.some((x) => KW.selling.has(x) && !KW.slow.has(x))) return 'slow';
  if (k.some((x) => KW.slow.has(x) && (x === 'nahi' || x === 'not'))) return 'slow';
  if (k.some((x) => KW.selling.has(x))) return 'selling';
  const yn = yesNo(text);
  return yn === 'yes' ? 'selling' : yn === 'no' ? 'slow' : null;
}
export const hasWake = (text) => /^\s*(hey |ok |okay |hello )?(khata|kata|khaata)\b/i.test(text);
export const stripWake = (text) => text.replace(/^\s*(hey |ok |okay |hello )?(khata|kata|khaata)[\s,.!-]*/i, '');
/** The digits stream mangles halves ("saade teen sau" -> "सादे 300"); when it contains one, trust the words stream. */
export const hasFractionWord = (t) => /सादे|साढ़े|साढे|डेढ़|डेढ|ढाई|सवा|पौने|(sade|saade|saadhe|dedh|dhai|sawa|paune)/i.test(t || '');
/** Digit amounts from the second (digit) STT stream, in order, ignoring quantities. */
export function digitAmounts(text) {
  const items = annotate(tokenize(text), []);
  return amountsOf(items);
}

/** Direction from a short free-text answer ("udhaar", "jama", "payment tha"). */
export function dirFromText(text, ptype = 'customer') {
  const items = annotate(tokenize(text), []);
  const w = items.filter((x) => x.k === 'w');
  if (ptype === 'supplier') {
    if (w.some((x) => KW.purchase.has(x.key) || KW.credit.has(x.key))) return 'purchase';
    if (w.some((x) => KW.pay.has(x.key) || KW.give.has(x.key))) return 'supplier_payment';
    return null;
  }
  if (w.some((x) => KW.pay.has(x.key) || KW.give.has(x.key) || KW.cash.has(x.key) || tamilGive(x.key) === 'pay')) return 'payment';
  if (w.some((x) => KW.credit.has(x.key) || tamilGive(x.key) === 'credit')) return 'credit';
  return null;
}
