// Ledger domain logic. Pure data + maths, no UI, no I/O (persistence is injected).
import { iso } from './nlu/parse.js';

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const dayOf = (d = new Date()) => iso(d);
const daysBack = (n, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() - n); return d; };

export function emptyState(profile) {
  return { v: 1, profile, parties: [], entries: [], sales: [], stock: [], log: [], followups: [] };
}

export class Ledger {
  constructor(state, onChange = () => {}) { this.s = state; this.s.followups ||= []; this.onChange = onChange; }
  commit() { this.onChange(this.s); }

  // ----- parties -----
  get parties() { return this.s.parties; }
  party(id) { return this.s.parties.find((p) => p.id === id); }
  addParty(name, type = 'customer', extra = {}) {
    const p = { id: uid(), name: name.trim(), type, optIn: false, phone: '', createdAt: Date.now(), ...extra };
    this.s.parties.push(p); this.commit(); return p;
  }
  setOptIn(id, v) { const p = this.party(id); if (p) { p.optIn = !!v; this.commit(); } }

  // ----- entries -----
  addEntry({ partyId, kind, amount, daysAgo = 0 }) {
    const e = { id: uid(), partyId, kind, amount: Math.round(amount), date: dayOf(daysBack(daysAgo)), ts: Date.now() };
    this.s.entries.push(e); this.s.log.push({ t: e.ts, id: e.id }); this.commit(); return e;
  }
  lastEntry() { return this.s.entries.length ? this.s.entries.reduce((a, b) => (b.ts >= a.ts ? b : a)) : null; }
  removeEntry(id) { this.s.entries = this.s.entries.filter((e) => e.id !== id); this.commit(); }
  patchEntry(id, patch) { const e = this.s.entries.find((x) => x.id === id); if (e) { Object.assign(e, patch); this.commit(); } return e; }
  addSale(amount, mode = 'cash', daysAgo = 0) {
    const e = { id: uid(), amount: Math.round(amount), mode, date: dayOf(daysBack(daysAgo)), ts: Date.now(), sale: true };
    this.s.sales.push(e); this.commit(); return e;
  }
  /** Most recent item (entry or sale) for undo / correction. */
  last() {
    const a = this.lastEntry();
    const b = this.s.sales.length ? this.s.sales.reduce((x, y) => (y.ts >= x.ts ? y : x)) : null;
    if (a && b) return a.ts >= b.ts ? { type: 'entry', rec: a } : { type: 'sale', rec: b };
    return a ? { type: 'entry', rec: a } : b ? { type: 'sale', rec: b } : null;
  }
  removeLast() {
    const l = this.last(); if (!l) return null;
    if (l.type === 'entry') this.removeEntry(l.rec.id); else { this.s.sales = this.s.sales.filter((x) => x.id !== l.rec.id); this.commit(); }
    return l;
  }

  // ----- questions parked while the shopkeeper was busy; asked again at day end -----
  addFollowup({ entryId, party, kind, amount }) {
    if (this.s.followups.some((f) => f.entryId === entryId && !f.done)) return;
    this.s.followups.push({ id: uid(), entryId, party, kind, amount, done: false, ts: Date.now() }); this.commit();
  }
  openFollowups() { return this.s.followups.filter((f) => !f.done && this.s.entries.some((e) => e.id === f.entryId)); }
  closeFollowup(id) { const f = this.s.followups.find((x) => x.id === id); if (f) { f.done = true; this.commit(); } }

  // ----- balances -----
  /** Customer: what they owe me. Supplier: what I owe them. Always >= or <= 0 allowed (advance). */
  balance(partyId) {
    const p = this.party(partyId); if (!p) return 0;
    const plus = p.type === 'supplier' ? 'purchase' : 'credit';
    const minus = p.type === 'supplier' ? 'supplier_payment' : 'payment';
    return this.s.entries.filter((e) => e.partyId === partyId).reduce((t, e) => t + (e.kind === plus ? e.amount : e.kind === minus ? -e.amount : 0), 0);
  }
  entriesOf(partyId) { return this.s.entries.filter((e) => e.partyId === partyId).sort((a, b) => b.ts - a.ts); }
  debtors() {
    return this.s.parties.filter((p) => p.type === 'customer').map((p) => ({ p, bal: this.balance(p.id) })).filter((x) => x.bal > 0).sort((a, b) => b.bal - a.bal);
  }
  payables() {
    return this.s.parties.filter((p) => p.type === 'supplier').map((p) => ({ p, bal: this.balance(p.id) })).filter((x) => x.bal > 0).sort((a, b) => b.bal - a.bal);
  }
  receivableTotal() { return this.debtors().reduce((t, x) => t + x.bal, 0); }
  payableTotal() { return this.payables().reduce((t, x) => t + x.bal, 0); }

