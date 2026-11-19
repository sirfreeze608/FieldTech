import React from 'react';
import { useStore } from '../store/useStore';
import { logOut, db, doc, updateDoc } from '../lib/firebase';
import { LogOut, Shield, Settings, Award, MapPin, Phone, Mail, UserPlus, Building2, CreditCard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TechBadge } from '../components/TechBadge';
import { TRADE_LIST, TradeId, getTrade } from '../lib/trades';

export function Profile({ onNavigate }: { onNavigate: (page: any) => void }) {
  const { user, setUser } = useStore();
  const [showBadge, setShowBadge] = React.useState(false);

  const userTrade = getTrade(user?.trade);
  const displaySkills = user?.skills && user.skills.length > 0 ? user.skills : userTrade.certifications.slice(0, 3);

  const handleToggleRole = async () => {
    if (!user) return;
    const newRole = user.role === 'technician' ? 'manager' : 'technician';
    await updateDoc(doc(db, 'users', user.uid), { role: newRole });
    setUser({ ...user, role: newRole });
  };

  const handleTradeChange = async (newTrade: TradeId) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { trade: newTrade });
    setUser({ ...user, trade: newTrade });
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="text-center py-8">
        <div className="relative inline-block">
          <div className="h-24 w-24 rounded-3xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-4xl font-bold shadow-2xl">
            {user?.displayName?.[0]}
          </div>
          <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-blue-600 border-4 border-white dark:border-neutral-950 flex items-center justify-center text-white shadow-lg">
            <Award className="h-4 w-4" />
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight dark:text-white">{user?.displayName}</h1>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-bold">
            {userTrade.label} · {user?.role}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5">
              <Building2 className="h-3 w-3 text-neutral-400" />
              <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-tight">Org: {user?.orgCode}</span>
            </div>
            <button 
              onClick={() => setShowBadge(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-3 py-1.5 hover:bg-blue-100 transition-colors"
            >
              <CreditCard className="h-3 w-3" />
              <span className="text-[11px] font-bold uppercase tracking-tight">View Badge</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showBadge && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" 
               onClick={() => setShowBadge(false)} 
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative z-10"
             >
                <TechBadge user={user} />
                <button 
                  onClick={() => setShowBadge(false)}
                  className="mt-6 w-full py-4 rounded-2xl bg-white text-neutral-900 font-bold shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {user?.role === 'manager' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-blue-50 dark:bg-blue-900/20 p-6 shadow-sm border border-blue-100 dark:border-blue-900/30 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">Team</h3>
                <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-widest mt-1">Manage Crew</p>
              </div>
              <button 
                onClick={() => onNavigate('invite')}
                className="mt-4 flex items-center justify-center h-10 w-full rounded-xl bg-blue-600 text-white shadow-lg active:scale-95 text-xs font-bold"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Crew
              </button>
            </div>

            <div className="rounded-3xl bg-neutral-900 dark:bg-white p-6 shadow-sm border border-neutral-800 dark:border-neutral-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white dark:text-neutral-900">Suite</h3>
                <p className="text-[10px] text-white/40 dark:text-neutral-400 font-bold uppercase tracking-widest mt-1">Enterprise Settings</p>
              </div>
              <button 
                onClick={() => onNavigate('enterprise')}
                className="mt-4 flex items-center justify-center h-10 w-full rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-lg active:scale-95 text-xs font-bold"
              >
                <Shield className="h-4 w-4 mr-2" />
                Configure
              </button>
            </div>
          </div>
        )}

        <div className="rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Primary Trade</h2>
            <select
              value={user?.trade || 'it'}
              onChange={(e) => handleTradeChange(e.target.value as TradeId)}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-xs font-bold dark:text-white"
            >
              {TRADE_LIST.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{userTrade.description}</p>
        </div>
        
        <div className="rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Contact Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-600 dark:text-neutral-300">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-600 dark:text-neutral-300">{user?.phone || '+1 (555) 012-3456'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-600 dark:text-neutral-300">{user?.address || 'Set your base location'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Skills &amp; Certifications</h2>
            <button onClick={() => onNavigate('settings')} className="text-xs font-bold text-blue-600 hover:underline">
              Edit
            </button>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {displaySkills.join(' · ')}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 p-2 shadow-sm border border-neutral-100 dark:border-neutral-800">
          <button 
            onClick={handleToggleRole}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Shield className="h-5 w-5 text-neutral-400" />
            Switch to {user?.role === 'technician' ? 'Manager' : 'Technician'} View
          </button>
          <button 
            onClick={() => onNavigate('settings')}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Settings className="h-5 w-5 text-neutral-400" />
            Account Settings
          </button>
          <button 
            onClick={logOut}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-5 w-5 text-red-400" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
