// Dialog manager: turns what the shopkeeper said into ledger changes and a short spoken reply.
// Entirely deterministic and local -> replies are instant and ledger data never leaves the device.
import { interpret, yesNo, pickCandidate, stockAnswer, digitAmounts, dirFromText, resolveExpiry, tokenize, hasFractionWord, KW } from './nlu/parse.js';
import { parseNumberAt, nk } from './nlu/numbers.js';
import { S, money, when } from './i18n.js';
import { C, chatIntent, rushAnswer, isSkip, isLater } from './chat.js';

const CMD = ['entries', 'sale', 'stock', 'undo', 'correction', 'query']; // he went straight on to something else
const CMD_NOQ = ['entries', 'sale', 'stock', 'undo', 'correction'];

const BIG = 20000; // ask "is that right?" above this amount
const toType = (dir, ptype) => {
  if (ptype === 'supplier') return dir === 'credit' ? 'purchase' : dir === 'payment' ? 'supplier_payment' : dir;
  return dir === 'purchase' ? 'credit' : dir === 'supplier_payment' ? 'payment' : dir;
};

export class Agent {
  constructor(ledger, getLang = () => 'hi') {
    this.L = ledger; this.lang = getLang; this.pending = null; this.lastCard = null; this.rushUntil = 0;
  }
  get l() { return this.lang(); }
  ctx() { return { parties: this.L.parties.map((p) => ({ id: p.id, name: p.name, type: p.type, aliases: p.aliases })) }; }
  /** Words to bias the speech recogniser towards: names, products, shop vocabulary. */
  keyterms() {
    const names = this.L.parties.flatMap((p) => p.name.split(/\s+/));
    const items = this.L.s.stock.map((s) => s.item);
    return [...new Set([...names, ...items, 'udhaar', 'jama', 'khata', 'baaki', 'bikri', 'expiry'])].filter(Boolean).slice(0, 190);
  }
  greeting() { return { say: S.disclosure[this.l], kind: 'greeting' }; }

  /** @param {{w:string,d?:string}} heard  w = Latin-script transcript, d = digits transcript */
  handle(heard) {
    const w = (heard.w || '').trim(), d = (heard.d || '').trim();
    if (!w && !d) return null;
    this.trace = null;
    if (this.pending) {
      const kind = this.pending.k;
      const r = this.answerPending(w || d, d);
      if (r) this.trace = { answer: kind };
      if (r) return r;
    }
    return this.fresh(w || d, d);
  }

  fresh(w, d) {
    const ch = chatIntent(w);
    if (ch) return this.chat(ch);
    let r = interpret(w, this.ctx());
    const da = digitAmounts(d || '');
    // the words stream sometimes garbles a number ("dedh sau" -> "de-do"); the digits stream still has it
    if (da.length && ((['unknown', 'query', 'number'].includes(r.kind) && !digitAmounts(w).length) || (r.kind === 'entries' && r.entries.length < da.length))) {
      const r2 = interpret(`${w} ${da.join(' ')}`, this.ctx());
      if (r2.kind === 'entries' || r2.kind === 'sale') { r = r2; d = ''; }
    }
    this.trace = { r, da };
    switch (r.kind) {
      case 'entries': return this.startEntries(r.entries, d);
      case 'sale': return this.doSale(r, d);
      case 'correction': return this.doCorrection(r);
      case 'undo': return this.doUndo();
      case 'stock': return this.doStock(r);
      case 'query': return this.doQuery(r);
      default: return this.say(tokenize(w).length >= 3 ? C.offTopic(this.l) : S.notUnderstood[this.l], 'unknown');
    }
  }
  say(text, kind, extra = {}) { return { say: text, kind, ...extra }; }

  // ---------- amount cross-check (words stream vs digits stream) ----------
  reconcile(amounts, d) {
    if (!d || hasFractionWord(d)) return null;
    const da = digitAmounts(d);
    if (da.length !== amounts.length) return null;
    const i = amounts.findIndex((a, n) => a !== da[n]);
    return i >= 0 ? { i, a: amounts[i], b: da[i] } : null;
  }

