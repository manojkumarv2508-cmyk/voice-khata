import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger, emptyState, seedDemo } from '../public/js/ledger.js';
import { Agent } from '../public/js/agent.js';

function setup(lang = 'en') {
  const L = new Ledger(emptyState({ shop: 'Test Kirana' }));
  seedDemo(L);
  const a = new Agent(L, () => lang);
  const name = (n) => L.parties.find((p) => p.name === n);
  return { L, a, name, say: (w, d) => a.handle({ w, d }) };
}

test('AI disclosure is the first thing said, in the selected language', () => {
  for (const [lang, word] of [['en', 'AI assistant'], ['hi', 'एआई'], ['ta', 'ஏஐ']]) assert.match(setup(lang).a.greeting().say, new RegExp(word));
});

test('two customers called Ramesh -> asks which one, then commits both clauses', () => {
  const { a, L, name, say } = setup();
  const before = L.balance(name('Ramesh Sharma').id);
  const q = say('Ramesh ka teen sau chaalis rupaye udhaar kal do sau diya tha');
  assert.match(q.say, /Which Ramesh\? Ramesh Kumar or Ramesh Sharma/);
  const r = say('Sharma');
  assert.equal(r.kind, 'entry');
  assert.equal(L.balance(name('Ramesh Sharma').id), before + 340 - 200);
  assert.equal(L.balance(name('Ramesh Kumar').id), 340); // untouched
  assert.equal(L.s.entries.at(-1).date, new Date(Date.now() - 864e5).toLocaleDateString('sv')); // "kal"
});

test('spoken correction changes the last entry only', () => {
  const { a, L, name, say } = setup();
  say('Suresh ka 340 udhaar');
  const b0 = L.balance(name('Suresh').id);
  const r = say('nahi, 430');
  assert.equal(r.kind, 'fix');
  assert.equal(L.balance(name('Suresh').id), b0 + 90);
});

test('digit stream disagrees with word stream -> asks instead of guessing', () => {
  const { a, L, name, say } = setup();
  const q = say('Suresh ka teen sau chaalis udhaar', 'सुरेश का 430 उधार');
  assert.match(q.say, /340 or 430/);
  assert.equal(L.entries?.length ?? 0, 0);
  const before = L.balance(name('Suresh').id);
  const r = say('chaar sau tees');
  assert.equal(r.kind, 'entry');
  assert.equal(L.balance(name('Suresh').id), before + 430);
});

test('streams agree -> no question, straight commit', () => {
  const { say } = setup();
  assert.equal(say('Suresh ka teen sau chaalis udhaar', 'सुरेश का 340 उधार').kind, 'entry');
});

test('unknown customer: asks once, then creates', () => {
  const { a, L, say } = setup();
  assert.match(say('Pappu ka paanch sau udhaar').say, /new customer/);
  assert.equal(say('haan').kind, 'entry');
  assert.equal(L.parties.find((p) => p.name === 'Pappu') && L.balance(L.parties.find((p) => p.name === 'Pappu').id), 500);
});

test('ambiguous direction -> short question; "no" cancels cleanly', () => {
  const { say, L } = setup();
  assert.match(say('Suresh 200').say, /udhaar or payment/);
  assert.equal(say('payment').kind, 'entry');
  assert.match(say('Pappu ka 100').say, /new customer/);
  assert.equal(say('nahi').kind, 'cancel');
});

test('huge amount needs confirmation (guards against 3,40,000 slips)', () => {
  const { say, name, L } = setup();
  assert.match(say('Suresh ka teen lakh chaalis hazaar udhaar').say, /is that right/);
  const b = L.balance(name('Suresh').id);
  say('nahi');
  assert.equal(L.balance(name('Suresh').id), b);
});

test('undo removes exactly the last entry', () => {
  const { say, L, name } = setup();
  const b = L.balance(name('Suresh').id);
  say('Suresh ka 100 udhaar');
  assert.equal(say('pichla hata do').kind, 'undo');
  assert.equal(L.balance(name('Suresh').id), b);
});

