async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const api = {
  accounts: () => request('/demo-accounts'),
  session: () => request('/session'),
  login: (username) => request('/login', { method: 'POST', body: { username } }),
  logout: () => request('/logout', { method: 'POST' }),
  wallet: () => request('/wallet'),
  transactions: (type) => request(`/my-transactions${type ? `?type=${type}` : ''}`),
  skins: () => request('/skins'),
  leaderboard: () => request('/leaderboard'),
  performance: () => request('/performance'),
  history: (id) => request(`/skins/${id}/history`),
  buy: (skinId, quantity) => request('/buy', { method: 'POST', body: { skinId, quantity } }),
  sell: (skinId, quantity) => request('/sell', { method: 'POST', body: { skinId, quantity } }),
  chat: (question) => request('/chat', { method: 'POST', body: { question } }),
  students: () => request('/teacher/students'),
  award: (studentId, amount) => request('/teacher/award-coins', { method: 'POST', body: { studentId, amount } }),
};
