import React from 'react';
import { useStore } from '../store/useStore';
import { useTasks, Task } from '../hooks/useTasks';
import { useSites } from '../hooks/useSites';
import { db, doc, updateDoc } from '../lib/firebase';
import { getTrade } from '../lib/trades';
import { CheckCircle2, Circle, ListChecks, MapPin, Ticket as TicketIcon, Wrench } from 'lucide-react';

export function UserTaskWidget() {
  const { user } = useStore();
  const { tasks, loading } = useTasks(undefined, user?.orgCode, user?.role === 'technician' ? user.uid : undefined);
  const { sites } = useSites(user?.orgCode);

  const toggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const myTasks = tasks.filter(t => t.assignedTo === user?.uid);
  const pendingTasks = myTasks.filter(t => t.status === 'pending');

  if (user?.role !== 'technician') return null;

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">My Active Tasks</h2>
        </div>
        <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest tabular-nums">
          {pendingTasks.length} Pending
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-100" /></div>
        ) : pendingTasks.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">All caught up!</p>
          </div>
        ) : (
          pendingTasks.map(task => {
            const tradeMeta = getTrade(task.trade || user?.trade);
            return (
              <div key={task.id} className="group p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-all">
                <div className="flex items-start gap-3">
                  <button 
                    onClick={() => toggleTask(task)}
                    className="mt-1 flex-shrink-0 text-neutral-300 dark:text-neutral-600 hover:text-green-500 transition-colors"
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{task.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-3 items-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                        <Wrench className="h-3 w-3" />
                        <span>{tradeMeta.label}</span>
                      </div>
                      {task.siteId && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{sites.find(s => s.id === task.siteId)?.name || 'At Site'}</span>
                        </div>
                      )}
                      {task.ticketId && (
                        <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                          <TicketIcon className="h-3 w-3" />
                          <span>Attached to Work Order</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