  /** Money picture for a day. Bikri = cash/UPI sales + udhaar given (goods sold on credit). */
  day(date = dayOf()) {
    const sum = (arr) => arr.reduce((t, x) => t + x.amount, 0);
    const sales = sum(this.s.sales.filter((x) => x.date === date));
    const credit = sum(this.s.entries.filter((e) => e.date === date && e.kind === 'credit'));
    const collected = sum(this.s.entries.filter((e) => e.date === date && e.kind === 'payment'));
    const bought = sum(this.s.entries.filter((e) => e.date === date && e.kind === 'purchase'));
    const paidOut = sum(this.s.entries.filter((e) => e.date === date && e.kind === 'supplier_payment'));
    return { sales, credit, collected, bought, paidOut, revenue: sales + credit };
  }

  // ----- stock -----
  addStock({ item, qty, unit, expiry, supplierId, cost }) {
    const it = { id: uid(), item, qty, unit, expiry: expiry || null, supplierId: supplierId || null, cost: cost || null, boughtOn: dayOf(), status: 'unknown', askedOn: null };
    this.s.stock.push(it); this.commit(); return it;
  }
  expiring(withinDays = 30, from = new Date()) {
    const lim = dayOf(new Date(from.getTime() + withinDays * 864e5)), now = dayOf(from);
    return this.s.stock.filter((x) => x.expiry && x.status !== 'out' && x.expiry <= lim).map((x) => ({ ...x, expired: x.expiry < now }))
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
  }
  /** Items worth asking about at day end: bought recently, not already resolved today. */
  toAsk(limit = 3, from = new Date()) {
    const now = dayOf(from), since = dayOf(daysBack(14, from));
    return this.s.stock.filter((x) => x.status !== 'out' && x.boughtOn >= since && x.askedOn !== now).slice(0, limit);
  }
  setStockStatus(id, status) { const x = this.s.stock.find((s) => s.id === id); if (x) { x.status = status; x.askedOn = dayOf(); this.commit(); } }

  /** Everything a judge or owner may want to wipe. */
  wipe() { this.s.parties = []; this.s.entries = []; this.s.sales = []; this.s.stock = []; this.s.log = []; this.commit(); }
}

/** Seed synthetic data (consented / fake only) for demos and tests. */
export function seedDemo(L) {
  const ramK = L.addParty('Ramesh Kumar'), ramS = L.addParty('Ramesh Sharma'), sur = L.addParty('Suresh'), gee = L.addParty('Geeta Devi'), mur = L.addParty('Murugan');
  const par = L.addParty('Parle Distributor', 'supplier'), atta = L.addParty('Annapurna Atta Mill', 'supplier');
  L.setOptIn(sur.id, true);
  L.addEntry({ partyId: ramK.id, kind: 'credit', amount: 340, daysAgo: 3 });
  L.addEntry({ partyId: ramS.id, kind: 'credit', amount: 1200, daysAgo: 6 });
  L.addEntry({ partyId: sur.id, kind: 'credit', amount: 560, daysAgo: 2 });
  L.addEntry({ partyId: gee.id, kind: 'credit', amount: 220, daysAgo: 1 });
  L.addEntry({ partyId: mur.id, kind: 'credit', amount: 780, daysAgo: 4 });
  L.addEntry({ partyId: mur.id, kind: 'payment', amount: 300, daysAgo: 1 });
  L.addEntry({ partyId: par.id, kind: 'purchase', amount: 5000, daysAgo: 2 });
  L.addEntry({ partyId: par.id, kind: 'supplier_payment', amount: 2000, daysAgo: 1 });
  L.addEntry({ partyId: atta.id, kind: 'purchase', amount: 3200, daysAgo: 5 });
  L.addSale(1850, 'cash', 0); L.addSale(920, 'upi', 0);
  const m = new Date(); m.setDate(m.getDate() + 9);
  L.addStock({ item: 'Oreo', qty: 20, unit: 'packet', expiry: dayOf(m), supplierId: par.id });
  const m2 = new Date(); m2.setMonth(m2.getMonth() + 5);
  L.addStock({ item: 'Parle-G', qty: 40, unit: 'packet', expiry: dayOf(m2), supplierId: par.id });
}
