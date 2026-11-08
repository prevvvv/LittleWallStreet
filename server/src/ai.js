import { getWallet } from './trading.js';

const RULES = `Game rules: Skins start at Devil 200, Cowboy 350, Astronaut 500 coins. Each student starts with 200 coins.
When a student buys, the price they pay is the price BEFORE the trade, then the price rises by 1% per skin bought (New Price = Old Price x (1 + 0.01 x (bought - sold))). Selling lowers the price by 1% per skin sold. Each trade moves the price at most 10%.  There is no limit on how many skins exist, so players can always buy.
Realised profit = sell price - average buy price (money actually made). Unrealised profit = current price - average buy price for skins still owned.`;

export function buildContext(db, studentId) {
  const student = db.prepare('SELECT username FROM students WHERE student_id = ?').get(studentId);
  const wallet = getWallet(db, studentId);
  const skins = db.prepare('SELECT skin_id, name, current_price FROM skins').all();
  const recent = db.prepare(`SELECT s.name, t.transaction_type, t.quantity, t.unit_price, t.total_price, t.realised_profit_loss, t.created_at
    FROM transactions t JOIN skins s ON s.skin_id = t.skin_id WHERE t.student_id = ? ORDER BY t.transaction_id DESC LIMIT 15`).all(studentId);
  const moves = skins.map((s) => ({
    skin: s.name,
    lastPrices: db.prepare('SELECT price FROM price_history WHERE skin_id = ? ORDER BY history_id DESC LIMIT 6').all(s.skin_id).map((r) => r.price).reverse(),
  }));
  return JSON.stringify({ student: student.username, wallet, market: skins, recentTransactions: recent, recentPriceMovements: moves }, (_k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v), 1); // keep decimals to 2 places
}

export async function askAssistant(db, studentId, question) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { const e = new Error('The AI assistant is not available because no API key is set. The rest of the game still works!'); e.status = 503; throw e; }
  const system = `You are the LittleWallStreet assistant called Cosmo for children aged 8-13. Use short, simple, friendly sentences (max about 120 words).
Use ONLY the game data below for personal numbers - never invent balances, prices or transactions. If the data does not show something, say so.
Explain price moves using the game rules. You cannot buy, sell or change anything. Never recommend real-world investments or risky money choices; this is a classroom game.
${RULES}
GAME DATA:
${buildContext(db, studentId)}`;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.4, max_tokens: 300,
      messages: [{ role: 'system', content: system }, { role: 'user', content: question }] }),
  });
  if (!res.ok) { const e = new Error('The AI assistant could not answer right now. Please try again in a moment.'); e.status = 502; throw e; }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Sorry, I do not have an answer for that.';
}
