import 'dotenv/config';
import { createDb } from './db.js';
import { seedScenario } from './scenario.js';
const db = createDb(process.env.DB_PATH || './data/littlewallstreet.db');
seedScenario(db);
console.log('LittleWallStreet reset with a new random scenario (3 students with different coins, fresh price history).');
