import 'dotenv/config';
import { createDb } from './db.js';
import { createApp } from './app.js';
import { startMarketTicker } from './scenario.js';
import { ensureMonthlyHistory } from './performance.js';

const db = createDb(process.env.DB_PATH || './data/littlewallstreet.db');
ensureMonthlyHistory(db);
const port = process.env.PORT || 3001;
createApp(db).listen(port, () => {
  console.log(`LittleWallStreet API on http://localhost:${port}`);
  if (process.env.MARKET_SIM !== 'off') { startMarketTicker(db); console.log('Live market simulation running (set MARKET_SIM=off to disable).'); }
  if (!process.env.OPENAI_API_KEY) console.log('Note: OPENAI_API_KEY not set - AI assistant disabled.');
});
