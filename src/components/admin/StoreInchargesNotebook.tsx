import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { StoreInchargeAccount } from '../../types';

export const StoreInchargesNotebook: React.FC = () => {
  const {
    storeIncharges,
    createStoreIncharge,
    updateStoreIncharge,
    deleteStoreIncharge,
    stores,
    adminUser,
  } = useStore();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedStoreId, setAssignedStoreId] = useState(stores[0]?.id || '');
  const [notes, setNotes] = useState('');

  // UI state
  const [isCreatingOpen, setIsCreatingOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = 'Incharge@';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast('⚠️ Please enter employee name, email, and password.');
      return;
    }

    const assignedStore = stores.find((s) => s.id === assignedStoreId) || stores[0];

    createStoreIncharge({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      phone: phone.trim() || '+91 98450 00000',
      assignedStoreId: assignedStore.id,
      assignedStoreName: `${assignedStore.name} (${assignedStore.neighborhood})`,
      role: 'Store Incharge',
      status: 'active',
      notes: notes.trim() || 'Store incharge for daily retail butchery, price modifications, and FOOS control.',
      createdByAdminName: adminUser?.name || 'Corporate Admin',
    });

    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setNotes('');
    setIsCreatingOpen(false);
    showToast(`✓ Store Incharge profile created for ${name.trim()} and saved to Admin notebook!`);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyCredentials = (incharge: StoreInchargeAccount) => {
    const text = `Fish Meat Store - Store Incharge Login Credentials\nEmployee: ${incharge.name}\nStore: ${incharge.assignedStoreName}\nEmail: ${incharge.email}\nPassword: ${incharge.password}\nPortal: http://localhost:3000 (Click Control Room > Staff Login)`;
    navigator.clipboard?.writeText(text);
    setCopiedKey(incharge.id);
    setTimeout(() => setCopiedKey(null), 2500);
    showToast(`✓ Full credentials copied for ${incharge.name}! Ready to send.`);
  };

  const handleSaveNotes = (id: string) => {
    updateStoreIncharge(id, { notes: tempNotes });
    setEditingNotesId(null);
    showToast('✓ Notebook memo updated successfully.');
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-3 right-3 sm:left-auto sm:top-20 sm:right-6 sm:max-w-sm z-50 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-800 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-bold text-sm sm:text-base text-stone-900">
                  Store Incharge Profiles & Admin Credentials Notebook
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  CONFIDENTIAL ADMIN NOTEBOOK
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Create login profiles for store employees. All employee passwords and shift notes are recorded in this notebook and mirrored on the staff login screen so you never lose them.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingOpen(!isCreatingOpen)}
          className="w-full md:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isCreatingOpen ? 'Close Incharge Creator' : '+ Create Store Incharge Profile'}</span>
        </button>
      </div>

      {/* Incharge Creator Drawer / Form */}
      {isCreatingOpen && (
        <div className="bg-white border-2 border-emerald-400/70 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
              <h4 className="font-bold text-sm text-stone-900">New Store Incharge Setup</h4>
            </div>
            <span className="text-[11px] text-stone-500">
              Assigned permissions: Live Stock Edit, Price Adjustment, Force OOS (FOOS), Order Monitoring
            </span>
          </div>

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Employee Full Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Gowda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Assigned Store Hub <span className="text-emerald-600">*</span>
              </label>
              <select
                value={assignedStoreId}
                onChange={(e) => setAssignedStoreId(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white cursor-pointer"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.neighborhood})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Store Incharge Email / Login ID <span className="text-emerald-600">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh.indiranagar@fishmeatstore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Password <span className="text-emerald-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-generate</span>
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. Incharge@8492"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Employee Phone / WhatsApp (Optional)
              </label>
              <input
                type="tel"
                placeholder="+91 98450 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Admin Notes & Shift Reminders (Kept with account)
              </label>
              <input
                type="text"
                placeholder="e.g. Morning Shift Lead, Chiller Key #2, Handles Mutton procurement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="md:col-span-2 pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingOpen(false)}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl text-xs text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-colors cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile to Notebook</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Corporate Admin Credentials Directory */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Permanent Corporate Admin Profile
            </h4>
          </div>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
            ROOT ACCESS · SOC2
          </span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-xl border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-stone-900 font-bold">Default System Admin</strong>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded border border-emerald-200 font-semibold">
                Corporate Headquarters
              </span>
            </div>
            <div className="font-mono text-[11px] text-stone-700 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="break-all">Login Email: <strong className="text-stone-950">admin@fishmeatstore.com</strong></span>
              <span>Password: <strong className="text-emerald-700">AdminPassword@123</strong></span>
            </div>
            <p className="text-[10px] text-stone-500">
              Authority: Unrestricted Control Room access, creation of Store Incharge profiles, audit logs, and master pricing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText('admin@fishmeatstore.com | AdminPassword@123');
                setCopiedKey('root_admin');
                setTimeout(() => setCopiedKey(null), 2000);
              }}
              className="w-full md:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'root_admin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'root_admin' ? 'Copied' : 'Copy Admin Login'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Store Incharges Directory / Notebook List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-900 uppercase tracking-wider">
            <Users className="w-4 h-4 text-purple-700 shrink-0" />
            <span>Store Incharge Notebook Directory ({storeIncharges.length} Active Employees)</span>
          </div>
          <span className="text-[11px] text-stone-500">
            Click &quot;Copy Full Login&quot; to forward credentials directly to employees
          </span>
        </div>

        {storeIncharges.map((incharge) => {
          const isPassVisible = visiblePasswords[incharge.id];
          const isEditingNotes = editingNotesId === incharge.id;

          return (
            <div
              key={incharge.id}
              className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 hover:border-purple-300 transition-all shadow-2xs space-y-3.5"
            >
              {/* Top Row: Name, Store, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-stone-900">{incharge.name}</span>
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Store Incharge
                  </span>
                  <span className="text-xs text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-700" />
                    <span>{incharge.assignedStoreName}</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">ID: {incharge.id}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateStoreIncharge(incharge.id, {
                        status: incharge.status === 'active' ? 'suspended' : 'active',
                      })
                    }
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                      incharge.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {incharge.status === 'active' ? 'Active Incharge' : 'Suspended'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove login profile for ${incharge.name}?`)) {
                        deleteStoreIncharge(incharge.id);
                        showToast(`Removed incharge profile for ${incharge.name}`);
                      }
                    }}
                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Delete Incharge Profile"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Middle Row: Credentials & Admin Notes Notebook */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                {/* Credentials Box */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                  <div className="text-[11px] font-semibold text-stone-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Employee Login Credentials</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(incharge.id)}
                      className="text-purple-700 hover:text-purple-950 flex items-center gap-1 cursor-pointer text-[10px] font-semibold"
                    >
                      {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{isPassVisible ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </div>

                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200">
                      <span className="text-stone-500 shrink-0">Email:</span>
                      <strong className="text-stone-900 select-all break-all text-right">{incharge.email}</strong>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200">
                      <span className="text-stone-500 shrink-0">Password:</span>
                      <strong className="text-amber-700 select-all break-all text-right">
                        {isPassVisible ? incharge.password : '••••••••••••'}
                      </strong>
                    </div>

                    {incharge.phone && (
                      <div className="flex items-center justify-between text-stone-600 text-[10px] pt-0.5">
                        <span>Phone / WhatsApp:</span>
                        <span className="font-semibold">{incharge.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Internal Memo / Notebook Box */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-purple-700" />
                        <span>Admin Private Notes & Shift Reminders</span>
                      </span>
                      {!isEditingNotes && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotesId(incharge.id);
                            setTempNotes(incharge.notes || '');
                          }}
                          className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer text-[10px] font-semibold"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Memo</span>
                        </button>
                      )}
                    </div>

                    {isEditingNotes ? (
                      <div className="mt-1.5 space-y-2">
                        <textarea
                          rows={2}
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          placeholder="Add shift details, keys, responsibilities..."
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="px-2 py-1 text-[10px] text-stone-600 hover:text-stone-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(incharge.id)}
                            className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold cursor-pointer"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-stone-700 italic leading-relaxed">
                        &quot;{incharge.notes || 'No specific admin notes recorded for this employee.'}&quot;
                      </p>
                    )}
                  </div>

                  <div className="text-[10px] text-stone-500 pt-1 border-t border-stone-200">
                    Created by: {incharge.createdByAdminName} · {incharge.createdAt}
                  </div>
                </div>
              </div>

              {/* Bottom Action Row */}
              <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <span className="text-[11px] text-stone-500">
                  Authority: Live inventory count override, price adjustment per kg, FOOS kill-switch, dispatch orders.
                </span>

                <button
                  type="button"
                  onClick={() => handleCopyCredentials(incharge)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-semibold shadow-2xs shrink-0"
                >
                  {copiedKey === incharge.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copy Full Login & Dispatch Instructions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
