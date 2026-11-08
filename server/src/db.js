import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { seedScenario } from './scenario.js';

export const INITIAL_COINS = 200;
export const INITIAL_SUPPLY = 50;
export const SENSITIVITY = 0.01;
export const SKINS = [
  [1, 'Devil', 200],
  [2, 'Cowboy', 350],
  [3, 'Astronaut', 500],
];
export const STUDENTS = ['Student 01', 'Student 02', 'Student 03'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student','teacher')),
  coin_balance INTEGER NOT NULL DEFAULT 0 CHECK (coin_balance >= 0)
);
CREATE TABLE IF NOT EXISTS skins (
  skin_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  current_price INTEGER NOT NULL CHECK (current_price >= 1),
  available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
  sensitivity REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS inventory (
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  skin_id INTEGER NOT NULL REFERENCES skins(skin_id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  average_buy_price REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, skin_id)
);
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  skin_id INTEGER NOT NULL REFERENCES skins(skin_id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY','SELL')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  realised_profit_loss REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  month TEXT NOT NULL,
  portfolio_value REAL NOT NULL,
  PRIMARY KEY (student_id, month)
);
CREATE TABLE IF NOT EXISTS price_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  skin_id INTEGER NOT NULL REFERENCES skins(skin_id),
  price INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);`;

/** Run fn inside one atomic SQLite transaction (rolls back if fn throws). */
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Wipe all data and restore the original demo state. */
export function seed(db) {
  transaction(db, () => {
    for (const t of ['transactions', 'inventory', 'price_history', 'portfolio_snapshots', 'students', 'skins']) db.exec(`DELETE FROM ${t}`);
    db.exec("DELETE FROM sqlite_sequence");
    const addSkin = db.prepare('INSERT INTO skins VALUES (?,?,?,?,?)');
    const addHist = db.prepare('INSERT INTO price_history (skin_id, price) VALUES (?,?)');
    for (const [id, name, price] of SKINS) {
      addSkin.run(id, name, price, INITIAL_SUPPLY, SENSITIVITY);
      addHist.run(id, price);
    }
    const addUser = db.prepare('INSERT INTO students (username, role, coin_balance) VALUES (?,?,?)');
    const addInv = db.prepare('INSERT INTO inventory (student_id, skin_id) VALUES (?,?)');
    for (const name of STUDENTS) {
      const { lastInsertRowid } = addUser.run(name, 'student', INITIAL_COINS);
      for (const [skinId] of SKINS) addInv.run(lastInsertRowid, skinId);
    }
    addUser.run('Teacher', 'teacher', 0);
  });
}


export function createDb(file = ':memory:') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  if (db.prepare('SELECT COUNT(*) c FROM skins').get().c === 0) {
    if (file === ':memory:') seed(db); else seedScenario(db);
  }
  return db;
}
