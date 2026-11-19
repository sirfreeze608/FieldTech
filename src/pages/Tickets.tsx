import React, { useState } from 'react';
import { useTickets, Ticket } from '../hooks/useTickets';
import { useSites } from '../hooks/useSites';
import { useAssets } from '../hooks/useAssets';
import { Plus, Search, ChevronRight, MapPin, ShieldAlert, QrCode, Wrench } from 'lucide-react';
import { db, collection, addDoc, Timestamp } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { TicketDetails } from '../components/TicketDetails';
import { TRADE_LIST, TRADES, TradeId, getTrade, inferTradeFromCategory } from '../lib/trades';
import { TradeIcon } from '../components/TradeIcon';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

interface TicketsProps {
  onOpenScanner?: () => void;
}

export function Tickets({ onOpenScanner }: TicketsProps) {
  const { user } = useStore();
  const { tickets, loading } = useTickets(undefined, user?.orgCode);
  const { sites } = useSites(user?.orgCode);
  const { assets } = useAssets(user?.orgCode);
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState<'all' | TradeId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Ticket['status']>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const defaultTrade: TradeId = user?.trade || 'mason';
  const [newTicket, setNewTicket] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    siteId: string;
    assetId: string;
    trade: TradeId;
    category: string;
    permitRequired: boolean;
    autoChecklist: boolean;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    siteId: '',
    assetId: '',
    trade: defaultTrade,
    category: TRADES[defaultTrade].categories[0],
    permitRequired: false,
    autoChecklist: true,
  });

  const isAdmin = user?.role === 'manager' || user?.role === 'dispatcher';

  const filteredTickets = tickets.filter((t) => {
    const resolvedTrade = t.trade || inferTradeFromCategory(t.category);
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesTrade = tradeFilter === 'all' || resolvedTrade === tradeFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesTrade && matchesStatus;
  });

  const handleTradeSelectChange = (tradeId: TradeId) => {
    const tradeDef = TRADES[tradeId];
    setNewTicket((prev) => ({
      ...prev,
      trade: tradeId,
      category: tradeDef.categories[0],
      permitRequired: Boolean(tradeDef.defaultPermit),
    }));
  };

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const ticketRef = await addDoc(collection(db, 'tickets'), {
        title: newTicket.title.trim(),
        description: newTicket.description.trim(),
        priority: newTicket.priority,
        siteId: newTicket.siteId,
        ...(newTicket.assetId ? { assetId: newTicket.assetId } : {}),
        orgCode: user.orgCode,
        status: 'open',
        trade: newTicket.trade,
        category: newTicket.category,
        permitRequired: newTicket.permitRequired,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      if (newTicket.autoChecklist && isAdmin) {
        const tradeDef = TRADES[newTicket.trade];
        for (const step of tradeDef.checklistTemplates) {
          await addDoc(collection(db, 'tasks'), {
            title: step,
            orgCode: user.orgCode,
            status: 'pending',
            trade: newTicket.trade,
            assignedTo: user.uid,
            ticketId: ticketRef.id,
            siteId: newTicket.siteId,
            createdBy: user.uid,
            createdAt: Timestamp.now(),
          });
        }
      }

      setIsAdding(false);
      setNewTicket({
        title: '',
        description: '',
        priority: 'medium',
        siteId: '',
        assetId: '',
        trade: defaultTrade,
        category: TRADES[defaultTrade].categories[0],
        permitRequired: false,
        autoChecklist: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tickets');
    }
  };

  const activeTradeDef = TRADES[newTicket.trade];

  return (
    <div className="space-y-5 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Work Orders</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Filter and dispatch across all skilled trades
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-xs font-bold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <QrCode className="h-4 w-4" />
              Scan QR
            </button>
          )}
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2.5 text-xs font-bold text-white dark:text-neutral-900 shadow-lg active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Work Order
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search work orders, scope, or trade category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-10 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl self-start sm:self-auto">
          {(['all', 'open', 'in-progress', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {status === 'in-progress' ? 'Active' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTradeFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition-colors ${
            tradeFilter === 'all'
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
          }`}
        >
          All Trades ({tickets.length})
        </button>
        {TRADE_LIST.map((t) => {
          const count = tickets.filter((tk) => (tk.trade || inferTradeFromCategory(tk.category)) === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTradeFilter(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition-colors ${
                tradeFilter === t.id
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
              }`}
            >
              <TradeIcon trade={t.id} className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              <span className="font-mono text-[10px] opacity-60 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">New Work Order</h2>
            <form onSubmit={handleAddTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Trade</label>
                  <select
                    value={newTicket.trade}
                    onChange={(e) => handleTradeSelectChange(e.target.value as TradeId)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    {TRADE_LIST.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Work Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    {activeTradeDef.categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Title</label>
                <input
                  required
                  placeholder={`e.g. ${activeTradeDef.label} — ${activeTradeDef.categories[0]}`}
                  value={newTicket.title}
                  onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2.5 text-sm dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Scope of Work</label>
                <textarea
                  required
                  value={newTicket.description}
                  onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2.5 text-sm dark:text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Site</label>
                  <select
                    required
                    value={newTicket.siteId}
                    onChange={e => setNewTicket({ ...newTicket, siteId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    <option value="">Select Site</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {assets.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Equipment Asset (Optional)</label>
                  <select
                    value={newTicket.assetId}
                    onChange={(e) => {
                      const chosen = assets.find((a) => a.id === e.target.value);
                      setNewTicket((prev) => ({
                        ...prev,
                        assetId: e.target.value,
                        siteId: chosen?.siteId || prev.siteId,
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    <option value="">None / General Site Work</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} {asset.assetTag ? `(${asset.assetTag})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTicket.permitRequired}
                    onChange={(e) => setNewTicket({ ...newTicket, permitRequired: e.target.checked })}
                    className="rounded border-neutral-300"
                  />
                  Safety Permit Required {activeTradeDef.defaultPermit ? `(${activeTradeDef.defaultPermit})` : ''}
                </label>

                {isAdmin && (
                  <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTicket.autoChecklist}
                      onChange={(e) => setNewTicket({ ...newTicket, autoChecklist: e.target.checked })}
                      className="rounded border-neutral-300"
                    />
                    Auto-attach {activeTradeDef.label} inspection checklist ({activeTradeDef.checklistTemplates.length} steps)
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 py-3 text-sm font-bold text-neutral-600 dark:text-neutral-300 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-neutral-900 dark:bg-white py-3 text-sm font-bold text-white dark:text-neutral-900 active:scale-95"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-12 text-center">
            <p className="text-sm text-neutral-500">No work orders match your filter.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const ticketTrade = getTrade(ticket.trade || inferTradeFromCategory(ticket.category));
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="group relative rounded-2xl bg-white dark:bg-neutral-900 p-4 shadow-sm border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-neutral-800 dark:text-neutral-200">
                      <TradeIcon trade={ticketTrade.id} className="h-3.5 w-3.5" />
                      {ticketTrade.label}
                    </span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="text-neutral-500 dark:text-neutral-400">{ticket.category}</span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className={`font-bold uppercase tracking-wider text-[10px] ${
                      ticket.priority === 'critical' ? 'text-red-600' :
                      ticket.priority === 'high' ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className={`font-semibold capitalize ${
                      ticket.status === 'resolved' ? 'text-green-600' :
                      ticket.status === 'in-progress' ? 'text-amber-600' :
                      'text-neutral-500'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-300 shrink-0" />
                </div>

                <h3 className="font-bold text-neutral-900 dark:text-white">{ticket.title}</h3>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-neutral-400 tabular-nums">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{sites.find(s => s.id === ticket.siteId)?.name || ticket.siteId}</span>
                  </div>
                  <span aria-hidden="true">·</span>
                  <span>{ticket.createdAt?.toDate().toLocaleDateString()}</span>
                  {ticket.permitRequired && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <ShieldAlert className="h-3 w-3" /> Permit Required
                      </span>
                    </>
                  )}
                  {ticket.materials && ticket.materials.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{ticket.materials.length} material item(s)</span>
                    </>
                  )}
                  {ticket.assetId && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300 font-semibold">
                        <Wrench className="h-3 w-3" />
                        {assets.find((a) => a.id === ticket.assetId)?.name || 'Linked Equipment'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