  // ---------- entries ----------
  startEntries(entries, d) {
    const job = { entries: entries.map((e) => ({ ...e })), i: 0, lines: [], cards: [] };
    const c = this.reconcile(job.entries.map((e) => e.amount), d);
    if (c) {
      this.pending = { k: 'amount', job, idx: c.i, opts: [c.a, c.b] };
      return this.say(S.conflict(this.l, c.a, c.b), 'ask');
    }
    return this.runJob(job);
  }

  runJob(job) {
    const l = this.l;
    while (job.i < job.entries.length) {
      const e = job.entries[job.i];
      if (!e.party) {
        if (e.partyIds && e.partyIds.length === 1) e.party = this.L.party(e.partyIds[0]);
        else if (e.partyIds && e.partyIds.length > 1) {
          const cands = e.partyIds.map((id) => this.L.party(id));
          this.pending = { k: 'disambig', job, cands, tries: 0 };
          return this.say(S.askWhich(l, cands[0].name.split(' ')[0], cands[0].name, cands[1].name), 'ask');
        } else if (e.newName) {
          if (!e.newOk) {
            this.pending = { k: 'newparty', job };
            return this.say(S.askNew(l, e.newName, e.newType || 'customer'), 'ask');
          }
          e.party = this.L.addParty(e.newName, e.newType || 'customer');
        } else { this.pending = { k: 'who', job }; return this.say(S.askWho[l], 'ask'); }
      }
      if (!e.dir) { this.pending = { k: 'dir', job }; return this.say(S.askDir(l, e.party.name, e.amount), 'ask'); }
      e.dir = toType(e.dir, e.party.type);
      if (e.amount >= BIG && !e.bigOk) { this.pending = { k: 'big', job }; return this.say(S.big(l, e.party.name, e.amount), 'ask'); }
      const rec = this.L.addEntry({ partyId: e.party.id, kind: e.dir, amount: e.amount, daysAgo: e.daysAgo || 0 });
      const bal = this.L.balance(e.party.id), n = e.party.name;
      job.lines.push({ credit: S.credit, payment: S.payment, purchase: S.purchase, supplier_payment: S.supplierPay }[e.dir](l, n, e.amount, Math.abs(bal)));
      job.cards.push({ id: rec.id, party: n, kind: e.dir, amount: e.amount, bal, note: when(l, e.daysAgo || 0) });
      job.i++;
    }
    this.pending = null;
    const card = job.cards[job.cards.length - 1];
    this.lastCard = card;
    // common sense: ask whether he is rushed before asking anything else; if so, park the question for day end
    const primary = job.cards.find((c) => c.kind === 'credit' || c.kind === 'purchase') || job.cards.find((c) => c.kind === 'payment' || c.kind === 'supplier_payment');
    const cand = primary && { id: primary.id, party: primary.party, kind: primary.kind, amount: primary.amount };
    let tail = S.more[l];
    if (cand) {
      if (Date.now() < this.rushUntil) { this.park(cand); tail = ''; }
      else { this.pending = { k: 'rush', cand }; tail = ' ' + C.rushAsk(l, (this.L.s.profile?.name || '').split(' ')[0]); }
    }
    return this.say(job.lines.join(' ') + tail, 'entry', { cards: job.cards, more: true });
  }

