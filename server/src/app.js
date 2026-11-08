import express from 'express';
import session from 'express-session';
import { buy, sell, awardCoins, getWallet, TradeError } from './trading.js';
import { askAssistant } from './ai.js';
import { monthlyPerformance } from './performance.js';

export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-only-secret', resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  }));

  const userOf = (req) => req.session.userId
    ? db.prepare('SELECT student_id AS id, username, role, coin_balance FROM students WHERE student_id = ?').get(req.session.userId) : null;
  const need = (role) => (req, res, next) => {
    const u = userOf(req);
    if (!u) return res.status(401).json({ error: 'Please log in first.' });
    if (role && u.role !== role) return res.status(403).json({ error: `This page is only for ${role}s.` });
    req.user = u; next();
  };
  const wrap = (fn) => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong.' }); if (!e.status) console.error(e); }
  };

  // ---- Session ----
  app.get('/api/demo-accounts', (_req, res) => res.json(db.prepare('SELECT username, role FROM students ORDER BY student_id').all()));
  app.post('/api/login', wrap((req) => {
    const u = db.prepare('SELECT student_id, username, role FROM students WHERE username = ?').get(String(req.body?.username ?? ''));
    if (!u) throw new TradeError('Unknown demo account.', 404);
    req.session.userId = u.student_id;
    return { id: u.student_id, username: u.username, role: u.role };
  }));
  app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
  const me = (req, res) => { const u = userOf(req); res.json(u ? { id: u.id, username: u.username, role: u.role } : null); };
  app.get('/api/session', me);
  app.get('/api/me', me);

  // ---- Market (any logged-in user) ----
  const skinRows = () => db.prepare('SELECT skin_id, name, current_price FROM skins ORDER BY skin_id').all().map((s) => {
    const ago = db.prepare('SELECT price FROM price_history WHERE skin_id = ? ORDER BY history_id DESC LIMIT 1 OFFSET 20').get(s.skin_id); // ~1 minute ago
    const start = db.prepare('SELECT price FROM price_history WHERE skin_id = ? ORDER BY history_id ASC LIMIT 1').get(s.skin_id).price;
    const prev = ago?.price ?? start;
    return { id: s.skin_id, name: s.name, price: s.current_price, startPrice: start,
      change: s.current_price - prev, changePct: prev ? ((s.current_price - prev) / prev) * 100 : 0 };
  });
  app.get('/api/performance', need('teacher'), wrap(() => monthlyPerformance(db)));
  app.get('/api/skins', need(), wrap(() => skinRows()));
  app.get('/api/leaderboard', need(), wrap(() =>
    db.prepare("SELECT student_id AS id, username FROM students WHERE role = 'student' ORDER BY student_id").all()
      .map(s => ({ ...s, ...getWallet(db, s.id) }))
      .sort((a,b) => b.portfolioValue - a.portfolioValue)));
  app.get('/api/skins/:id/history', need(), wrap((req) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM skins WHERE skin_id = ?').get(id)) throw new TradeError('That skin does not exist.', 404);
    const total = db.prepare('SELECT COUNT(*) c FROM price_history WHERE skin_id = ?').get(id).c;
    const rows = db.prepare('SELECT history_id AS id, price, created_at AS time FROM (SELECT * FROM price_history WHERE skin_id = ? ORDER BY history_id DESC LIMIT 600) ORDER BY history_id').all(id);
    return rows.map((r, i) => ({ ...r, n: total - rows.length + i })); // n = position in the skin's full history
  }));

  // ---- Student (always uses the session's student, never an id from the client) ----
  app.get('/api/wallet', need('student'), wrap((req) => getWallet(db, req.user.id)));
  app.get('/api/inventory', need('student'), wrap((req) => getWallet(db, req.user.id).items));
  app.get('/api/my-transactions', need('student'), wrap((req) => {
    const type = req.query.type === 'BUY' || req.query.type === 'SELL' ? req.query.type : null;
    return db.prepare(`SELECT t.transaction_id AS id, s.name AS skin, t.transaction_type AS type, t.quantity, t.unit_price AS unitPrice,
      t.total_price AS total, t.realised_profit_loss AS realised, t.created_at AS time
      FROM transactions t JOIN skins s ON s.skin_id = t.skin_id
      WHERE t.student_id = ? AND (? IS NULL OR t.transaction_type = ?) ORDER BY t.transaction_id DESC`).all(req.user.id, type, type);
  }));
  const trade = (fn) => wrap((req) => fn(db, req.user.id, Number(req.body?.skinId), Number(req.body?.quantity)));
  app.post('/api/buy', need('student'), trade(buy));
  app.post('/api/sell', need('student'), trade(sell));
  app.post('/api/chat', need('student'), wrap(async (req) => {
    const q = String(req.body?.question ?? '').trim();
    if (!q || q.length > 500) throw new TradeError('Please ask a question of up to 500 characters.');
    return { answer: await askAssistant(db, req.user.id, q) };
  }));

  // ---- Teacher ----
  app.get('/api/teacher/students', need('teacher'), wrap(() =>
    db.prepare("SELECT student_id AS id, username FROM students WHERE role = 'student' ORDER BY student_id").all()
      .map((s) => ({ ...s, ...getWallet(db, s.id) }))));
  app.post('/api/teacher/award-coins', need('teacher'), wrap((req) =>
    ({ coinBalance: awardCoins(db, Number(req.body?.studentId), Number(req.body?.amount)) })));

  return app;
}
