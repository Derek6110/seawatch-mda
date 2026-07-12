import { useEffect, useState } from 'react';
import { X, UserPlus, Check, Trash2, ShieldCheck, Search, Fingerprint } from 'lucide-react';
import { useStore } from '../store.js';
import { ROLE_LABELS, ROLES } from '../lib/roles.js';
import { fmtTime } from '../lib/format.js';

const STATUS_STYLE = {
  approved: 'bg-ghana-green/20 text-ghana-green',
  pending: 'bg-threat-medium/20 text-threat-medium',
  disabled: 'bg-red-500/20 text-red-300',
};

function AddUserForm({ mocs, onCreate, onClose }) {
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'watchkeeper', mocId: mocs[0]?.id || 'moc-nhq' });
  const [err, setErr] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try { await onCreate(f); onClose(); } catch (ex) { setErr(ex.message); }
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 p-3 bg-navy-850 rounded-lg border border-navy-700 mb-3">
      <input required placeholder="Full name & rank" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
        className="bg-navy-900 border border-navy-700 rounded px-2 py-1.5 text-sm text-white col-span-2" />
      <input required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })}
        className="bg-navy-900 border border-navy-700 rounded px-2 py-1.5 text-sm text-white" />
      <input required type="password" placeholder="Temp password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })}
        className="bg-navy-900 border border-navy-700 rounded px-2 py-1.5 text-sm text-white" />
      <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}
        className="bg-navy-900 border border-navy-700 rounded px-2 py-1.5 text-sm text-white">
        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
      <select value={f.mocId} onChange={(e) => setF({ ...f, mocId: e.target.value })}
        className="bg-navy-900 border border-navy-700 rounded px-2 py-1.5 text-sm text-white">
        {mocs.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
      </select>
      {err && <div className="col-span-2 text-xs text-red-400">{err}</div>}
      <div className="col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-navy-700 text-slate-200">Cancel</button>
        <button type="submit" className="px-3 py-1.5 text-sm rounded bg-ghana-gold text-navy-950 font-semibold">Create (approved)</button>
      </div>
    </form>
  );
}

export default function AdminDashboard() {
  const { users, loadUsers, adminApproveUser, adminUpdateUser, adminDeleteUser, adminCreateUser,
    adminResetMfa, setAdminOpen, mocs, user } = useStore();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const pending = users.filter((u) => u.status === 'pending');
  const filtered = users.filter((u) =>
    !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-6" onClick={() => setAdminOpen(false)}>
      <div className="w-[900px] max-w-full max-h-[88vh] glass rounded-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-navy-700">
          <ShieldCheck size={18} className="text-ghana-gold" />
          <span className="font-semibold text-white">Administration · User Accounts</span>
          {pending.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-threat-medium/20 text-threat-medium">
              {pending.length} pending approval
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-2 text-slate-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                className="bg-navy-850 border border-navy-700 rounded pl-7 pr-2 py-1 text-sm text-white w-44" />
            </div>
            <button onClick={() => setAdding((s) => !s)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-ghana-gold text-navy-950 font-semibold">
              <UserPlus size={13} /> Add user
            </button>
            <button onClick={() => setAdminOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          {adding && <AddUserForm mocs={mocs} onCreate={adminCreateUser} onClose={() => setAdding(false)} />}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-navy-700">
                <th className="text-left py-2">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Role</th>
                <th className="text-left">MOC</th>
                <th className="text-left">Status</th>
                <th className="text-left">2FA</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-navy-800 hover:bg-navy-850/50">
                  <td className="py-2 text-white">{u.name}{u.id === user?.id && <span className="text-[10px] text-slate-500"> (you)</span>}</td>
                  <td className="text-slate-300 font-mono text-xs">{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => adminUpdateUser(u.id, { role: e.target.value })}
                      className="bg-navy-850 border border-navy-700 rounded px-1.5 py-1 text-xs text-white">
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="text-slate-400 text-xs font-mono">{mocs.find((m) => m.id === u.mocId)?.code || '—'}</td>
                  <td>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${STATUS_STYLE[u.status] || ''}`}>{u.status}</span>
                  </td>
                  <td>
                    {u.mfaEnabled ? (
                      <span title={(u.mfaDevices || []).map((d) => d.label).join(', ') || 'Biometric enrolled'}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-ghana-green/20 text-ghana-green">
                        <Fingerprint size={11} /> On
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">—</span>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {u.status === 'pending' && (
                      <button onClick={() => adminApproveUser(u.id)} title="Approve"
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-ghana-green/80 hover:bg-ghana-green text-white mr-1">
                        <Check size={12} /> Approve
                      </button>
                    )}
                    {u.status !== 'disabled' ? (
                      <button onClick={() => adminUpdateUser(u.id, { status: 'disabled' })}
                        className="text-[11px] px-2 py-1 rounded bg-navy-700 hover:bg-navy-600 text-slate-200 mr-1">Disable</button>
                    ) : (
                      <button onClick={() => adminUpdateUser(u.id, { status: 'approved' })}
                        className="text-[11px] px-2 py-1 rounded bg-navy-700 hover:bg-navy-600 text-slate-200 mr-1">Enable</button>
                    )}
                    {u.mfaEnabled && (
                      <button onClick={() => { if (confirm(`Reset biometric 2FA for ${u.name}? They will re-enrol on next signup/login.`)) adminResetMfa(u.id); }}
                        title="Reset 2FA (lost/replaced device)"
                        className="text-[11px] px-2 py-1 rounded bg-navy-700 hover:bg-navy-600 text-slate-200 mr-1">
                        Reset 2FA
                      </button>
                    )}
                    <button onClick={() => { if (confirm(`Delete ${u.name}?`)) adminDeleteUser(u.id); }}
                      disabled={u.id === user?.id}
                      className="text-[11px] px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 disabled:opacity-30">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-slate-500 py-8">No users.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
