import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, Store, LogOut, GraduationCap } from 'lucide-react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import WalletPage from './components/Wallet.jsx';
import Market from './components/Market.jsx';
import Teacher from './components/Teacher.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [page, setPage] = useState('market');

  useEffect(() => { api.session().then(setUser).catch(() => setUser(null)); }, []);
  if (user === undefined) return <p className="center">Loading…</p>;
  if (!user) return <Login onLogin={(u) => { setUser(u); setPage(u.role === 'teacher' ? 'teacher' : 'market'); }} />;

  const tabs = user.role === 'teacher'
    ? [['teacher', 'Dashboard', GraduationCap]]
    : [['market', 'Marketplace', Store], ['wallet', 'Wallet', WalletIcon]];

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav">
        <img className="nav-logo" src="/assets/logo.png" alt="LittleWallStreet" />
        <nav aria-label="Main">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} className={page === id ? 'on' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>
              <Icon size={17} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <span className="who">{user.username}
          <button onClick={() => api.logout().then(() => setUser(null))}><LogOut size={16} aria-hidden="true" /> Log out</button>
        </span>
      </header>
      <main id="main" className="page" key={user.id}>
        {user.role === 'teacher' ? <Teacher /> : page === 'wallet' ? <WalletPage /> : <Market userId={user.id} />}
      </main>
    </>
  );
}
