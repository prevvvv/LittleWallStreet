// Space confetti in the style of paper cut-outs: gold dots, stars, rockets, ringed planets and moons.
const COLORS = ['#e0a81c', '#e0a81c', '#a9dce3', '#8d9c88', '#ffffff', '#1d1d1d'];
const DURATION = 1800; // ms

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
const SHAPES = {
  dot: (ctx, r) => circle(ctx, 0, 0, r * 0.8),
  star: (ctx, r) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const d = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
    ctx.closePath(); ctx.fill();
  },
  rocket: (ctx, r) => {
    ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.quadraticCurveTo(r * 0.8, -r * 0.2, r * 0.45, r * 0.7);
    ctx.lineTo(-r * 0.45, r * 0.7); ctx.quadraticCurveTo(-r * 0.8, -r * 0.2, 0, -r * 1.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.7); ctx.lineTo(-r * 0.6, r * 1.35); ctx.lineTo(-r * 0.2, r * 1); ctx.lineTo(0, r * 1.5);
    ctx.lineTo(r * 0.2, r * 1); ctx.lineTo(r * 0.6, r * 1.35); ctx.lineTo(r * 0.45, r * 0.7); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, 0, -r * 0.1, r * 0.22);
  },
  planet: (ctx, r) => {
    circle(ctx, 0, 0, r * 0.7);
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = r * 0.18;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.4, -0.5, 0, Math.PI * 2); ctx.stroke();
  },
  moon: (ctx, r) => {
    circle(ctx, 0, 0, r);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; circle(ctx, -r * 0.3, -r * 0.2, r * 0.22); circle(ctx, r * 0.3, r * 0.1, r * 0.3); circle(ctx, -r * 0.1, r * 0.5, r * 0.15);
  },
};
const KINDS = ['dot', 'dot', 'star', 'star', 'rocket', 'planet', 'moon'];

/** Fire a 1.8 second burst of confetti from the middle of the screen. */
export function fireConfetti() {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: 110 }, () => {
    const angle = Math.random() * Math.PI * 2, speed = 5 + Math.random() * 11;
    return {
      x: window.innerWidth / 2, y: window.innerHeight * 0.45,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 4,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
      size: 9 + Math.random() * 11, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      kind: KINDS[Math.floor(Math.random() * KINDS.length)],
    };
  });

  const t0 = performance.now();
  (function frame(now) {
    const t = now - t0;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalAlpha = t > DURATION - 400 ? Math.max(0, (DURATION - t) / 400) : 1;
    for (const p of parts) {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.35; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; SHAPES[p.kind](ctx, p.size);
      ctx.restore();
    }
    if (t < DURATION) requestAnimationFrame(frame); else canvas.remove();
  })(t0);
}
