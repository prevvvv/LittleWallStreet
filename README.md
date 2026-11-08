# LittleWallStreet

A classroom financial-literacy game: students trade three alien skins (Devil, Cowboy, Astronaut) with coins.
Prices move with real trading (`New Price = Old Price × (1 + 0.01 × (bought − sold))`), capped at ±10% per trade.

**Stack:** React + Vite, Recharts, Lucide, Node + Express, SQLite (Node's built-in `node:sqlite`, nothing native to compile), OpenAI API (via backend only).

## Setup (Node 22.13 or newer)
```bash
npm run install:all                 # installs server + client dependencies
cp server/.env.example server/.env  # then edit: set SESSION_SECRET and (optionally) OPENAI_API_KEY
```
The database is created and seeded automatically on first start.

## Run (two terminals)
```bash
npm run server    # API on http://localhost:3001
npm run client    # app on http://localhost:5173  <- open this
```

## Reset the demo
```bash
npm run seed      # restores 200 coins per student, original prices, clears history
```

## Tests
```bash
npm test          # pricing, buy, sell, weighted average cost, wallet and the full demo scenario
```

## AI assistant
Set `OPENAI_API_KEY` in `server/.env` (never in the frontend). Without a key the chat shows an
"unavailable" message and everything else works. Optionally set `OPENAI_MODEL`.

## Demo script
1. Log in as **Student 01**, Marketplace → Devil → Buy 1 (200 coins). Price becomes 202.
2. Log out, log in as **Student 02** → Buy Devil: fails (not enough coins).
3. **Teacher** → Award 100 coins to Student 02.
4. Student 02 buys Devil at 202 → price 204.
5. Student 01 sells Devil at 204 → balance 204, profit 4. Open the chart and the Wallet page.
6. Ask Cosmo: "Why did I make a profit?"

## Notes
- Sessions are server-side cookies; every student endpoint uses the session's student, never an id from the client. Teacher endpoints require the teacher role.
- Trades run inside one immediate SQLite transaction, so balances and inventory cannot go out of sync.
- To keep prices moving at very low values, a buy or sell always changes the price by at least 1 coin.
- Skin artwork lives in `client/src/art.jsx` so it is easy to replace.


## Updated showcase scenario

New persistent databases now start with three students with different coin balances, real
purchase/sale histories, and different inventories. Prices have multiple up/down movements,
all generated through the same trading engine as the app. The normal in-memory test seed
remains at 200 coins with empty inventories so the original automated tests remain valid.

To reset the persistent demo to this showcase scenario, stop the server, remove its
SQLite database file, and restart the server. The `npm run seed` command instead restores
the original 200-coin empty-inventory scenario. Uploaded alien artwork is in
`client/public/assets/`. The avatar preview offers only outfits currently owned by the
logged-in student. The leaderboard ranks students by current portfolio value.


## Random scenario and live market
- `npm run seed` builds a **new random scenario**: 3 students with different starting coins, 7-10 real trades each at random past times, and ~18 minutes of price history. Restart the server after reseeding.
- Moods (edit `MOODS` and the move functions in `server/src/scenario.js`): **Devil = market crash, Cowboy = random, Astronaut = boom**.
- While the server runs, the wider market ticks every 3 seconds, so charts move live. Student trades still move prices with the supply-and-demand formula. Set `MARKET_SIM=off` in `.env` to switch the live ticks off.
- Charts show candlesticks (green = price rose, red = fell) with a Candles / Line toggle.

## Token, confetti and monthly performance
- The coin icon is `client/public/assets/token.png` (replace the file to change it everywhere).
- A 1.8 second space-confetti burst (`client/src/confetti.js`) plays after every successful buy or sell. It is skipped for people who prefer reduced motion.
- **Monthly performance** (teacher dashboard only, under the Market table) shows each student's portfolio value per month. The earlier five months are demo history generated at seed time; the current month is live from real trades and prices.
