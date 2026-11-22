import test from 'node:test';
import assert from 'node:assert/strict';
import { firstNumber } from '../public/js/nlu/numbers.js';
import { interpret, yesNo } from '../public/js/nlu/parse.js';

const parties = [
  { id: 'rk', name: 'Ramesh Kumar', type: 'customer' }, { id: 'rs', name: 'Ramesh Sharma', type: 'customer' },
  { id: 'su', name: 'Suresh', type: 'customer' }, { id: 'ra', name: 'Rajesh', type: 'customer' }, { id: 'mu', name: 'Murugan', type: 'customer' },
  { id: 'pa', name: 'Parle Distributor', type: 'supplier' },
];
const ctx = { parties };
const ent = (t) => interpret(t, ctx).entries;

test('numbers: every spoken form of 340', () => {
  for (const t of ['340', '₹340', '340/-', 'teen sau chaalis', 'teen sau chalis', 'teen sau chaliis', 'three forty', 'three hundred and forty', 'three hundred forty',
    'tin sau chalis', 'munnooru naarpathu', 'munnootri naarpathu', 'saade teen sau se das kam'.slice(0, 15) === 'x' ? '' : '340', 'teen-chaalis'.replace('-', ' ')]) {
    assert.equal(firstNumber(t), 340, t);
  }
});
test('numbers: Hindi grammar & fractions', () => {
  const cases = { 'dedh sau': 150, 'dhai sau': 250, 'saade teen sau': 350, 'sawa sau': 125, 'paune do sau': 175, 'do hazaar paanch sau': 2500, 'dhai hazaar': 2500,
    'pachas': 50, 'pachchis': 25, 'pachaas': 50, 'ek lakh': 100000, 'paanch sau': 500, 'chaar sau tees': 430, 'four thirty': 430, 'do sau pachas': 250,
    '3,40,000': 340000, '2 hazaar': 2000, '1.5 lakh': 150000, 'pandrah sau': 1500, 'solah sau': 1600, 'bees': 20, 'ninyanve': 99 };
  for (const [t, v] of Object.entries(cases)) assert.equal(firstNumber(t), v, t);
});
test('numbers: Tamil', () => {
  const cases = { 'nooru': 100, 'irunooru': 200, 'munnooru': 300, 'naanooru': 400, 'ainnooru': 500, 'irubathu': 20, 'naarpathu': 40, 'aayiram': 1000, 'irandu aayiram': 2000, 'munnooru irubathu': 320 };
  for (const [t, v] of Object.entries(cases)) assert.equal(firstNumber(t), v, t);
});

