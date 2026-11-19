import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { db, collection, addDoc, Timestamp, query, onSnapshot, orderBy, where } from '../lib/firebase';
import { UserPlus, Mail, Shield, Clock, CheckCircle2, ChevronLeft, Plus, Trash2, RefreshCcw, Edit2, X, HardHat } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { TRADE_LIST, TradeId, getTrade } from '../lib/trades';

interface Invite {
  id: string;
  email: string;
  role: string;
  trade?: TradeId;
  status: 'pending' | 'accepted';
  orgCode: string;
  createdAt: any;
}

export function InviteTech({ onBack }: { onBack?: () => void }) {
  const { user } = useStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('technician');
  const [trade, setTrade] = useState<TradeId>('mason');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sending, setSending] = useState(false);
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!user?.orgCode) return;

    const q = query(
      collection(db, 'invites'), 
      where('orgCode', '==', user.orgCode),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInvites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invite)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invites');
    });
    return () => unsubscribe();
  }, [user?.orgCode]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const sendEmail = async (email: string, role: string) => {
    if (!user) return;
    const response = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        role,
        orgCode: user.orgCode,
        inviterName: user.displayName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send automated email');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user) return;
    setSending(true);
    try {
      if (editingInvite) {
        await updateDoc(doc(db, 'invites', editingInvite.id), {
          email,
          role,
          trade,
        });
        setEditingInvite(null);
      } else {
        try {
          await addDoc(collection(db, 'invites'), {
            email,
            role,
            trade,
            status: 'pending',
            orgCode: user.orgCode,
            inviterId: user.uid,
            inviterName: user.displayName,
            createdAt: Timestamp.now(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'invites');
          throw error;
        }

        await sendEmail(email, role);
      }

      setEmail('');
      setRole('technician');
      showNotice(`Invitation processed for ${email}.`);
    } catch (error: any) {
      console.error('Error handling invite:', error);
      showNotice(`Invitation saved (${error.message || 'email queued'}).`);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (invite: Invite) => {
    setSending(true);
    try {
      await sendEmail(invite.email, invite.role);
      showNotice(`Retry successful for ${invite.email}`);
    } catch (error: any) {
      showNotice(`Retry failed: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invites', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invites/${id}`);
    }
  };

  const handleEdit = (invite: Invite) => {
    setEditingInvite(invite);
    setEmail(invite.email);
    setRole(invite.role);
    setTrade(invite.trade || 'mason');
  };

  const copyOrgCode = () => {
    if (user?.orgCode) {
      navigator.clipboard.writeText(user.orgCode);
      showNotice('Organization Code copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-xl bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800"
            >
              <ChevronLeft className="h-5 w-5 dark:text-white" />
            </button>
          )}
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Crew Invitations</h1>
        </div>
        {notice && (
          <span className="text-xs font-bold text-emerald-600">{notice}</span>
        )}
      </header>

      <section className="rounded-3xl bg-neutral-900 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Your Organization Code</h2>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 rounded-xl px-4 py-3 font-mono text-xl font-bold tracking-widest uppercase border border-white/10">
              {user?.orgCode}
            </div>
            <button 
              onClick={copyOrgCode}
              className="bg-white text-neutral-900 px-6 py-3 rounded-xl font-bold active:scale-95 transition-all text-sm"
            >
              Copy
            </button>
          </div>
          <p className="mt-4 text-xs text-white/50 leading-relaxed">
            Share this code with your crew. They can enter it manually when onboarding to join <strong>{user?.orgCode}</strong>.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 bg-blue-500/20 rounded-full blur-3xl" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 dark:text-white">
            <UserPlus className="h-5 w-5 text-neutral-900 dark:text-white" />
            {editingInvite ? 'Update Invitation' : 'Invite Trade Crew'}
          </h2>
          {editingInvite && (
            <button 
              onClick={() => {
                setEditingInvite(null);
                setEmail('');
                setRole('technician');
              }}
              className="p-2 text-neutral-400 hover:text-neutral-900"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
              <input
                type="email"
                placeholder="crew@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Role</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white focus:outline-none"
                >
                  <option value="technician">Field Crew / Tech</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="manager">Manager / Foreman</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Trade Specialty</label>
              <div className="relative">
                <HardHat className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value as TradeId)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white focus:outline-none"
                >
                  {TRADE_LIST.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 dark:bg-white py-4 text-sm font-bold text-white dark:text-neutral-900 shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              editingInvite ? <RefreshCcw className="h-4 w-4" /> : <Plus className="h-4 w-4" />
            )}
            {editingInvite ? 'Update & Resend' : 'Send Invitation'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 px-2">Recruitment Pipeline</h2>
        <div className="space-y-2">
          {invites.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 uppercase tracking-widest">No active invites</p>
            </div>
          ) : (
            invites.map(invite => (
              <div key={invite.id} className="group flex items-center justify-between p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm transition-all hover:bg-neutral-50/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${invite.status === 'accepted' ? 'bg-green-50' : 'bg-amber-50'}`}>
                    {invite.status === 'accepted' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">{invite.email}</p>
                    <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
                      {getTrade(invite.trade).label} · {invite.role}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {invite.status === 'pending' && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRetry(invite)}
                        className="p-2 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:scale-95 transition-all"
                        title="Resend Invite"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleEdit(invite)}
                        className="p-2 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:scale-95 transition-all"
                        title="Edit Invite"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all"
                        title="Delete Invite"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                    invite.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {invite.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
