import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { api } from '../api.js';

// Colour AND line style differ per student, so the lines never rely on colour alone.
const STYLES = [['#2563eb', undefined], ['#d97706', '7 4'], ['#7c3aed', '2 4'], ['#0f766e', '10 3 2 3'], ['#be185d', '4 4']];
const monthLabel = (m) => new Date(`${m}-01T12:00:00`).toLocaleDateString([], { month: 'short', year: '2-digit' });

export default function PerformanceChart() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let on = true;
    const load = () => api.performance().then((d) => on && setData(d)).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => { on = false; clearInterval(t); };
  }, []);

  if (!data) return null;
  const rows = data.rows.map((r) => ({ ...r, label: monthLabel(r.month) }));
  return (
    <section className="perf" aria-label="Monthly performance of each student">
      <h3>📈 Monthly performance</h3>
      <p className="muted">Portfolio value (coins + skins) at the end of each month. The latest month updates live.</p>
      <div role="img" aria-label={`Line chart of monthly portfolio value for ${data.students.join(', ')}.`}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#e3e8ee" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 13 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 13 }} width={54} />
            <Tooltip formatter={(v, name) => [`${v} coins`, name]} />
            <Legend />
            {data.students.map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={STYLES[i % STYLES.length][0]} strokeDasharray={STYLES[i % STYLES.length][1]}
                strokeWidth={3} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
