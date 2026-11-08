// Placeholder skin artwork. Replace any entry (or swap in <img src="...">) to change a skin's look.
// Every skin is an alien; the extra bits are what make each skin different.
const Alien = ({ children, color = '#7ddc6f' }) => (
  <svg viewBox="0 0 120 120" role="img" aria-hidden="true" className="skin-art">
    <ellipse cx="60" cy="112" rx="26" ry="5" fill="rgba(0,0,0,.12)" />
    <ellipse cx="60" cy="68" rx="32" ry="38" fill={color} />
    <ellipse cx="46" cy="64" rx="9" ry="13" fill="#10241a" transform="rotate(-18 46 64)" />
    <ellipse cx="74" cy="64" rx="9" ry="13" fill="#10241a" transform="rotate(18 74 64)" />
    <circle cx="43" cy="60" r="3" fill="#fff" /><circle cx="71" cy="60" r="3" fill="#fff" />
    <path d="M52 88 Q60 94 68 88" stroke="#10241a" strokeWidth="3" fill="none" strokeLinecap="round" />
    {children}
  </svg>
);

export const SKIN_ART = {
  1: () => (
    <Alien color="#8fdc6a">
      <path d="M36 40 L30 18 L48 34 Z" fill="#d6322f" /><path d="M84 40 L90 18 L72 34 Z" fill="#d6322f" />
    </Alien>
  ),
  2: () => (
    <Alien color="#7ddc8f">
      <ellipse cx="60" cy="36" rx="46" ry="8" fill="#9a5b2a" />
      <path d="M38 36 Q40 10 60 12 Q80 10 82 36 Z" fill="#b87333" />
      <rect x="38" y="28" width="44" height="6" fill="#6b3a17" />
    </Alien>
  ),
  3: () => (
    <Alien color="#74d6a4">
      <circle cx="60" cy="64" r="44" fill="rgba(180,225,255,.28)" stroke="#e8eef5" strokeWidth="6" />
      <rect x="40" y="104" width="40" height="10" rx="4" fill="#e8eef5" />
      <circle cx="94" cy="96" r="5" fill="#f5b82e" />
    </Alien>
  ),
};

// Skins that use real artwork (files live in client/public/assets). 0 = plain alien.
const IMAGES = {
  0: ['/assets/plain-alien.png', 'Plain alien'],
  1: ['/assets/devil-alien.png', 'Devil alien'],
  2: ['/assets/cowboy-alien.png', 'Cowboy alien'],
  3: ['/assets/astronaut-alien.png', 'Astronaut alien'],
};

export function SkinArt({ skinId, size = 96 }) {
  const img = IMAGES[skinId];
  if (img) return <img className="skin-art" src={img[0]} alt={img[1]} style={{ width: size, height: size, objectFit: 'contain' }} />;
  const Art = SKIN_ART[skinId];
  return <div style={{ width: size, height: size }}>{Art && <Art />}</div>;
}
