import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Coin, Change, Message } from './Bits.jsx';
import PerformanceChart from './PerformanceChart.jsx';

export default function Teacher() {
  const [students, setStudents] = useState([]);
  const [skins, setSkins] = useState([]);
  const [sel, setSel] = useState('');
  const [amount, setAmount] = useState(100);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => { Promise.all([api.students(), api.skins()]).then(([a, b]) => { setStudents(a); setSkins(b); }); }, []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  async function award(e) {
    e.preventDefault();
    const name = students.find((s) => String(s.id) === sel)?.username;
    if (!name) return setMsg({ type: 'error', text: 'Please select a student first.' });
    try {
      const r = await api.award(Number(sel), Number(amount));
      setMsg({ type: 'ok', text: `Awarded ${amount} coins to ${name}. They now have ${r.coinBalance}.` }); load();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  }

  return (
    <>
      <h2>Teacher dashboard</h2>
      <h3>Students</h3>
      <div className="scroll">
        <table>
          <thead><tr><th>Student</th><th>Coins</th>{skins.map((s) => <th key={s.id}>{s.name} owned</th>)}<th>Portfolio value</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.username}</td><td><Coin value={s.coinBalance} /></td>
                {s.items.map((i) => <td key={i.skinId}>{i.quantity}</td>)}
                <td><Coin value={s.portfolioValue} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="award" onSubmit={award}>
        <h3>Award coins</h3>
        <label htmlFor="student">Student</label>
        <select id="student" value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Choose a student</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.username}</option>)}
        </select>
        <label htmlFor="amount">Number of coins</label>
        <input id="amount" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn" type="submit">Award Coins</button>
        <Message msg={msg} />
      </form>

      <h3>Market</h3>
      <div className="scroll">
        <table>
          <thead><tr><th>Skin</th><th>Price</th><th>Change</th></tr></thead>
          <tbody>
            {skins.map((s) => (
              <tr key={s.id}><td>{s.name}</td><td><Coin value={s.price} /></td><td><Change amount={s.change} pct={s.changePct} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <PerformanceChart />
    </>
  );
}
