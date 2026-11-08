import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export const coins = (n) => `${Math.round(n * 100) / 100}`;
export const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${coins(Math.abs(n))}`;
export const when = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export function Coin({ value, className = '' }) {
  return <span className={`coin ${className}`}><img className="token" src="/assets/token.png" alt="" aria-hidden="true" />{coins(value)}</span>;
}

/** Arrow + sign + colour so the direction is never shown by colour alone. */
export function Change({ amount, pct }) {
  const dir = amount > 0 ? 'up' : amount < 0 ? 'down' : 'flat';
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus;
  const label = dir === 'flat' ? 'no change' : `${dir} ${Math.abs(pct).toFixed(1)} percent`;
  return (
    <span className={`change ${dir}`} aria-label={label}>
      <Icon size={15} aria-hidden="true" />{dir === 'flat' ? '0.0%' : `${Math.abs(pct).toFixed(1)}%`}
    </span>
  );
}

export function Profit({ value }) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  return <span className={`change ${dir}`}>{signed(value)}</span>;
}

export function Message({ msg }) {
  return (
    <div aria-live="polite" role="status">
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
    </div>
  );
}
