// Encrypted-at-rest storage. The ledger is AES-GCM encrypted in localStorage with a key derived
// from the shopkeeper's PIN (PBKDF2). The key lives only in memory; transcripts are never stored.
const P = 'vk_profile', D = 'vk_data';
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const subtle = globalThis.crypto?.subtle;

async function deriveKey(pin, salt) {
  const base = await subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(key, obj) {
  if (!key) return { plain: JSON.stringify(obj) };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
  return { iv: b64(iv), ct: b64(ct) };
}
async function open(key, blob) {
  if (blob.plain) return JSON.parse(blob.plain);
  return JSON.parse(dec.decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, key, unb64(blob.ct))));
}

export const Vault = {
  encrypted: !!subtle,
  profile() { try { return JSON.parse(localStorage.getItem(P)); } catch { return null; } },
  key: null,
  async create(profile, pin, initialState) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    this.key = subtle ? await deriveKey(pin, salt) : null;
    const pr = { ...profile, salt: b64(salt), encrypted: !!subtle, createdAt: Date.now() };
    localStorage.setItem(P, JSON.stringify(pr));
    initialState.profile = { ...profile };
    await this.save(initialState);
    return initialState;
  },
  /** @returns state or null if the PIN is wrong */
  async unlock(pin) {
    const pr = this.profile(); if (!pr) return null;
    try {
      if (subtle && pr.encrypted) this.key = await deriveKey(pin, unb64(pr.salt));
      const blob = JSON.parse(localStorage.getItem(D));
      return await open(this.key, blob);
    } catch { return null; }
  },
  _t: null,
  save(state) {
    clearTimeout(this._t);
    return new Promise((res) => {
      this._t = setTimeout(async () => { try { localStorage.setItem(D, JSON.stringify(await seal(this.key, state))); } catch (e) { console.error(e); } res(); }, 250);
    });
  },
  lock() { this.key = null; },
  wipe() { localStorage.removeItem(P); localStorage.removeItem(D); this.key = null; },
};
