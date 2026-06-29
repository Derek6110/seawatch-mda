import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store.js';
import { api } from '../api.js';
import { ROLE_LABELS } from '../lib/roles.js';
import Logo from './Logo.jsx';

export default function Login() {
  const { login, register, authError, signupMessage, clearSignupMessage } = useStore();
  const [mode, setMode] = useState('login'); // login | signup
  const [busy, setBusy] = useState(false);
  const [mocs, setMocs] = useState([]);
  const [form, setForm] = useState({
    name: '', email: 'director@navy.gh', password: 'seawatch',
    role: 'watchkeeper', mocId: 'moc-nhq',
  });

  useEffect(() => { api.mocs().then(setMocs).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else { await register(form); setMode('login'); } // pending approval — back to sign in
    } catch { /* error surfaced via authError */ } finally { setBusy(false); }
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const switchMode = (m) => { setMode(m); clearSignupMessage(); };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-navy-950 relative overflow-hidden">
      {/* subtle radar grid backdrop */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle at center, #3aa6ff 0, transparent 60%), repeating-linear-gradient(0deg,#3aa6ff 0 1px,transparent 1px 48px), repeating-linear-gradient(90deg,#3aa6ff 0 1px,transparent 1px 48px)' }} />

      <div className="relative w-[400px] glass rounded-xl p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-1">
          <Logo size={48} />
          <div>
            <div className="text-2xl font-bold tracking-widest text-white">SeaWatch</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Ghana Navy · Maritime Domain Awareness</div>
          </div>
        </div>

        <div className="flex gap-1 my-5 bg-navy-850 p-1 rounded-lg">
          {['login', 'signup'].map((m) => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize ${
                mode === m ? 'bg-ghana-gold text-navy-950' : 'text-slate-300 hover:text-white'}`}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {signupMessage && (
          <div className="mb-3 text-sm text-ghana-green bg-ghana-green/10 border border-ghana-green/30 rounded px-3 py-2 flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>{signupMessage} An administrator will review your request — you can sign in once approved.</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <Input label="Full name & rank" value={form.name}
              onChange={(v) => set({ name: v })} placeholder="e.g. Lt. K. Mensah" required />
          )}
          <Input label="Email" type="email" value={form.email}
            onChange={(v) => set({ email: v })} placeholder="name@navy.gh" required />
          <Input label="Password" type="password" value={form.password}
            onChange={(v) => set({ password: v })} placeholder="••••••••" required />

          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select value={form.role} onChange={(e) => set({ role: e.target.value })}
                  className="w-full bg-navy-900 border border-navy-700 rounded px-2 py-2 text-sm text-white">
                  {Object.entries(ROLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              <Field label="Command / MOC">
                <select value={form.mocId} onChange={(e) => set({ mocId: e.target.value })}
                  className="w-full bg-navy-900 border border-navy-700 rounded px-2 py-2 text-sm text-white">
                  {mocs.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
                </select>
              </Field>
            </div>
          )}

          {authError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {authError}
            </div>
          )}

          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-ghana-gold text-navy-950 font-semibold hover:brightness-110 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-navy-700 text-[11px] text-slate-400 leading-relaxed">
          <span className="text-slate-300 font-medium">Demo accounts</span> (password <code className="text-ghana-gold">seawatch</code>):
          director@navy.gh · deputy@navy.gh · oic@navy.gh · supervisor@navy.gh · watch@navy.gh
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <Field label={label}>
      <input type={type} value={value} required={required} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-navy-900 border border-navy-700 rounded px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ghana-gold" />
    </Field>
  );
}
