import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { db, doc, updateDoc, collection, query, where, getDocs } from '../lib/firebase';
import { Building2, Plus, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { TRADE_LIST, TradeId } from '../lib/trades';

export function OrgOnboarding() {
  const { user, setUser } = useStore();
  const [mode, setMode] = useState<'selection' | 'join' | 'create' | 'signin'>('selection');
  const [orgCodeInput, setOrgCodeInput] = useState('');
  const [trade, setTrade] = useState<TradeId>('mason');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgCodeInput.trim() || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      const code = orgCodeInput.trim().toUpperCase();
      
      const q = query(
        collection(db, 'users'),
        where('email', '==', user.email),
        where('orgCode', '==', code)
      );
      
      const snapshot = await getDocs(q);
      let inviteTrade: TradeId | undefined;
      
      if (snapshot.empty) {
        const inviteQ = query(
          collection(db, 'invites'),
          where('email', '==', user.email),
          where('orgCode', '==', code)
        );
        const inviteSnapshot = await getDocs(inviteQ);
        
        if (inviteSnapshot.empty) {
          throw new Error('No record of your email in this organization.');
        }
        inviteTrade = inviteSnapshot.docs[0].data().trade as TradeId | undefined;
      }

      const existingData = !snapshot.empty ? snapshot.docs[0].data() : null;
      const resolvedTrade = existingData?.trade || inviteTrade || trade;

      await updateDoc(doc(db, 'users', user.uid), {
        orgCode: code,
        role: existingData?.role || 'technician',
        trade: resolvedTrade,
        email: user.email,
        displayName: user.displayName,
        lastActive: new Date().toISOString()
      });
      setUser({ ...user, orgCode: code, role: existingData?.role || 'technician', trade: resolvedTrade });
    } catch (err: any) {
      setError(err.message || 'Could not restore session. Check organization code.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgCodeInput.trim() || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      const code = orgCodeInput.trim().toUpperCase();
      await updateDoc(doc(db, 'users', user.uid), {
        orgCode: code,
        role: 'technician',
        trade,
      });
      setUser({ ...user, orgCode: code, role: 'technician', trade });
    } catch (err) {
      setError('Failed to join organization. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgCodeInput.trim() || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      const code = orgCodeInput.trim().toUpperCase();
      await updateDoc(doc(db, 'users', user.uid), {
        orgCode: code,
        role: 'manager',
        trade,
      });
      setUser({ ...user, orgCode: code, role: 'manager', trade });
    } catch (err) {
      setError('Failed to create organization. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-neutral-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-xl">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900">Welcome to Field Tech</h1>
          <p className="mt-2 text-neutral-500">Multi-trade field dispatch &amp; crew operations</p>
        </div>

        {mode === 'selection' && (
          <div className="grid gap-4 pt-4">
            <button
              onClick={() => setMode('join')}
              className="group flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-neutral-100 hover:border-neutral-900 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-neutral-900">Join Organization</h3>
                  <p className="text-xs text-neutral-500">I have an invite code from my manager</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
            </button>

            <button
              onClick={() => setMode('create')}
              className="group flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-neutral-100 hover:border-neutral-900 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-neutral-900">Start New Org</h3>
                  <p className="text-xs text-neutral-500">Set up a multi-trade crew or company</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-100" /></div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                <span className="bg-neutral-50 px-4">Returning User?</span>
              </div>
            </div>

            <button
              onClick={() => setMode('signin')}
              className="w-full py-4 rounded-2xl bg-white text-neutral-900 font-bold shadow-sm border border-neutral-100 hover:bg-neutral-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Sign In to My Org
            </button>
          </div>
        )}

        {(mode === 'join' || mode === 'create' || mode === 'signin') && (
          <form onSubmit={mode === 'join' ? handleJoin : mode === 'create' ? handleCreate : handleSignIn} className="space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-xl border border-neutral-100 space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2 block">
                  {mode === 'join' ? 'Organization Code' : mode === 'create' ? 'Create Organization Code' : 'Search Organization'}
                </label>
                <input
                  autoFocus
                  required
                  placeholder={mode === 'join' ? "Enter invite code" : mode === 'create' ? "e.g. APEX-TRADES" : "Organization Code"}
                  value={orgCodeInput}
                  onChange={e => setOrgCodeInput(e.target.value)}
                  className="w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-4 text-center text-2xl font-bold tracking-widest placeholder:text-neutral-300 focus:border-neutral-900 focus:ring-0 uppercase transition-all"
                />
              </div>

              {(mode === 'join' || mode === 'create') && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2 block">
                    Your Primary Trade
                  </label>
                  <select
                    value={trade}
                    onChange={(e) => setTrade(e.target.value as TradeId)}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-900"
                  >
                    {TRADE_LIST.map((t) => (
                      <option key={t.id} value={t.id}>{t.label} — {t.description}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && <p className="text-xs font-medium text-red-500 text-center">{error}</p>}
              
              <button
                type="submit"
                disabled={isSubmitting || !orgCodeInput.trim()}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-neutral-900 px-6 py-4 font-bold text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Continue'}
              </button>
              
              <button
                type="button"
                onClick={() => setMode('selection')}
                className="w-full text-center text-xs font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-900 transition-colors"
              >
                Back
              </button>
            </div>
            <p className="text-center text-xs text-neutral-400">
              {mode === 'join' 
                ? "Organization codes are case-sensitive."
                : "Choose a unique identifier for your team (e.g. COMPANY-CITY)."}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
