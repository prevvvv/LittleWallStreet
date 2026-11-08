import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { SkinArt } from '../art.jsx';
import { Coin, Profit, coins, signed, when } from './Bits.jsx';

export default function Wallet() {
  const [w, setW] = useState(null);
  const [tx, setTx] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([api.wallet(), api.transactions(filter)]).then(([a, b]) => { setW(a); setTx(b); setError(''); }).catch((e) => setError(e.message));
  }, [filter]);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);

  if (error) return <p className="msg error" role="alert">{error}</p>;
  if (!w) return <p>Loading your wallet…</p>;
  return (
    <>
      <h2>My wallet</h2>
      <div className="stats">
        <div className="stat"><span>Coin balance</span><strong><Coin value={w.coinBalance} /></strong></div>
        <div className="stat"><span>Skins value</span><strong><Coin value={w.inventoryValue} /></strong></div>
        <div className="stat"><span>Portfolio value</span><strong><Coin value={w.portfolioValue} /></strong></div>
        <div className="stat"><span>Profit made from selling</span><strong><Profit value={w.totalRealised} /></strong></div>
      </div>

      <h3>My skins</h3>
      <div className="scroll">
        <table>
          <thead><tr><th>Skin</th><th>Owned</th><th>Current price</th><th>Average buy price</th><th>Value</th><th>Profit or loss now</th><th>Profit made from selling</th></tr></thead>
          <tbody>
            {w.items.map((i) => (
              <tr key={i.skinId}>
                <td><span className="skin-cell"><SkinArt skinId={i.skinId} size={40} />{i.name}</span></td>
                <td>{i.quantity}</td>
                <td><Coin value={i.currentPrice} /></td>
                <td>{i.quantity ? <Coin value={i.averageBuyPrice} /> : '–'}</td>
                <td><Coin value={i.marketValue} /></td>
                <td>{i.quantity ? <Profit value={i.unrealised} /> : '–'}</td>
                <td><Profit value={i.realised} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row-between">
        <h3>My transactions</h3>
        <div className="seg" role="group" aria-label="Filter transactions">
          {[['', 'All'], ['BUY', 'Bought'], ['SELL', 'Sold']].map(([v, l]) => (
            <button key={l} aria-pressed={filter === v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>
      {tx.length === 0 ? <p className="empty">No transactions yet. Visit the Marketplace to make your first trade.</p> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Skin</th><th>Type</th><th>Quantity</th><th>Price each</th><th>Total</th><th>Date and time</th></tr></thead>
            <tbody>
              {tx.map((t) => (
                <tr key={t.id}>
                  <td>{t.skin}</td><td>{t.type === 'BUY' ? 'Bought' : 'Sold'}</td><td>{t.quantity}</td>
                  <td><Coin value={t.unitPrice} /></td>
                  <td><span className={`change ${t.type === 'SELL' ? 'up' : 'down'}`}>{t.type === 'SELL' ? '+' : '−'}{coins(t.total)}</span></td>
                  <td>{when(t.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