  // ---------- pending answers ----------
  answerPending(text, d) {
    const p = this.pending, l = this.l;
    const bail = () => { this.pending = null; return null; };
    switch (p.k) {
      case 'amount': {
        const toks = tokenize(text).map((t) => t.t);
        let v = null; for (let i = 0; i < toks.length && v == null; i++) { const r = parseNumberAt(toks, i); if (r) v = r.value; }
        const keys = toks.map(nk);
        if (v == null && keys.some((k) => ['pehla', 'pehle', 'first', 'one', 'ek'].includes(k))) v = p.opts[0];
        if (v == null && keys.some((k) => ['dusra', 'doosra', 'second', 'two', 'do'].includes(k))) v = p.opts[1];
        if (v == null) return bail();
        this.pending = null;
        if (p.sale) return this.commitSale(v, p.sale.mode, p.sale.daysAgo);
        p.job.entries[p.idx].amount = v;
        return this.runJob(p.job);
      }
      case 'disambig': {
        const c = pickCandidate(text, p.cands);
        if (c) {
          const key = p.job.entries[p.job.i].partyIds.join();
          p.job.entries.forEach((e) => { if (!e.party && e.partyIds && e.partyIds.join() === key) e.party = c; });
          this.pending = null; return this.runJob(p.job);
        }
        if (++p.tries >= 2) { this.pending = null; return this.say(S.cancelled[l], 'cancel'); }
        return this.say(S.askWhich(l, p.cands[0].name.split(' ')[0], p.cands[0].name, p.cands[1].name), 'ask');
      }
      case 'newparty': {
        const yn = yesNo(text);
        if (yn === 'yes') { p.job.entries[p.job.i].newOk = true; this.pending = null; return this.runJob(p.job); }
        if (yn === 'no') { this.pending = null; return this.say(S.cancelled[l], 'cancel'); }
        return bail();
      }
      case 'who': {
        if (yesNo(text) !== null || tokenize(text).every((t) => KW.stop.has(t.t) || t.t.length < 3)) return bail();
        const r = interpret(text + ' 1', this.ctx());
        const e = p.job.entries[p.job.i];
        const ids = r.entries?.[0]?.partyIds;
        if (ids && ids.length === 1) e.party = this.L.party(ids[0]);
        else if (ids && ids.length > 1) e.partyIds = ids;
        else { const nm = tokenize(text).map((t) => t.t).filter((t) => t.length > 2)[0]; if (!nm) return bail(); e.newName = nm[0].toUpperCase() + nm.slice(1); e.newType = 'customer'; }
        this.pending = null; return this.runJob(p.job);
      }
      case 'dir': {
        const e = p.job.entries[p.job.i];
        const dir = dirFromText(text, e.party.type);
        if (!dir) return bail();
        e.dir = dir; this.pending = null; return this.runJob(p.job);
      }
      case 'big': {
        const yn = yesNo(text);
        if (yn === 'yes') { p.job.entries[p.job.i].bigOk = true; this.pending = null; return this.runJob(p.job); }
        if (yn === 'no') { this.pending = null; return this.say(S.cancelled[l], 'cancel'); }
        return bail();
      }
      case 'eod': {
        const it = p.items[p.i];
        const a = stockAnswer(text);
        if (!a) return bail();
        this.L.setStockStatus(it.id, a === 'out' ? 'out' : a);
        const ack = { selling: S.eodSelling, slow: S.eodSlow, out: S.eodOut }[a](l, it.item);
        p.i++;
        if (p.i < p.items.length) return this.say(`${ack} ${S.eodAsk(l, p.items[p.i].item)}`, 'ask');
        this.pending = null; return this.say(ack, 'eod_done');
      }
      case 'rush': {
        const r = interpret(text, this.ctx());
        if (CMD.includes(r.kind)) { this.rushUntil = Date.now() + 8 * 60000; this.park(p.cand); this.pending = null; return null; }
        const a = rushAnswer(text);
        if (a === 'yes') { this.rushUntil = Date.now() + 10 * 60000; this.park(p.cand); this.pending = null; return this.say(C.parked(l), 'chat'); }
        if (a === 'no') { this.pending = { k: 'detail', cand: p.cand }; return this.say(C.detail(l, p.cand.kind, p.cand.party), 'ask'); }
        this.park(p.cand); this.pending = null; return null;
      }
      case 'detail': {
        const r = interpret(text, this.ctx());
        if (CMD_NOQ.includes(r.kind)) { this.park(p.cand); this.pending = null; return null; }
        this.pending = null;
        if (isSkip(text)) return this.say(C.skipped(l), 'chat');
        if (isLater(text)) { this.park(p.cand); return this.say(C.parked(l), 'chat'); }
        const note = text.trim().replace(/[.!?]+$/, '').slice(0, 80);
        this.L.patchEntry(p.cand.id, { note });
        return this.say(C.noted(l, note) + S.more[l], 'chat', { more: true });
      }
      case 'followup': {
        const f = p.fus[p.i], r = interpret(text, this.ctx());
        if (CMD_NOQ.includes(r.kind)) { this.pending = null; return null; }
        if (isLater(text)) { this.pending = null; return this.say(C.snoozed(l), 'chat'); }
        let ack;
        if (isSkip(text)) { this.L.closeFollowup(f.id); ack = C.skipped(l); }
        else { const note = text.trim().replace(/[.!?]+$/, '').slice(0, 80); this.L.patchEntry(f.entryId, { note }); this.L.closeFollowup(f.id); ack = C.noted(l, note); }
        p.i++;
        if (p.i < p.fus.length) return this.say(`${ack} ${this.fuQ(p.fus[p.i])}`, 'ask');
        if (p.items.length) { this.pending = { k: 'eod', items: p.items, i: 0 }; return this.say(`${ack} ${S.eodAsk(l, p.items[0].item)}`, 'ask'); }
        this.pending = null; return this.say(ack, 'chat');
      }
      default: return bail();
    }
  }

