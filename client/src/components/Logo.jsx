import { useState } from 'react';
import { Anchor } from 'lucide-react';

// Renders the Ghana Navy crest from /ghana-navy-logo.png. If that file hasn't
// been added yet, falls back to the gradient anchor mark so the UI never breaks.
export default function Logo({ size = 36 }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    return (
      <img
        src="/ghana-navy-logo.png"
        alt="Ghana Navy"
        width={size}
        height={size}
        onError={() => setOk(false)}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="relative rounded bg-gradient-to-br from-ghana-green via-ghana-gold to-ghana-red flex items-center justify-center"
    >
      <Anchor size={size * 0.55} className="text-navy-950" />
      <span className="absolute -top-1 -right-1 text-ghana-gold text-xs">★</span>
    </div>
  );
}
