import { transaction } from './db.js';

export class TradeError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/** New Price = Old Price x (1 + k x (B - S)), capped at +/-10%, rounded, never below 1.
 *  A buy always raises and a sell always lowers the price by at least 1 coin (when above 1). */
export function computeNewPrice(oldPrice, k, quantity, type) {
  const net = type === 'BUY' ? quantity : -quantity;
  const change = Math.max(-0.1, Math.min(0.1, k * net));
  let next = Math.max(1, Math.round(oldPrice * (1 + change)));
  if (type === 'BUY' && next <= oldPrice) next = oldPrice + 1;
  if (type === 'SELL' && next >= oldPrice) next = Math.max(1, oldPrice - 1);
  return next;
}

function validate(db, studentId, skinId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) throw new TradeError('Quantity must be a whole number of at least 1.');
  const skin = db.prepare('SELECT * FROM skins WHERE skin_id = ?').get(skinId);
  if (!skin) throw new TradeError('That skin does not exist.', 404);
  const student = db.prepare("SELECT * FROM students WHERE student_id = ? AND role = 'student'").get(studentId);
  if (!student) throw new TradeError('Only students can trade.', 403);
  return { skin, student };
}

function finish(db, studentId, skin, type, quantity, unit, total, realised) {
  const newPrice = computeNewPrice(skin.current_price, skin.sensitivity, quantity, type);
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO transactions (student_id, skin_id, transaction_type, quantity, unit_price, total_price, realised_profit_loss) VALUES (?,?,?,?,?,?,?)'
  ).run(studentId, skin.skin_id, type, quantity, unit, total, realised);
  db.prepare('UPDATE skins SET current_price = ? WHERE skin_id = ?').run(newPrice, skin.skin_id);
  db.prepare('INSERT INTO price_history (skin_id, price) VALUES (?,?)').run(skin.skin_id, newPrice);
  return { transactionId: Number(lastInsertRowid), unitPrice: unit, total, realisedProfitLoss: realised, newPrice };
}

export function buy(db, studentId, skinId, quantity) {
  return transaction(db, () => {
    const { skin, student } = validate(db, studentId, skinId, quantity);
    // Skins are unlimited: there is no market supply limit, so buying never runs out.
    const unit = skin.current_price; // price BEFORE the trade
    const total = unit * quantity;
    if (student.coin_balance < total) throw new TradeError(`Not enough coins. You need ${total} but have ${student.coin_balance}.`);
    const inv = db.prepare('SELECT * FROM inventory WHERE student_id = ? AND skin_id = ?').get(studentId, skinId);
    const newQty = inv.quantity + quantity;
    const newAvg = (inv.quantity * inv.average_buy_price + total) / newQty;
    db.prepare('UPDATE students SET coin_balance = coin_balance - ? WHERE student_id = ?').run(total, studentId);
    db.prepare('UPDATE inventory SET quantity = ?, average_buy_price = ? WHERE student_id = ? AND skin_id = ?').run(newQty, newAvg, studentId, skinId);
    return finish(db, studentId, skin, 'BUY', quantity, unit, total, 0);
  });
}

export function sell(db, studentId, skinId, quantity) {
  return transaction(db, () => {
    const { skin } = validate(db, studentId, skinId, quantity);
    const inv = db.prepare('SELECT * FROM inventory WHERE student_id = ? AND skin_id = ?').get(studentId, skinId);
    if (inv.quantity < quantity) throw new TradeError(`You only own ${inv.quantity} ${skin.name} skin(s).`);
    const unit = skin.current_price;
    const total = unit * quantity;
    const realised = (unit - inv.average_buy_price) * quantity;
    const left = inv.quantity - quantity;
    db.prepare('UPDATE students SET coin_balance = coin_balance + ? WHERE student_id = ?').run(total, studentId);
    db.prepare('UPDATE inventory SET quantity = ?, average_buy_price = ? WHERE student_id = ? AND skin_id = ?').run(left, left === 0 ? 0 : inv.average_buy_price, studentId, skinId);
    return finish(db, studentId, skin, 'SELL', quantity, unit, total, realised);
  });
}

export function awardCoins(db, studentId, amount) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000) throw new TradeError('Amount must be a whole number between 1 and 100000.');
  const r = db.prepare("UPDATE students SET coin_balance = coin_balance + ? WHERE student_id = ? AND role = 'student'").run(amount, studentId);
  if (r.changes === 0) throw new TradeError('Student not found.', 404);
  return db.prepare('SELECT coin_balance FROM students WHERE student_id = ?').get(studentId).coin_balance;
}

/** Wallet summary, always derived from the database. */
export function getWallet(db, studentId) {
  const student = db.prepare('SELECT * FROM students WHERE student_id = ?').get(studentId);
  const items = db.prepare(`
    SELECT s.skin_id, s.name, s.current_price, i.quantity, i.average_buy_price,
      COALESCE((SELECT SUM(realised_profit_loss) FROM transactions t WHERE t.student_id = i.student_id AND t.skin_id = i.skin_id), 0) AS realised
    FROM inventory i JOIN skins s ON s.skin_id = i.skin_id WHERE i.student_id = ? ORDER BY s.skin_id`).all(studentId)
    .map((r) => ({
      skinId: r.skin_id, name: r.name, quantity: r.quantity, currentPrice: r.current_price,
      averageBuyPrice: r.quantity ? r.average_buy_price : 0,
      marketValue: r.quantity * r.current_price,
      unrealised: r.quantity ? (r.current_price - r.average_buy_price) * r.quantity : 0,
      realised: r.realised,
    }));
  const inventoryValue = items.reduce((a, i) => a + i.marketValue, 0);
  return {
    coinBalance: student.coin_balance, inventoryValue, portfolioValue: student.coin_balance + inventoryValue,
    totalUnrealised: items.reduce((a, i) => a + i.unrealised, 0),
    totalRealised: items.reduce((a, i) => a + i.realised, 0), items,
  };
}
