import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [accounts, setAccounts] = useState([]);
  const [pick, setPick] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.accounts().then(setAccounts).catch(() => setError('Cannot reach the server. Is the backend running?')); }, []);

  async function enter(e) {
    e.preventDefault();
    if (!pick) return setError('Please choose an account first.');
    try { onLogin(await api.login(pick)); } catch (err) { setError(err.message); }
  }

  return (
    <main className="login">
      <div className="login-card">
        <h1 className="login-h1"><img className="login-logo" src="/assets/logo.png" alt="LittleWallStreet" /></h1>
        <p className="tagline">Earn. Trade. Save. Learn.</p>
        <p>Buy and sell alien skins with your class coins. Prices go up when lots of people buy and down when lots of people sell. Can you grow your coins?</p>
        <form onSubmit={enter}>
          <fieldset>
            <legend>Choose a demo account</legend>
            {accounts.map((a) => (
              <label key={a.username} className={`choice ${pick === a.username ? 'on' : ''}`}>
                <input type="radio" name="account" value={a.username} checked={pick === a.username} onChange={() => { setPick(a.username); setError(''); }} />
                {a.username}<small>{a.role}</small>
              </label>
            ))}
          </fieldset>
          {error && <p className="msg error" role="alert">{error}</p>}
          <button className="btn big" type="submit"><LogIn size={18} aria-hidden="true" /> Enter LittleWallStreet</button>
        </form>
      </div>
    </main>
  );
}
