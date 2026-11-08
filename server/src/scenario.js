// Random demo scenario + live market simulation.
// Student trades still move prices through the supply-and-demand formula (trading.js).
// On top of that, "the wider market" nudges prices every few seconds so the charts feel alive.
import { seed, transaction } from './db.js';
import { buy, sell } from './trading.js';
import { buildMonthlyHistory } from './performance.js';

export const TICK_MS = 3000;          // one live price tick every 3 seconds
const BACKFILL_TICKS = 360;           // ~18 minutes of pre-generated history
// Market mood per skin: 1 Devil = crash, 2 Cowboy = random, 3 Astronaut = boom.
export const MOODS = { 1: 'crash', 2: 'random', 3: 'boom' };

const rand = (a, b) => a + Math.random() * (b - a);
const int = (a, b) => Math.floor(rand(a, b + 1));
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
const step = (price, m) => Math.max(1, price * (1 + m.d + m.v * gauss()));

// d = average move per tick, v = volatility per tick. f = progress through the backfill (0..1).
function pastMove(id, f, price, start) {
  if (id === 1) return f < 0.45 ? { d: 0.0018, v: 0.007 } : f < 0.65 ? { d: -0.012, v: 0.016 } : { d: -0.0006, v: 0.008 };
  if (id === 3) return { d: f > 0.5 && f < 0.58 ? -0.0022 : 0.0016, v: 0.007 };
  return randomMove(price, start);
}
function randomMove(price, start) { return { d: price > 1.8 * start ? -0.002 : price < 0.55 * start ? 0.002 : 0, v: 0.011 }; }
function liveMove(id, price, start) {
  if (id === 1) return { d: price > 0.3 * start ? -0.0004 : 0.0006, v: 0.009 };
  if (id === 3) return { d: price < 4 * start ? 0.0006 : 0, v: 0.007 };
  return randomMove(price, start);
}

/** Wipe the database and build a fresh random scenario from genuine trades. */
export function seedScenario(db) {
  seed(db);
  const iso = (ms) => new Date(ms).toISOString();
  const t0 = Date.now() - BACKFILL_TICKS * TICK_MS;

  // 1. Three different random starting balances (1,000 - 4,500 coins).
  const balances = new Set();
  while (balances.size < 3) balances.add(int(20, 90) * 50);
  [...balances].forEach((c, i) => db.prepare('UPDATE students SET coin_balance = ? WHERE student_id = ?').run(c, i + 1));
  buildMonthlyHistory(db, Object.fromEntries([...balances].map((c, i) => [i + 1, c]))); // past months, ending near the starting coins

  // 2. Spread each skin's starting price back in time.
  db.prepare('UPDATE price_history SET created_at = ?').run(iso(t0));

  // 3. Each student makes 7-10 random trades at random moments in the past.
  const schedule = [];
  for (let s = 1; s <= 3; s++) for (let k = int(7, 10); k > 0; k--) schedule.push({ tick: int(8, BACKFILL_TICKS - 5), student: s, skin: int(1, 3) });
  schedule.sort((a, b) => a.tick - b.tick);

  const start = {}, shadow = {};
  for (const s of db.prepare('SELECT skin_id, current_price FROM skins').all()) start[s.skin_id] = shadow[s.skin_id] = s.current_price;
  const setPrice = db.prepare('UPDATE skins SET current_price = ? WHERE skin_id = ?');
  const addHist = db.prepare('INSERT INTO price_history (skin_id, price, created_at) VALUES (?,?,?)');

  for (let i = 1; i <= BACKFILL_TICKS; i++) {
    const when = t0 + i * TICK_MS;
    for (const id of [1, 2, 3]) {
      shadow[id] = step(shadow[id], pastMove(id, i / BACKFILL_TICKS, shadow[id], start[id]));
      const p = Math.max(1, Math.round(shadow[id]));
      setPrice.run(p, id);
      addHist.run(id, p, iso(when));
    }
    for (const t of schedule.filter((x) => x.tick === i)) {
      const owned = db.prepare('SELECT quantity FROM inventory WHERE student_id = ? AND skin_id = ?').get(t.student, t.skin).quantity;
      try {
        const r = owned > 0 && Math.random() < 0.4 ? sell(db, t.student, t.skin, int(1, owned)) : buy(db, t.student, t.skin, int(1, 2));
        db.prepare('UPDATE transactions SET created_at = ? WHERE transaction_id = ?').run(iso(when + 1000), r.transactionId);
        db.prepare('UPDATE price_history SET created_at = ? WHERE history_id = (SELECT MAX(history_id) FROM price_history WHERE skin_id = ?)').run(iso(when + 1000), t.skin);
        shadow[t.skin] = r.newPrice; // the market continues from the post-trade price
      } catch { /* student could not afford it / not enough supply: skip this trade */ }
    }
  }
}

/** Live "wider market" ticks. Returns a function that stops the simulation. */
export function startMarketTicker(db, ms = TICK_MS) {
  const shadow = new Map();
  const firstPrice = db.prepare('SELECT price FROM price_history WHERE skin_id = ? ORDER BY history_id LIMIT 1');
  const setPrice = db.prepare('UPDATE skins SET current_price = ? WHERE skin_id = ?');
  const addHist = db.prepare('INSERT INTO price_history (skin_id, price) VALUES (?,?)');
  const timer = setInterval(() => {
    try {
      transaction(db, () => {
        for (const s of db.prepare('SELECT skin_id, current_price FROM skins').all()) {
          const start = firstPrice.get(s.skin_id)?.price ?? s.current_price;
          let sh = shadow.get(s.skin_id);
          if (sh === undefined || Math.abs(sh - s.current_price) >= 1) sh = s.current_price; // a student trade moved it
          sh = step(sh, liveMove(s.skin_id, sh, start));
          shadow.set(s.skin_id, sh);
          const p = Math.max(1, Math.round(sh));
          setPrice.run(p, s.skin_id);
          addHist.run(s.skin_id, p);
        }
      });
    } catch (e) { console.error('Market tick failed:', e.message); }
  }, ms);
  return () => clearInterval(timer);
}
