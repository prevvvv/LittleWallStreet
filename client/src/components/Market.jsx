import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { SkinArt } from '../art.jsx';
import { Change, Coin, Message, coins } from './Bits.jsx';
import PriceChart from './PriceChart.jsx';
import ChatPanel from './ChatPanel.jsx';
import AvatarPanel from './AvatarPanel.jsx';
import Leaderboard from './Leaderboard.jsx';
import { fireConfetti } from '../confetti.js';

function Detail({ skin, owned, balance, onTraded, onBack }) {
  const [history, setHistory] = useState([]);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState(null);
  const q = Number.isInteger(Number(qty)) && Number(qty) > 0 ? Number(qty) : 0;

  useEffect(() => { // live chart: refresh the price history every 2 seconds
    let on = true;
    const get = () => api.history(skin.id).then((h) => on && setHistory(h)).catch(() => {});
    get();
    const t = setInterval(get, 2000);
    return () => { on = false; clearInterval(t); };
  }, [skin.id]);

  async function trade(kind) {
    if (!q) return setMsg({ type: 'error', text: 'Please enter a whole number of 1 or more.' });
    try {
      const r = await (kind === 'buy' ? api.buy : api.sell)(skin.id, q);
      const profit = kind === 'sell' ? ` You ${r.realisedProfitLoss >= 0 ? 'made' : 'lost'} ${coins(Math.abs(r.realisedProfitLoss))} coins on this sale.` : '';
      setMsg({ type: 'ok', text: `${kind === 'buy' ? 'Bought' : 'Sold'} ${q} ${skin.name} for ${r.total} coins.${profit} New price: ${r.newPrice}.` });
      fireConfetti();
      onTraded();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
  }

  return (
    <section className="detail" aria-label={`${skin.name} details`}>
      <button className="link" onClick={onBack}>← Back to all skins</button>
      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-head"><SkinArt skinId={skin.id} size={140} />
            <div><h2>{skin.name} Alien</h2>
              <p className="big-price"><Coin value={skin.price} /> <Change amount={skin.change} pct={skin.changePct} /></p>
              <p>You own {owned}</p></div>
          </div>
          <PriceChart history={history} startPrice={skin.startPrice} />
        </div>
        <div className="trade">
          <h3>Trade</h3>
          <label htmlFor="qty">Quantity</label>
          <input id="qty" type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          <p>Total: <Coin value={q * skin.price} /></p>
          <p className="muted">Your coins: {balance}</p>
          <div className="btns">
            <button className="btn buy" onClick={() => trade('buy')}>Buy {q || ''}</button>
            <button className="btn sell" onClick={() => trade('sell')}>Sell {q || ''}</button>
          </div>
          <Message msg={msg} />
        </div>
      </div>
    </section>
  );
}

export default function Market({ userId }) {
  const [skins, setSkins] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [sel, setSel] = useState(null);
  const [error, setError] = useState('');
  const [leaders, setLeaders] = useState([]);

  const load = useCallback(() => {
    Promise.all([api.skins(), api.wallet(), api.leaderboard()]).then(([s, w, l]) => { setSkins(s); setWallet(w); setLeaders(l); }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, [load]);

  if (error) return <p className="msg error" role="alert">{error}</p>;
  if (!wallet) return <p>Loading the market…</p>;
  const skin = skins.find((s) => s.id === sel);
  const owned = (id) => wallet.items.find((i) => i.skinId === id)?.quantity ?? 0;

  return (
    <div className="market-layout">
      <div className="market-left">
        {skin ? <Detail skin={skin} owned={owned(skin.id)} balance={wallet.coinBalance} onTraded={load} onBack={() => setSel(null)} /> : (
          <section className="market-list">
            <h2>Marketplace</h2>
            <p className="muted">You have <Coin value={wallet.coinBalance} />. Prices move live. Arrows show the change over about the last minute.</p>
            <div className="cards">
              {skins.map(s => <article className="card" key={s.id}>
                <SkinArt skinId={s.id} size={110}/>
                <h3>{s.name}</h3>
                <p className="price"><Coin value={s.price}/><Change amount={s.change} pct={s.changePct}/></p>
                <p className="muted">You own {owned(s.id)}</p>
                <button className="btn" onClick={() => setSel(s.id)}>View & trade</button>
              </article>)}
            </div>
          </section>
        )}
        <Leaderboard students={leaders}/>
      </div>
      <aside className="market-sidebar">
        <AvatarPanel wallet={wallet} userId={userId}/>
        <ChatPanel/>
      </aside>
    </div>
  );
}