  // ---------- other intents ----------
  doSale(r, d) {
    const c = this.reconcile([r.amount], d);
    if (c) {
      this.pending = { k: 'amount', job: null, idx: 0, opts: [c.a, c.b], sale: r };
      return this.say(S.conflict(this.l, c.a, c.b), 'ask');
    }
    return this.commitSale(r.amount, r.mode, r.daysAgo);
  }
  commitSale(amount, mode, daysAgo = 0) {
    const rec = this.L.addSale(amount, mode, daysAgo);
    const tot = this.L.day().revenue;
    const card = { id: rec.id, party: mode === 'upi' ? 'UPI' : 'Cash', kind: 'sale', amount, bal: tot, note: '' };
    this.lastCard = card;
    return this.say(S.sale(this.l, amount, tot) + S.more[this.l], 'sale', { cards: [card], more: true });
  }

  doCorrection(r) {
    const l = this.l, last = this.L.last();
    if (!last) return this.say(S.nothingFix[l], 'unknown');
    if (last.type === 'sale') {
      if (!r.amount) return this.say(S.notUnderstood[l], 'unknown');
      this.L.s.sales.find((x) => x.id === last.rec.id).amount = r.amount; this.L.commit();
      return this.say(S.fixed(l, 'Sale', r.amount), 'fix');
    }
    const e = last.rec, p = this.L.party(e.partyId);
    const patch = {};
    if (r.amount) patch.amount = r.amount;
    if (r.dir) patch.kind = toType(r.dir, p.type);
    if (r.partyIds?.length === 1) patch.partyId = r.partyIds[0];
    if (!Object.keys(patch).length) return this.say(S.notUnderstood[l], 'unknown');
    this.L.patchEntry(e.id, patch);
    const np = this.L.party(patch.partyId || e.partyId);
    this.lastCard = { id: e.id, party: np.name, kind: patch.kind || e.kind, amount: patch.amount || e.amount, bal: this.L.balance(np.id), note: '' };
    return this.say(patch.amount ? S.fixed(l, np.name, patch.amount) : patch.kind ? S.fixedDir(l, np.name, patch.kind === 'credit' || patch.kind === 'purchase' ? 'credit' : 'payment') : S.fixed(l, np.name, e.amount), 'fix', { cards: [this.lastCard] });
  }

  doUndo() {
    const r = this.L.removeLast();
    return this.say(r ? S.undone[this.l] : S.nothingUndo[this.l], r ? 'undo' : 'unknown', { undone: !!r });
  }

  doStock(r) {
    const l = this.l;
    const expiry = resolveExpiry(r.when);
    const it = this.L.addStock({ item: r.item || 'Item', qty: r.qty, unit: r.unit, expiry, supplierId: r.supplierIds?.[0] });
    if (r.amount && r.supplierIds?.length === 1) this.L.addEntry({ partyId: r.supplierIds[0], kind: 'purchase', amount: r.amount });
    return this.say(S.stockAdded(l, it.item, it.qty, it.unit, expiry || '') + (expiry ? '' : S.noExpiryHint[l]) + S.more[l], 'stock', { more: true,
      cards: [{ id: it.id, party: it.item, kind: 'stock', amount: it.qty, bal: 0, note: expiry || '' }] });
  }

  expiringList() {
    const now = Date.now();
    return this.L.expiring(30).map((x) => ({ ...x, days: Math.max(0, Math.ceil((new Date(x.expiry) - now) / 864e5)) }));
  }

  summaryData() {
    const d = this.L.day(), top = this.L.debtors()[0];
    return { ...d, rec: this.L.receivableTotal(), pay: this.L.payableTotal(), top: top ? { n: top.p.name, a: top.bal } : null, exp: this.expiringList().length };
  }

