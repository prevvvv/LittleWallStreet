import test from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/db.js';
import { buy, sell, awardCoins, getWallet, computeNewPrice } from '../src/trading.js';

const fresh = () => createDb(':memory:'); // students 1-3, teacher 4
const price = (db, id) => db.prepare('SELECT current_price p FROM skins WHERE skin_id=?').get(id).p;

test('pricing formula, rounding, caps and floor', () => {
  assert.equal(computeNewPrice(200, 0.01, 1, 'BUY'), 202);
  assert.equal(computeNewPrice(202, 0.01, 1, 'BUY'), 204);
  assert.equal(computeNewPrice(204, 0.01, 1, 'SELL'), 202);
  assert.equal(computeNewPrice(200, 0.01, 50, 'BUY'), 220); // capped at +10%
  assert.equal(computeNewPrice(200, 0.01, 50, 'SELL'), 180);
  assert.equal(computeNewPrice(1, 0.01, 5, 'SELL'), 1);
});

test('seed data', () => {
  const db = fresh();
  assert.equal(getWallet(db, 1).coinBalance, 200);
  assert.equal(getWallet(db, 1).items.length, 3);
});

test('buy updates wallet, inventory, price and history', () => {
  const db = fresh();
  const r = buy(db, 1, 1, 1);
  assert.equal(r.unitPrice, 200);
  const w = getWallet(db, 1);
  assert.equal(w.coinBalance, 0);
  assert.equal(w.items[0].quantity, 1);
  assert.equal(price(db, 1), 202);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM price_history WHERE skin_id=1').get().c, 2);
});

test('buy fails for insufficient coins; skins are unlimited', () => {
  const db = fresh();
  assert.throws(() => buy(db, 1, 3, 1), /Not enough coins/);
  awardCoins(db, 1, 100000);
  buy(db, 1, 1, 60); // more than the old 50-skin supply: allowed now
  assert.equal(getWallet(db, 1).items[0].quantity, 60);
  assert.throws(() => buy(db, 1, 1, 0), /whole number/);
  assert.throws(() => buy(db, 1, 1, 1.5), /whole number/);
  assert.ok(price(db, 1) > 200);
});

test('teacher account cannot trade; sell fails when not owned', () => {
  const db = fresh();
  assert.throws(() => buy(db, 4, 1, 1), /Only students/);
  assert.throws(() => sell(db, 1, 1, 1), /only own 0/);
});

test('weighted average purchase cost and partial sell', () => {
  const db = fresh();
  awardCoins(db, 1, 1000);
  buy(db, 1, 1, 1); // 200
  buy(db, 1, 1, 1); // 202
  assert.equal(getWallet(db, 1).items[0].averageBuyPrice, 201);
  const r = sell(db, 1, 1, 1); // price now 204
  assert.equal(r.unitPrice, 204);
  assert.equal(r.realisedProfitLoss, 3);
  assert.equal(getWallet(db, 1).items[0].quantity, 1);
});

test('full demo scenario', () => {
  const db = fresh();
  buy(db, 1, 1, 1);
  assert.throws(() => buy(db, 2, 1, 1), /Not enough coins/);
  assert.equal(awardCoins(db, 2, 100), 300);
  assert.equal(buy(db, 2, 1, 1).unitPrice, 202);
  assert.equal(price(db, 1), 204);
  const s = sell(db, 1, 1, 1);
  assert.equal(s.unitPrice, 204);
  assert.equal(s.realisedProfitLoss, 4);
  const w = getWallet(db, 1);
  assert.equal(w.coinBalance, 204);
  assert.equal(w.totalRealised, 4);
  assert.equal(w.portfolioValue, 204);
  const prices = db.prepare('SELECT price FROM price_history WHERE skin_id=1 ORDER BY history_id').all().map((r) => r.price);
  assert.deepEqual(prices, [200, 202, 204, 202]);
});

import { seedScenario, startMarketTicker } from '../src/scenario.js';

test('random scenario: different balances, rich history, unlimited supply', () => {
  const db = fresh();
  seedScenario(db);
  const coins = [1, 2, 3].map((id) => getWallet(db, id).coinBalance);
  assert.equal(new Set(coins).size, 3);
  for (const skin of [1, 2, 3]) {
    assert.ok(db.prepare('SELECT COUNT(*) c FROM price_history WHERE skin_id=?').get(skin).c >= 300);
  }
  assert.ok(db.prepare('SELECT COUNT(*) c FROM transactions').get().c >= 10);
});

test('live ticker adds new price points', async () => {
  const db = fresh();
  const before = db.prepare('SELECT COUNT(*) c FROM price_history').get().c;
  const stop = startMarketTicker(db, 10);
  await new Promise((r) => setTimeout(r, 80));
  stop();
  assert.ok(db.prepare('SELECT COUNT(*) c FROM price_history').get().c > before + 3);
});

import { monthlyPerformance, ensureMonthlyHistory } from '../src/performance.js';

test('monthly performance: 6 months, all students, current month is live', () => {
  const db = fresh();
  seedScenario(db);
  const p = monthlyPerformance(db);
  assert.equal(p.rows.length, 6);
  assert.equal(p.students.length, 3);
  assert.ok(p.rows.every((r) => p.students.every((s) => Number.isFinite(r[s]))));
  assert.equal(p.rows.at(-1)['Student 01'], Math.round(getWallet(db, 1).portfolioValue));
  const old = fresh(); ensureMonthlyHistory(old); // older database without snapshots
  assert.equal(monthlyPerformance(old).rows.length, 6);
});
