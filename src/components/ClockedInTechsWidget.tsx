import React, { useState, useEffect } from 'react';
import { useAllTimeEntries } from '../hooks/useAllTimeEntries';
import { useOrgUsers } from '../hooks/useOrgUsers';
import { useTickets } from '../hooks/useTickets';
import { Clock, Briefcase, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTrade } from '../lib/trades';

interface ClockedInTechsWidgetProps {
  orgCode: string;
}

export function ClockedInTechsWidget({ orgCode }: ClockedInTechsWidgetProps) {
  const { entries, loading: entriesLoading } = useAllTimeEntries(orgCode);
  const { users, loading: usersLoading } = useOrgUsers(orgCode);
  const { tickets, loading: ticketsLoading } = useTickets(undefined, orgCode);

  const [, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeSessions = entries.filter(e => !e.clockOut);
  const loading = entriesLoading || usersLoading || ticketsLoading;

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 animate-pulse">
        <div className="h-6 w-1/2 bg-neutral-100 dark:bg-neutral-800 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 w-full bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 flex flex-col h-full transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-bold dark:text-white">Active Crew</h2>
        </div>
        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-lg uppercase tracking-widest tabular-nums">
          {activeSessions.length} Online
        </span>
      </div>

      <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {activeSessions.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 dark:text-neutral-600">
            <p className="text-sm font-medium">No crew members currently clocked in.</p>
          </div>
        ) : (
          activeSessions.map((session) => {
            const sessionUid = (session as any).userId || session.uid;
            const tech = users.find(u => u.uid === sessionUid);
            const techTrade = getTrade(tech?.trade);
            const techTickets = tickets.filter(t => t.assignedTo === sessionUid && t.status !== 'resolved' && t.status !== 'closed');
            
            return (
              <div 
                key={session.id} 
                className="group p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-xl bg-white dark:bg-neutral-900 shadow-sm flex items-center justify-center text-sm font-bold text-neutral-600 dark:text-neutral-400">
                        {tech?.displayName?.[0] || '?'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{tech?.displayName || 'Unknown Crew'}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        <span className="text-neutral-600 dark:text-neutral-300">{techTrade.label}</span>
                        <span aria-hidden="true">·</span>
                        <Clock className="h-3 w-3" />
                        <span className="tabular-nums">{formatDistanceToNow(session.clockIn.toDate())}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end tabular-nums">
                      <Briefcase className="h-3 w-3 text-blue-500" />
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{techTickets.length} active</span>
                    </div>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Work Orders</p>
                  </div>
                </div>

                {techTickets.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                    {techTickets.slice(0, 2).map(ticket => (
                      <div key={ticket.id} className="flex items-center justify-between text-[10px] bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-50 dark:border-neutral-800">
                        <div className="flex items-center gap-2 truncate">
                          <div className={`h-1.5 w-1.5 rounded-full ${
                            ticket.priority === 'critical' ? 'bg-red-500' :
                            ticket.priority === 'high' ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`} />
                          <span className="font-medium text-neutral-600 dark:text-neutral-400 truncate">{ticket.title}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded uppercase font-black text-[8px] ${
                          ticket.status === 'in-progress' ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    ))}
                    {techTickets.length > 2 && (
                      <button className="w-full text-center text-[10px] font-bold text-neutral-400 hover:text-neutral-600 transition-colors">
                        + {techTickets.length - 2} more assignments
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
