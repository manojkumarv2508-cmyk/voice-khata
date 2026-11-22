import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger, emptyState, seedDemo } from '../public/js/ledger.js';
import { Agent } from '../public/js/agent.js';

function setup(lang = 'en') {
  const L = new Ledger(emptyState({ shop: 'T', name: 'Vishan Kumar' })); seedDemo(L);
  const a = new Agent(L, () => lang);
  return { L, a, say: (w) => a.handle({ w, d: '' }) };
}

test('small talk: greeting, how are you, thanks, who are you, bye, slow day, time', () => {
  const { say } = setup();
  assert.match(say('namaste').say, /Vishan/);
  assert.match(say('kaise ho').say, /doing well/);
  assert.match(say('shukriya').say, /welcome/);
  assert.match(say('tum kaun ho').say, /AI assistant/);
  assert.match(say('aaj dhanda slow hai').say, /slow/);
  assert.match(say('ok bye').say, /take care/);
  assert.match(say('time kya hua').say, /It is/);
  assert.equal(say('namaste').kind, 'chat');
});

test('off-topic gets an honest answer, not a made-up one', () => {
  assert.match(setup().say('cricket ka score kya hai').say, /only help with your khata/);
});

test('entry -> "are you in a rush?"; yes -> parked for day end', () => {
  const { say, L } = setup();
  const r = say('Suresh ka 340 udhaar');
  assert.match(r.say, /Are you in a rush, Vishan\?/);
  assert.match(say('haan jaldi mein hoon').say, /end of the day/);
  assert.equal(L.openFollowups().length, 1);
});

test('not in a rush -> asks what happened and saves the answer on the entry', () => {
  const { say, L } = setup();
  say('Suresh ka 340 udhaar');
  assert.match(say('nahi fursat hai').say, /What did Suresh take\?/);
  assert.match(say('atta aur chawal').say, /Noted: atta aur chawal/);
  assert.equal(L.lastEntry().note, 'atta aur chawal');
  assert.equal(L.openFollowups().length, 0);
});

test('going straight to the next entry means busy: parks silently, no nagging while rushed', () => {
  const { say, L } = setup();
  say('Suresh ka 340 udhaar');
  const r2 = say('Murugan ka 100 udhaar'); // ignored the question
  assert.doesNotMatch(r2.say, /rush/);
  assert.equal(L.openFollowups().length, 2);
});

test('session closing while the question is open parks it instead of losing it', () => {
  const { say, a, L } = setup();
  say('Suresh ka 340 udhaar'); a.expirePending();
  assert.equal(L.openFollowups().length, 1);
});

test('day end: "as promised" + parked questions, answers become notes, then stock question', () => {
  const { say, L } = setup();
  say('Suresh ka 340 udhaar'); say('jaldi hai');
  const r = say('din ka hisab');
  assert.match(r.say, /As promised/); assert.match(r.say, /What did Suresh take\?/);
  const done = say('biscuit aur chai');
  assert.match(done.say, /Noted: biscuit aur chai/); assert.match(done.say, /selling today\?/);
  assert.equal(L.s.entries.find((e) => e.note === 'biscuit aur chai').amount, 340);
  assert.equal(L.openFollowups().length, 0);
});

test('undone entries do not leave orphan questions', () => {
  const { say, L } = setup();
  say('Suresh ka 340 udhaar'); say('jaldi'); say('pichla hata do');
  assert.equal(L.openFollowups().length, 0);
});

test('Hindi and Kannada versions of the loop exist', () => {
  assert.match(setup('hi').say('Suresh ka 100 udhaar').say, /जल्दी में/);
  assert.match(setup('kn').say('Suresh ka 100 udhaar').say, /ಅವಸರದಲ್ಲಿದ್ದೀರಾ/);
});
