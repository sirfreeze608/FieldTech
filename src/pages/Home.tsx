import React from 'react';
import { useStore } from '../store/useStore';
import { useTickets } from '../hooks/useTickets';
import { useOrgUsers } from '../hooks/useOrgUsers';
import { useClock } from '../hooks/useClock';
import { AlertCircle, CheckCircle2, Clock as ClockIcon, ListTodo, Power, QrCode, Timer, Wrench } from 'lucide-react';
import { TechDashboardWidgets } from '../components/TechDashboardWidgets';
import { WeatherWidget } from '../components/WeatherWidget';
import { UserTaskWidget } from '../components/UserTaskWidget';
import { CreateTaskWidget } from '../components/CreateTaskWidget';
import { TicketAnalytics } from '../components/TicketAnalytics';
import { PulseOverview } from '../components/PulseOverview';
import { ClockedInTechsWidget } from '../components/ClockedInTechsWidget';
import { DownDetectorWidget } from '../components/DownDetectorWidget';
import { TradeOperationsWidget } from '../components/TradeOperationsWidget';
import { getTrade, inferTradeFromCategory, TradeId } from '../lib/trades';

interface HomeProps {
  onOpenTrades?: (tradeId?: TradeId) => void;
  onNavigate?: (page: string) => void;
  onOpenScanner?: () => void;
}

