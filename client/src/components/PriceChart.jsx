import { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

const UP = '#22c55e', DOWN = '#ef4444';
const CANDLE_TICKS = 5;   // price ticks per candle (about 15 seconds)
const MAX_CANDLES = 60;
const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Turn price ticks into open/high/low/close candles. */
function toCandles(history) {
  const groups = new Map();
  for (const h of history) {
    const key = Math.floor(h.n / CANDLE_TICKS);
    const g = groups.get(key);
    if (!g) groups.set(key, { label: clock(h.time), open: h.price, high: h.price, low: h.price, close: h.price });
    else { g.high = Math.max(g.high, h.price); g.low = Math.min(g.low, h.price); g.close = h.price; }
  }
  return [...groups.values()].slice(-MAX_CANDLES).map((c) => ({ ...c, range: [c.low, c.high] }));
}

function Candle({ x, y, width, height, payload }) {
  const { open, close, high, low } = payload;
  const color = close >= open ? UP : DOWN;
  const px = high > low ? height / (high - low) : 0;
  const bodyTop = y + (high - Math.max(open, close)) * px;
  const bodyH = Math.max(2, Math.abs(close - open) * px);
  const cx = x + width / 2, bw = Math.max(3, width * 0.7);
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <rect x={cx - bw / 2} y={px ? bodyTop : y - 1} width={bw} height={bodyH} rx={2} fill={color} />
    </g>
  );
}

function Tip({ active, payload, mode }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="ctip">
      <strong>{d.label}</strong>
      {mode === 'candles'
        ? <span>Open {d.open} · High {d.high} · Low {d.low} · Close {d.close}</span>
        : <span>Price {d.price} coins</span>}
    </div>
  );
}

export default function PriceChart({ history, startPrice }) {
  const [mode, setMode] = useState('candles');
  const candles = useMemo(() => toCandles(history), [history]);
  const ticks = useMemo(() => history.slice(-200).map((h) => ({ label: clock(h.time), price: h.price })), [history]);
  const data = mode === 'candles' ? candles : ticks;
  const last = history.at(-1)?.price ?? startPrice;
  const lastCandle = candles.at(-1);
  const rising = lastCandle ? lastCandle.close >= lastCandle.open : true;
  const values = mode === 'candles' ? candles.flatMap((c) => [c.low, c.high]) : ticks.map((t) => t.price);
  const lo = Math.min(...values, startPrice), hi = Math.max(...values, startPrice);
  const pad = Math.max(2, (hi - lo) * 0.08);
  const domain = [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)];

  return (
    <div className="tchart">
      <div className="tchart-bar">
        <span className="live"><i aria-hidden="true" />LIVE</span>
        <span className="legend">
          <span className="up"><ArrowUp size={14} aria-hidden="true" /> Green = price went up</span>
          <span className="down"><ArrowDown size={14} aria-hidden="true" /> Red = price went down</span>
        </span>
        <div className="seg dark" role="group" aria-label="Chart type">
          {[['candles', 'Candles'], ['line', 'Line']].map(([v, l]) => (
            <button key={v} className={mode === v ? 'on' : ''} aria-pressed={mode === v} onClick={() => setMode(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div role="img" aria-label={`Live ${mode === 'candles' ? 'candlestick' : 'line'} chart. Started at ${startPrice} coins, now ${last} coins.`}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#222a35" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9aa7b8' }} stroke="#3a4552" interval="preserveStartEnd" minTickGap={50} />
            <YAxis orientation="right" domain={domain} allowDecimals={false} tick={{ fontSize: 12, fill: '#9aa7b8' }} stroke="#3a4552" width={48} />
            <Tooltip content={<Tip mode={mode} />} cursor={{ stroke: '#5b6878', strokeDasharray: '3 3' }} />
            <ReferenceLine y={startPrice} stroke="#7b8797" strokeDasharray="5 4" label={{ value: `Start ${startPrice}`, fontSize: 11, fill: '#9aa7b8', position: 'insideTopLeft' }} />
            <ReferenceLine y={last} stroke={rising ? UP : DOWN} strokeDasharray="2 3" label={{ value: String(last), fontSize: 12, fill: rising ? UP : DOWN, position: 'insideBottomRight' }} />
            {mode === 'candles'
              ? <Bar dataKey="range" shape={<Candle />} isAnimationActive={false} />
              : <Line type="monotone" dataKey="price" stroke={rising ? UP : DOWN} strokeWidth={2.5} dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
