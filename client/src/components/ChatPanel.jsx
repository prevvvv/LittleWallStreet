import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { api } from '../api.js';

const IDEAS = ['Why did the Devil skin price change?', 'How much profit have I made?', 'What does supply and demand mean?'];

// Ready-made answers for the three suggested questions (no AI call needed, so they always work).
const CANNED = {
  [IDEAS[0]]: "Skin prices move with supply and demand! When lots of players want to buy a skin, demand goes up, so the price goes up. When lots of players sell, demand goes down, so the price goes down. The Devil's price changes because of what you and the other students do, and the busy space market nudges it up and down too. Look at the Devil chart: green candles mean the price rose, red candles mean it fell.",
  [IDEAS[1]]: "You can see your profit on the Wallet page! \"Profit made from selling\" is real profit: the coins you gained or lost when you sold a skin (the price you sold at minus the average price you paid). \"Profit or loss now\" is for skins you still own. It only becomes real if you sell them. Open the Wallet to see your own numbers.",
  [IDEAS[2]]: "Supply is how many skins are for sale. Demand is how many players want to buy them. In real markets, when lots of people want something and there is not much of it, the price goes up. In LittleWallStreet there are always plenty of skins, so the price moves with demand: lots of buying pushes it up, lots of selling pushes it down. In LittleWallStreet, every skin bought pushes the price up by about 1%, and every skin sold pushes it down by about 1%.",
};

export default function ChatPanel() {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([{ from: 'bot', text: 'Hi! I am Cosmo, your space money buddy. Ask me about prices, profit or how trading works.' }]);

  async function ask(q) {
    if (!q.trim() || busy) return;
    setLog((l) => [...l, { from: 'me', text: q }]);
    setText('');
    const canned = CANNED[q.trim()];
    if (canned) { setLog((l) => [...l, { from: 'bot', text: canned }]); return; }
    setBusy(true);
    try {
      const { answer } = await api.chat(q);
      setLog((l) => [...l, { from: 'bot', text: answer }]);
    } catch (e) {
      setLog((l) => [...l, { from: 'bot', text: e.message, error: true }]);
    } finally { setBusy(false); }
  }

  if (!open) return <button className="btn chat-reopen" onClick={() => setOpen(true)}><MessageCircle size={20} aria-hidden="true" /> Ask Cosmo</button>;
  return (
    <section className="chat chat-embedded" aria-label="Ask Cosmo chat">
      <header><strong>Ask Cosmo</strong>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
      </header>
      <div className="chat-log" aria-live="polite">
        {log.map((m, i) => <p key={i} className={`bubble ${m.from} ${m.error ? 'error' : ''}`}>{m.text}</p>)}
        {busy && <p className="bubble bot">Thinking…</p>}
      </div>
      <div className="chips">{IDEAS.map((q) => <button key={q} onClick={() => ask(q)}>{q}</button>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <label htmlFor="chat-input" className="sr-only">Your question</label>
        <input id="chat-input" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Type a question" />
        <button className="btn" type="submit" disabled={busy}><Send size={16} aria-hidden="true" /> Send</button>
      </form>
    </section>
  );
}