  doQuery(r) {
    const l = this.l, L = this.L;
    switch (r.q) {
      case 'balance': {
        if (r.partyIds.length > 1) {
          const c = r.partyIds.map((id) => L.party(id));
          return this.say(c.map((p) => S.balance(l, p.name, Math.abs(L.balance(p.id)), p.type === 'supplier')).join(' '), 'query');
        }
        const p = L.party(r.partyIds[0]);
        return this.say(S.balance(l, p.name, L.balance(p.id), p.type === 'supplier'), 'query', { focus: p.id });
      }
      case 'today_credit': return this.say(S.todayCredit(l, L.day().credit), 'query');
      case 'today_sales': { const d = L.day(); return this.say(S.todaySales(l, d.revenue, d.sales, d.credit), 'query'); }
      case 'today_collected': return this.say(S.todayCollected(l, L.day().collected), 'query');
      case 'debtors': case 'receivable': {
        const dd = L.debtors();
        return this.say(dd.length ? S.receivable(l, dd.length, L.receivableTotal()) : S.noneOwe[l], 'query');
      }
      case 'top_debtors': {
        const dd = L.debtors().slice(0, 3);
        return this.say(dd.length ? S.top(l, dd.map((x) => ({ n: x.p.name, a: x.bal }))) : S.noneOwe[l], 'query');
      }
      case 'payables': {
        const pp = L.payables();
        return this.say(pp.length ? S.payables(l, L.payableTotal(), pp.map((x) => ({ n: x.p.name, a: x.bal }))) : S.noPayables[l], 'query');
      }
      case 'expiring': {
        const ex = this.expiringList();
        return this.say(ex.length ? S.expiring(l, ex) : S.noExpiring[l], 'query');
      }
      case 'stock': {
        const st = L.s.stock.filter((x) => x.status !== 'out');
        return this.say(st.length ? S.stockList(l, st.slice(0, 6)) : S.noStock[l], 'query');
      }
      case 'summary': return this.dayEnd();
      case 'help': return this.say(S.help[l], 'help');
      case 'reminder': {
        const p = L.party(r.partyIds[0]);
        if (!p.optIn) return this.say(S.noOptIn(l, p.name), 'refuse');
        const bal = L.balance(p.id);
        const text = S.reminderText(l, p.name, bal, L.s.profile?.shop || 'Kirana');
        return this.say(S.reminderReady(l, p.name), 'reminder', { reminder: { text, phone: p.phone, name: p.name } });
      }
      default: return this.say(S.notUnderstood[l], 'unknown');
    }
  }

  fuQ(f) { return `${C.about(this.l, f.party, f.amount)} ${C.detail(this.l, f.kind, f.party)}`; }
  park(cand) { if (cand) this.L.addFollowup({ entryId: cand.id, party: cand.party, kind: cand.kind, amount: cand.amount }); }
  /** Session ended while a question was open: he was busy, so keep it for day end instead of losing it. */
  expirePending() { const p = this.pending; this.pending = null; if (p && (p.k === 'rush' || p.k === 'detail')) this.park(p.cand); }

  chat(ch) {
    const l = this.l, n = (this.L.s.profile?.name || '').split(' ')[0];
    if (ch === 'rush') this.rushUntil = Date.now() + 10 * 60000;
    if (ch === 'free') this.rushUntil = 0;
    const tm = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return this.say(ch === 'greet' ? C.greet(l, n) : ch === 'time' ? C.time(l, tm) : C[ch](l), 'chat');
  }

  /** End-of-day: summary, then the questions parked while he was busy ("as promised"), then "is Oreo selling?". */
  dayEnd(auto = false) {
    const l = this.l, sum = auto ? '' : S.summary(l, this.summaryData());
    const fus = this.L.openFollowups().slice(0, 3), items = this.L.toAsk(3);
    if (fus.length) {
      this.pending = { k: 'followup', fus, i: 0, items };
      return this.say(`${sum} ${C.back(l)} ${this.fuQ(fus[0])}`.trim(), 'ask');
    }
    if (!items.length) return this.say(sum, 'query');
    this.pending = { k: 'eod', items, i: 0 };
    return this.say(`${sum} ${S.eodAsk(l, items[0].item)}`.trim(), 'ask');
  }
}
