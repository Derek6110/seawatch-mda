import { useEffect } from 'react';
import { History, Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';
import { useStore } from '../store.js';
import { fmtTime } from '../lib/format.js';

export default function ReplayBar() {
  const { replayMode, replayFrames, replayIndex, replayPlaying,
    enterReplay, exitReplay, setReplayIndex, toggleReplayPlay } = useStore();

  // Advance frames while playing.
  useEffect(() => {
    if (!replayMode || !replayPlaying) return;
    const id = setInterval(() => {
      const { replayIndex: i, replayFrames: f, setReplayIndex: set, toggleReplayPlay: stop } = useStore.getState();
      if (i >= f.length - 1) { stop(); return; }
      set(i + 1);
    }, 500);
    return () => clearInterval(id);
  }, [replayMode, replayPlaying]);

  if (!replayMode) {
    return (
      <button onClick={enterReplay}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] glass rounded-full px-4 py-2 flex items-center gap-2 text-sm text-white hover:border-ghana-gold">
        <History size={15} className="text-ghana-gold" /> Track Replay
      </button>
    );
  }

  const frame = replayFrames[replayIndex];
  const ts = frame?.ts;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] glass rounded-lg px-3 py-2 flex items-center gap-3 w-[560px] max-w-[90vw]">
      <span className="flex items-center gap-1.5 text-xs text-ghana-gold font-semibold uppercase tracking-wide shrink-0">
        <History size={14} /> Replay
      </span>
      <button onClick={() => setReplayIndex(replayIndex - 1)} className="text-slate-300 hover:text-white"><SkipBack size={16} /></button>
      <button onClick={toggleReplayPlay} className="text-navy-950 bg-ghana-gold rounded-full w-7 h-7 flex items-center justify-center hover:brightness-110">
        {replayPlaying ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <button onClick={() => setReplayIndex(replayIndex + 1)} className="text-slate-300 hover:text-white"><SkipForward size={16} /></button>
      <input type="range" min={0} max={Math.max(0, replayFrames.length - 1)} value={replayIndex}
        onChange={(e) => setReplayIndex(Number(e.target.value))}
        className="flex-1 accent-ghana-gold" />
      <span className="text-xs font-mono text-slate-300 shrink-0 w-28 text-right">
        {ts ? fmtTime(ts) : '—'} · {replayIndex + 1}/{replayFrames.length}
      </span>
      <button onClick={exitReplay} className="text-slate-400 hover:text-white shrink-0"><X size={16} /></button>
    </div>
  );
}