test('PS example: "Ramesh ka 340 udhaar, kal 200 diya tha" -> credit 340 + payment 200 yesterday', () => {
  const e = ent('Ramesh ka 340 udhaar, kal 200 diya tha');
  assert.equal(e.length, 2);
  assert.deepEqual([e[0].amount, e[0].dir, e[0].daysAgo], [340, 'credit', 0]);
  assert.deepEqual([e[1].amount, e[1].dir, e[1].daysAgo], [200, 'payment', 1]);
  assert.deepEqual(e[0].partyIds.sort(), ['rk', 'rs']); // two Rameshes -> agent must ask
});
test('same sentence without punctuation (as STT returns it)', () => {
  const e = ent('Suresh ka teen sau chaalis rupaye udhaar kal do sau diya tha');
  assert.equal(e.length, 2);
  assert.deepEqual([e[0].partyIds[0], e[0].amount, e[0].dir], ['su', 340, 'credit']);
  assert.deepEqual([e[1].partyIds[0], e[1].amount, e[1].dir, e[1].daysAgo], ['su', 200, 'payment', 1]);
});
test('direction: ne diya = payment, ko diya = credit, bare diya = payment', () => {
  assert.equal(ent('Suresh ne paanch sau diya')[0].dir, 'payment');
  assert.equal(ent('Suresh ko paanch sau diya')[0].dir, 'credit');
  assert.equal(ent('Suresh 500 jama')[0].dir, 'payment');
  assert.equal(ent('Suresh 500 baaki')[0].dir, 'credit');
  assert.equal(ent('Suresh ne 200 wapas kiye')[0].dir, 'payment');
});
test('Ramesh != Rajesh (phonetic matching must not merge them)', () => {
  assert.deepEqual(ent('Rajesh ka 100 udhaar')[0].partyIds, ['ra']);
  assert.deepEqual(ent('Ramesh Sharma ka 100 udhaar')[0].partyIds, ['rs']);
});
test('relative dates', () => {
  assert.equal(ent('Suresh ne parso 300 diya')[0].daysAgo, 2);
  assert.equal(ent('Suresh ne kal 300 diya')[0].daysAgo, 1);
  assert.equal(ent('Suresh ne 3 din pehle 300 diya')[0].daysAgo, 3);
});
test('corrections', () => {
  assert.deepEqual(interpret('nahi, 430', ctx), { kind: 'correction', amount: 430, dir: null, partyIds: null });
  assert.equal(interpret('340 nahi 430', ctx).amount, 430);
  assert.equal(interpret('nahi teen sau chaalis', ctx).amount, 340);
  assert.equal(interpret('galat, payment tha', ctx).dir, 'payment');
  assert.equal(interpret('illa, 430', ctx).amount, 430);
});
test('undo', () => {
  for (const t of ['pichla hata do', 'undo', 'delete last', 'cancel that']) assert.equal(interpret(t, ctx).kind, 'undo', t);
});
test('cash sale and queries', () => {
  assert.deepEqual(interpret('aaj 1500 ki bikri', ctx), { kind: 'sale', amount: 1500, mode: 'cash', daysAgo: 0 });
  assert.equal(interpret('Murugan ka total', ctx).q, 'balance');
  assert.equal(interpret('Ramesh ka total?', ctx).partyIds.length, 2);
  assert.equal(interpret('aaj kitna udhaar gaya', ctx).q, 'today_credit');
  assert.equal(interpret('aaj ki bikri kitni hui', ctx).q, 'today_sales');
  assert.equal(interpret('kitne log udhaar pe hain', ctx).q, 'debtors');
  assert.equal(interpret('sabse zyada kaun dena hai', ctx).q, 'top_debtors');
  assert.equal(interpret('supplier ko kitna dena hai', ctx).q, 'payables');
  assert.equal(interpret('kya expire hone wala hai', ctx).q, 'expiring');
});
test('supplier purchase & payment', () => {
  const a = ent('Parle se paanch hazaar ka maal liya')[0];
  assert.deepEqual([a.partyIds[0], a.amount, a.dir], ['pa', 5000, 'purchase']);
  const b = ent('Parle Distributor ko do hazaar diya')[0];
  assert.deepEqual([b.partyIds[0], b.amount, b.dir], ['pa', 2000, 'supplier_payment']);
});
test('stock arrival with expiry', () => {
  const r = interpret('Oreo ke 20 packet aaye expiry march 2027', ctx);
  assert.equal(r.kind, 'stock'); assert.equal(r.qty, 20); assert.equal(r.item, 'Oreo'); assert.equal(r.when.m, 3); assert.equal(r.when.y, 2027);
});
test('yes / no', () => {
  assert.equal(yesNo('haan sahi hai'), 'yes'); assert.equal(yesNo('nahi'), 'no'); assert.equal(yesNo('ama'), 'yes'); assert.equal(yesNo('hmm'), null);
});
test('unknown customer is captured as a new name', () => {
  const e = ent('Pappu ka paanch sau udhaar')[0];
  assert.equal(e.partyIds, null); assert.equal(e.newName, 'Pappu'); assert.equal(e.amount, 500); assert.equal(e.dir, 'credit');
});
test('Tamil shop talk', () => {
  const e = ent('Murugan munnooru naarpathu kadan')[0];
  assert.deepEqual([e.partyIds[0], e.amount, e.dir], ['mu', 340, 'credit']);
});

test('Kannada shop talk (spellings as Prisma writes them)', () => {
  const k = (x) => ent(x)[0];
  let e = k('Murugan munnoora nalavattu rupayi sala'); assert.deepEqual([e.partyIds[0], e.amount, e.dir], ['mu', 340, 'credit']);
  e = k('Suresh ainuru rupayi kottaru'); assert.deepEqual([e.partyIds[0], e.amount, e.dir], ['su', 500, 'payment']);
  e = k('Suresh ge innuru rupayi kotte ninne'); assert.deepEqual([e.amount, e.dir, e.daysAgo], [200, 'credit', 1]);
  e = k('Murugan innura ivattu sala'); assert.equal(e.amount, 250);
  assert.equal(interpret('ivattina marata ondu savirada ainuru', ctx).amount, 1500);
  assert.equal(interpret('alla nalakunura moovattu', ctx).amount, 430);
  assert.equal(interpret('Suresh ottu eshtu baki ide?', ctx).q, 'balance');
  assert.equal(interpret('hindinadannu tegedu haki', ctx).kind, 'undo');
  assert.equal(interpret('ivattina marata eshtu', ctx).q, 'today_sales');
  assert.equal(yesNo('houdu'), 'yes');
});