test('spoken answers: totals, today, receivable, payables', () => {
  const { say } = setup();
  assert.match(say('Murugan ka total').say, /Murugan owes 480 rupees/);
  assert.match(say('aaj kitna udhaar gaya').say, /0 rupees|rupees of udhaar/);
  assert.match(say('kitne log udhaar pe hain').say, /people owe you/);
  assert.match(say('supplier ko kitna dena hai').say, /owe suppliers 6200/);
  assert.match(say('Ramesh ka total').say, /Ramesh Kumar owes 340.*Ramesh Sharma owes 1200/);
});

test('suppliers: purchase and payment move the payable', () => {
  const { say, L, name } = setup();
  const p = name('Parle Distributor').id, b = L.balance(p);
  say('Parle se paanch sau ka maal liya');
  assert.equal(L.balance(p), b + 500);
  say('Parle Distributor ko do sau diya');
  assert.equal(L.balance(p), b + 300);
});

test('stock + expiry + end-of-day sell-through question', () => {
  const { say, L } = setup();
  assert.equal(say('Maggi ke 30 packet aaye expiry december 2027').kind, 'stock');
  assert.equal(L.s.stock.at(-1).expiry, '2027-12-31');
  assert.match(say('kya expire hone wala hai').say, /Oreo/);
  const eod = say('din ka hisab');
  assert.match(eod.say, /Today's sales/); assert.match(eod.say, /selling today\?/);
  assert.match(say('haan bik raha hai').say, /selling well/);
});

test('reminders: only for opted-in customers, always polite, never auto-sent', () => {
  const { say } = setup();
  assert.match(say('Murugan ko reminder bhejo').say, /not opted in/);
  const r = say('Suresh ko reminder bhejo');
  assert.equal(r.kind, 'reminder');
  assert.match(r.reminder.text, /whenever convenient/i);
  assert.doesNotMatch(r.reminder.text, /legal|police|threat|immediately|or else|penalty/i);
});

test('Hindi and Tamil replies come back in-script', () => {
  const hi = setup('hi').say('Suresh ka 100 udhaar').say; assert.match(hi, /उधार/);
  const ta = setup('ta').say('Suresh ka 100 udhaar').say; assert.match(ta, /கடன்/);
});

test('noise garbage never writes to the ledger', () => {
  const { say, L } = setup();
  const n = L.s.entries.length;
  for (const junk of ['hmm', 'ok so', 'the', 'bus horn kya', 'acha acha']) say(junk);
  assert.equal(L.s.entries.length, n);
});

test('Kannada: every spoken string exists and replies come back in Kannada script', async () => {
  const { S, KN_KEYS } = await import('../public/js/i18n.js');
  assert.deepEqual([...KN_KEYS].sort(), Object.keys(S).sort()); // no key missing in any language
  const probe = { revenue: 1, collected: 2, credit: 3, rec: 4, pay: 5, top: { n: 'A', a: 6 }, exp: 1 };
  const args = { summary: [probe], top: [[{ n: 'A', a: 1 }]], expiring: [[{ item: 'X', days: 3 }]], stockList: [[{ item: 'X', qty: 1 }]], payables: [5, [{ n: 'A', a: 1 }]] };
  for (const [k, v] of Object.entries(S)) {
    const out = typeof v === 'function' ? v('kn', ...(args[k] || ['Ramesh', 3, 4, 5])) : v.kn;
    assert.ok(out && !/undefined/.test(out), k);
  }
  const s = setup('kn');
  assert.match(s.a.greeting().say, /ಎಐ/);
  assert.match(s.say('Suresh ka 100 udhaar').say, /ಸಾಲ/);
  assert.match(s.say('Murugan ka total').say, /Murugan ಅವರಿಂದ 480/);
});
