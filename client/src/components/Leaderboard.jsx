import { Coin } from './Bits.jsx';
export default function Leaderboard({ students = [], currentUserId }) {
  return <section className="leaderboard" aria-label="Portfolio leaderboard">
    <div className="leaderboard-title"><h3>🏆 Portfolio leaderboard</h3><p className="muted">Ranked by coins + current value of owned skins</p></div>
    <ol>{students.map((s,i) => <li key={s.id} className={s.id===currentUserId?'self':''}>
      <span className="rank">#{i+1}</span><strong>{s.username}{s.id===currentUserId?' (you)':''}</strong>
      <span className="leader-coins"><Coin value={s.portfolioValue}/></span>
    </li>)}</ol>
  </section>;
}