export function Home({ onOpenTrades, onNavigate, onOpenScanner }: HomeProps) {
  const { user, dispatcherMode } = useStore();
  const { tickets, loading: ticketsLoading } = useTickets(user?.role === 'technician' ? user?.uid : undefined, user?.orgCode);
  const { tickets: orgTickets } = useTickets(undefined, user?.orgCode);
  const { users: orgUsers } = useOrgUsers(user?.orgCode);
  const { activeEntry, clockIn, clockOut, loading: clockLoading } = useClock();

  const isDispatcherView = user?.role === 'dispatcher' || (user?.role === 'manager' && dispatcherMode);
  const isTechnician = user?.role === 'technician';
  const userTrade = getTrade(user?.trade || 'it');

  const stats = [
    { label: 'Assigned', value: tickets.length, icon: ListTodo, color: 'text-blue-500' },
    { label: 'In Progress', value: tickets.filter(t => t.status === 'in-progress').length, icon: ClockIcon, color: 'text-amber-500' },
    { label: 'Resolved', value: tickets.filter(t => t.status === 'resolved').length, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Critical', value: tickets.filter(t => t.priority === 'critical').length, icon: AlertCircle, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Welcome back, {user?.displayName} <span aria-hidden="true">·</span> {userTrade.label}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('assets')}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap"
            >
              <Wrench className="h-3.5 w-3.5" />
              Equipment
            </button>
          )}
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2.5 text-xs font-bold text-white dark:text-neutral-900 shadow-lg active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <QrCode className="h-4 w-4" />
              Scan QR
            </button>
          )}
          <div className="flex flex-col items-end">
            <div className="h-10 w-10 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center font-bold text-white dark:text-neutral-900 shadow-lg">
              {user?.displayName?.[0]}
            </div>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">{user?.orgCode}</span>
          </div>
        </div>
      </header>

      {/* Clock In/Out Widget */}
      <section className={`rounded-3xl p-6 shadow-xl transition-all duration-500 border ${
        activeEntry ? 'bg-green-600 border-green-500' : 'bg-neutral-900 border-neutral-800'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${activeEntry ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Shift Status</h2>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                {activeEntry ? 'Currently On Clock' : 'Off Duty'}
              </p>
            </div>
          </div>
          {activeEntry && (
            <div className="text-right">
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Started At</p>
              <p className="text-white font-bold text-xs tabular-nums">{activeEntry.clockIn.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
        </div>
        <button
          onClick={activeEntry ? clockOut : clockIn}
          disabled={clockLoading}
          className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98] ${
            activeEntry 
              ? 'bg-white text-green-600 shadow-lg shadow-green-900/20' 
              : 'bg-white text-neutral-900 shadow-lg shadow-black/20'
          }`}
        >
          <Power className="h-5 w-5" />
          {activeEntry ? 'Clock Out' : 'Clock In Now'}
        </button>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white dark:bg-neutral-900 p-4 shadow-sm border border-neutral-100 dark:border-neutral-800 transition-all hover:shadow-md md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{stat.label}</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold tabular-nums text-neutral-900 dark:text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Multi-Trade Overview Strip */}
      <TradeOperationsWidget
        tickets={orgTickets}
        users={orgUsers}
        onOpenTrades={(tradeId) => onOpenTrades?.(tradeId)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Main Analytics & Widgets */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           <div className="w-full">
             <TicketAnalytics />
           </div>
           
            <div className={`grid grid-cols-1 gap-6 ${isDispatcherView ? 'lg:grid-cols-12' : 'md:grid-cols-2'}`}>
              <div className={isDispatcherView ? 'lg:col-span-4' : ''}>
                {isTechnician ? (
                  <UserTaskWidget />
                ) : (
                  <CreateTaskWidget />
                )}
              </div>
              {isDispatcherView && (
                <div className="lg:col-span-4">
                  <ClockedInTechsWidget orgCode={user?.orgCode || ''} />
                </div>
              )}
              {isDispatcherView && (
                <div className="lg:col-span-4">
                  <TechDashboardWidgets />
                </div>
              )}
            </div>
        </div>

        {/* Right Column - Secondary Widgets */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="w-full">
             <DownDetectorWidget />
           </div>
           <div className="w-full">
             <WeatherWidget />
           </div>
           <div className="w-full flex-1 min-h-[400px]">
             <PulseOverview />
           </div>
        </div>
      </div>

      {/* Bottom Grid - Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold dark:text-white">Active Work Orders</h2>
            <button
              onClick={() => onNavigate?.('tickets')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>
          {ticketsLoading ? (
            <div className="flex justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-8 text-center text-neutral-400">
              <p className="text-sm">No active tasks assigned.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.slice(0, 5).map((ticket) => {
                const tTrade = getTrade(ticket.trade || inferTradeFromCategory(ticket.category));
                return (
                  <div
                    key={ticket.id}
                    onClick={() => onNavigate?.('tickets')}
                    className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 p-4 border border-neutral-100 dark:border-neutral-800 transition-all hover:border-neutral-900 dark:hover:border-white group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5 text-xs text-neutral-500">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold uppercase tracking-wider text-[10px] ${
                          ticket.priority === 'critical' ? 'text-red-600' :
                          ticket.priority === 'high' ? 'text-orange-600' :
                          'text-blue-600'
                        }`}>
                          {ticket.priority}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{tTrade.label}</span>
                      </div>
                      <span className="text-[10px] font-medium text-neutral-400 tabular-nums">
                        {ticket.createdAt?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">{ticket.title}</h3>
                    <p className="mt-1 text-xs text-neutral-500 line-clamp-1">{ticket.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-neutral-900 dark:bg-white rounded-3xl p-8 text-white dark:text-neutral-900 overflow-hidden relative min-h-[300px] flex flex-col justify-center">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Trade Tools &amp; Takeoffs</h3>
                <span className="text-[10px] font-bold text-white/60 dark:text-neutral-500 uppercase tracking-widest">Field Calculators</span>
              </div>
              <p className="text-sm text-white/70 dark:text-neutral-600 leading-relaxed max-w-sm">
                Estimate masonry brick &amp; mortar, framing studs &amp; rafters, HVAC tonnage, NEC wire gauges, and plumbing pipe slope right from the job site.
              </p>
              <button
                onClick={() => onOpenTrades?.(user?.trade)}
                className="mt-6 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-6 py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-xl"
              >
                Open Trade Calculators
              </button>
            </div>
            <div className="absolute -right-8 -top-8 h-48 w-48 bg-blue-500/20 rounded-full blur-[100px]" />
            <div className="absolute -left-8 -bottom-8 h-48 w-48 bg-amber-500/20 rounded-full blur-[100px]" />
        </section>
      </div>
    </div>
  );
}
