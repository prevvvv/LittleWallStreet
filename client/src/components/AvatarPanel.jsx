import { useEffect, useState } from 'react';
import { SkinArt } from '../art.jsx';

export default function AvatarPanel({ wallet, userId }) {
  const [outfit, setOutfit] = useState(() => Number(localStorage.getItem(`alien-outfit-${userId}`) || 0));
  useEffect(() => { setOutfit(Number(localStorage.getItem(`alien-outfit-${userId}`) || 0)); }, [userId]);
  useEffect(() => { localStorage.setItem(`alien-outfit-${userId}`, String(outfit)); }, [outfit, userId]);
  const owned = wallet?.items?.filter(i => i.quantity > 0) || [];
  useEffect(() => { if (outfit && !owned.some(i => i.skinId === outfit)) setOutfit(0); }, [wallet, outfit]);
  return <section className="avatar-panel" aria-label="Your alien avatar">
    <h3>My Alien</h3>
    <div className="avatar-stage"><SkinArt skinId={outfit} size={245}/></div>
    <p className="muted avatar-caption">{outfit ? `${owned.find(i=>i.skinId===outfit)?.name} outfit equipped` : 'Plain alien · choose an owned outfit below'}</p>
    <label htmlFor="outfit-select">Change outfit</label>
    <select id="outfit-select" value={outfit} onChange={e => setOutfit(Number(e.target.value))}>
      <option value={0}>Plain alien (default)</option>
      {owned.map(i => <option key={i.skinId} value={i.skinId}>{i.name} ({i.quantity} owned)</option>)}
    </select>
    {!owned.length && <p className="muted">Buy a skin to unlock an outfit!</p>}
  </section>;
}
