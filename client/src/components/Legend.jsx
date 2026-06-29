import { CLASS_COLORS } from '../lib/colors.js';

const ITEMS = [
  ['friendly', 'Own / Allied Naval'],
  ['neutral', 'Known Commercial'],
  ['unknown', 'Unidentified'],
  ['suspect', 'Flagged / Dark'],
];

export default function Legend() {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] glass rounded-lg px-3 py-2 text-[11px] space-y-1">
      <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">Classification</div>
      {ITEMS.map(([k, label]) => (
        <div key={k} className="flex items-center gap-2 text-slate-200">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: CLASS_COLORS[k] }} />
          {label}
        </div>
      ))}
    </div>
  );
}
