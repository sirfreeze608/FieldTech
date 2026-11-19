import React from 'react';
import { TRADE_LIST, getTrade, inferTradeFromCategory, TradeId } from '../lib/trades';
import { Ticket } from '../hooks/useTickets';
import { UserProfile } from '../hooks/useOrgUsers';
import { TradeIcon } from './TradeIcon';
import { ArrowRight, Calculator, HardHat } from 'lucide-react';

interface TradeOperationsWidgetProps {
  tickets: Ticket[];
  users: UserProfile[];
  onOpenTrades: (tradeId?: TradeId) => void;
}

export function TradeOperationsWidget({ tickets, users, onOpenTrades }: TradeOperationsWidgetProps) {
  const tradeStats = TRADE_LIST.map((trade) => {
    const activeTickets = tickets.filter((t) => {
      const tTrade = t.trade || inferTradeFromCategory(t.category);
      return tTrade === trade.id && t.status !== 'resolved' && t.status !== 'closed';
    }).length;
    const crewCount = users.filter((u) => (u.trade || 'it') === trade.id).length;
    return {
      trade,
      activeTickets,
      crewCount,
    };
  });

  // Sort active trades first, keeping Mason/Carpenter/Framer/HVAC/Electrician/Plumber prominent
  const sortedStats = [...tradeStats].sort((a, b) => {
    const scoreA = a.activeTickets * 10 + a.crewCount;
    const scoreB = b.activeTickets * 10 + b.crewCount;
    return scoreB - scoreA;
  });

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center">
            <HardHat className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Multi-Trade Operations</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Active jobs &amp; certified crew across Mason, Carpentry, Framing, HVAC, Electrical &amp; Plumbing
            </p>
          </div>
        </div>
        <button
          onClick={() => onOpenTrades()}
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 hover:opacity-90 active:scale-95 transition-all"
        >
          <Calculator className="h-3.5 w-3.5" />
          Trade Calculators &amp; Roster
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {sortedStats.map(({ trade, activeTickets, crewCount }) => (
          <button
            key={trade.id}
            onClick={() => onOpenTrades(trade.id)}
            className="group text-left p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-500 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`h-7 w-7 rounded-lg border flex items-center justify-center ${trade.badgeClasses}`}>
                <TradeIcon trade={trade.id} className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono text-[10px] font-semibold text-neutral-400 tabular-nums">
                {trade.shortCode}
              </span>
            </div>
            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{trade.label}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
              <span>{activeTickets} active</span>
              <span aria-hidden="true">·</span>
              <span>{crewCount} crew</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
