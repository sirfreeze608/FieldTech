import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useOrgUsers } from '../hooks/useOrgUsers';
import { useSites } from '../hooks/useSites';
import { db, collection, addDoc, Timestamp } from '../lib/firebase';
import { Plus, UserPlus, FileText, CheckCircle2 } from 'lucide-react';
import { TRADE_LIST, TradeId, getTrade } from '../lib/trades';

export function CreateTaskWidget() {
  const { user } = useStore();
  const { users } = useOrgUsers(user?.orgCode);
  const { sites } = useSites(user?.orgCode);
  
  const [title, setTitle] = useState('');
  const [tradeFilter, setTradeFilter] = useState<'all' | TradeId>('all');
  const [assignedTo, setAssignedTo] = useState('');
  const [siteId, setSiteId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState('');

  if (user?.role === 'technician') return null;

  const techCrew = users.filter((u) => {
    const matchesRole = u.role === 'technician' || u.role === 'dispatcher';
    const matchesTrade = tradeFilter === 'all' || (u.trade || 'it') === tradeFilter;
    return matchesRole && matchesTrade;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !assignedTo) return;

    const targetUser = users.find((u) => u.uid === assignedTo);
    const taskTrade: TradeId = tradeFilter !== 'all' ? tradeFilter : (targetUser?.trade || 'general');

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        title: title.trim(),
        orgCode: user.orgCode,
        status: 'pending',
        trade: taskTrade,
        assignedTo,
        siteId: siteId || null,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
      });
      setTitle('');
      setAssignedTo('');
      setSiteId('');
      setFeedback('Task dispatched!');
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 h-full">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold dark:text-white">Quick Dispatch</h2>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Assign task by trade</p>
          </div>
        </div>
        {feedback && (
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{feedback}</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 block">Trade Filter</label>
          <select
            value={tradeFilter}
            onChange={(e) => {
              setTradeFilter(e.target.value as 'all' | TradeId);
              setAssignedTo('');
            }}
            className="w-full px-4 py-2.5 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none"
          >
            <option value="all">All Trades</option>
            {TRADE_LIST.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 block">Task Description</label>
          <div className="relative">
             <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
             <input
               type="text"
               placeholder="e.g. Inspect RTU belt or pour west footing"
               value={title}
               onChange={e => setTitle(e.target.value)}
               className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none"
               required
             />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 block">Assign To</label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none appearance-none"
                required
              >
                <option value="">Select Crew</option>
                {techCrew.map(u => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({getTrade(u.trade).shortCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
             <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 block">Location (Optional)</label>
             <select
               value={siteId}
               onChange={e => setSiteId(e.target.value)}
               className="w-full px-4 py-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none"
             >
               <option value="">Field / remote</option>
               {sites.map(s => (
                 <option key={s.id} value={s.id}>{s.name}</option>
               ))}
             </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="w-full py-4 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isCreating ? 'Dispatching...' : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Assign Task
            </>
          )}
        </button>
      </form>
    </section>
  );
}
