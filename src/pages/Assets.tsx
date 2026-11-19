import React, { useState, useEffect } from 'react';
import { QrCode, Plus, Search, MapPin, ChevronRight, Ticket as TicketIcon, Wrench } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAssets, Asset, AssetStatus } from '../hooks/useAssets';
import { useSites } from '../hooks/useSites';
import { useTickets, Ticket } from '../hooks/useTickets';
import { TRADE_LIST, TradeId, getTrade } from '../lib/trades';
import { TradeIcon } from '../components/TradeIcon';
import { db, collection, doc, setDoc, Timestamp } from '../lib/firebase';
import { buildAssetQrValue } from '../lib/qr';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { AssetDetailsModal } from '../components/AssetDetailsModal';
import { TicketDetails } from '../components/TicketDetails';

interface AssetsProps {
  onOpenScanner: () => void;
  prefillQr?: string | null;
  onClearPrefillQr?: () => void;
}

export function Assets({ onOpenScanner, prefillQr, onClearPrefillQr }: AssetsProps) {
  const { user } = useStore();
  const { assets, loading } = useAssets(user?.orgCode);
  const { sites } = useSites(user?.orgCode);
  const { tickets } = useTickets(undefined, user?.orgCode);

  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState<'all' | TradeId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const defaultTrade: TradeId = user?.trade || 'hvac';
  const [form, setForm] = useState({
    name: '',
    type: '',
    trade: defaultTrade,
    siteId: '',
    locationId: '',
    assetTag: '',
    qrCode: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    status: 'operational' as AssetStatus,
    nextServiceDue: '',
    notes: '',
  });

  useEffect(() => {
    if (prefillQr) {
      setForm((prev) => ({
        ...prev,
        qrCode: prefillQr,
        assetTag: prev.assetTag || prefillQr.slice(0, 24),
      }));
      setIsAdding(true);
      onClearPrefillQr?.();
    }
  }, [prefillQr, onClearPrefillQr]);

  const filteredAssets = assets.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      (a.assetTag || '').toLowerCase().includes(q) ||
      (a.serialNumber || '').toLowerCase().includes(q) ||
      (a.manufacturer || '').toLowerCase().includes(q) ||
      (a.qrCode || '').toLowerCase().includes(q);
    const matchesTrade = tradeFilter === 'all' || (a.trade || 'general') === tradeFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesTrade && matchesStatus;
  });

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.siteId) return;
    setSaving(true);
    try {
      const assetRef = doc(collection(db, 'assets'));
      const generatedTag =
        form.assetTag.trim() ||
        `EQ-${getTrade(form.trade).shortCode}-${assetRef.id.slice(0, 4).toUpperCase()}`;

      const payload = {
        orgCode: user.orgCode,
        name: form.name.trim(),
        type: form.type.trim(),
        trade: form.trade,
        siteId: form.siteId,
        locationId: form.locationId.trim(),
        assetTag: generatedTag,
        qrCode: form.qrCode.trim() || buildAssetQrValue(assetRef.id),
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        status: form.status,
        nextServiceDue: form.nextServiceDue.trim() || null,
        notes: form.notes.trim(),
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(assetRef, payload);
      setIsAdding(false);
      setForm({
        name: '',
        type: '',
        trade: defaultTrade,
        siteId: '',
        locationId: '',
        assetTag: '',
        qrCode: '',
        manufacturer: '',
        model: '',
        serialNumber: '',
        status: 'operational',
        nextServiceDue: '',
        notes: '',
      });
      setSelectedAsset({ id: assetRef.id, ...payload } as Asset);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'assets');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Equipment &amp; QR Assets
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Scan equipment QR labels to inspect specs, print tags, or launch maintenance tickets
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2.5 text-xs font-bold text-white dark:text-neutral-900 shadow-lg active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <QrCode className="h-4 w-4" />
            Scan Equipment QR
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-xs font-bold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Equipment
          </button>
        </div>
      </header>

      {/* Search + Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by equipment name, tag, serial, or QR payload..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-10 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl self-start sm:self-auto overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'operational', label: 'Operational' },
              { id: 'needs-service', label: 'Needs Service' },
              { id: 'out-of-service', label: 'Out of Service' },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === st.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setTradeFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition-colors ${
            tradeFilter === 'all'
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
          }`}
        >
          All Trades ({assets.length})
        </button>
        {TRADE_LIST.map((t) => {
          const count = assets.filter((a) => (a.trade || 'general') === t.id).length;
          return (
            <button
              key={t.id}
              type="button"
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

      {/* Asset List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-12 text-center space-y-3">
            <Wrench className="h-8 w-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
            <p className="text-sm font-medium text-neutral-500">
              {assets.length === 0
                ? 'No equipment assets registered yet. Add equipment or scan a QR label.'
                : 'No equipment matches your current filter.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenScanner}
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold"
              >
                Scan QR Label
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200"
              >
                Register Equipment
              </button>
            </div>
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const tradeMeta = getTrade(asset.trade);
            const openWorkOrders = tickets.filter(
              (t) =>
                (t.assetId === asset.id || t.id === asset.linkedTicketId) &&
                t.status !== 'closed' &&
                t.status !== 'resolved'
            );

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="group rounded-2xl bg-white dark:bg-neutral-900 p-4 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-neutral-800 dark:text-neutral-200">
                      <TradeIcon trade={tradeMeta.id} className="h-3.5 w-3.5" />
                      {tradeMeta.label}
                    </span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="text-neutral-500 dark:text-neutral-400">{asset.type}</span>
                    {asset.assetTag && (
                      <>
                        <span aria-hidden="true" className="text-neutral-300">·</span>
                        <span className="font-mono tabular-nums font-bold text-neutral-600 dark:text-neutral-300">
                          {asset.assetTag}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span
                      className={`font-semibold capitalize ${
                        asset.status === 'operational'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : asset.status === 'needs-service'
                          ? 'text-amber-600 dark:text-amber-400'
                          : asset.status === 'out-of-service'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {asset.status.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-300 shrink-0" />
                </div>

                <h3 className="font-bold text-neutral-900 dark:text-white">{asset.name}</h3>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-neutral-400 tabular-nums">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {sites.find((s) => s.id === asset.siteId)?.name || asset.siteId}
                    {asset.locationId ? ` — ${asset.locationId}` : ''}
                  </span>
                  {asset.serialNumber && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">SN: {asset.serialNumber}</span>
                    </>
                  )}
                  {openWorkOrders.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <TicketIcon className="h-3.5 w-3.5" />
                        {openWorkOrders.length} active maintenance ticket{openWorkOrders.length > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Equipment Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Register Equipment Asset</h2>
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Trade</label>
                  <select
                    value={form.trade}
                    onChange={(e) => setForm({ ...form, trade: e.target.value as TradeId })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    {TRADE_LIST.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Equipment Type</label>
                  <input
                    required
                    placeholder="e.g. Rooftop HVAC Unit, Switchgear"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Equipment Name</label>
                <input
                  required
                  placeholder="e.g. Chiller Compressor #2 (North Wing)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2.5 text-sm dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Site</label>
                  <select
                    required
                    value={form.siteId}
                    onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    <option value="">Select Site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Zone / Room</label>
                  <input
                    placeholder="e.g. Mechanical Rm B2"
                    value={form.locationId}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Asset Tag</label>
                  <input
                    placeholder="Auto-generated if blank"
                    value={form.assetTag}
                    onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Serial Number</label>
                  <input
                    placeholder="Manufacturer serial"
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Manufacturer</label>
                  <input
                    placeholder="e.g. Trane, Square D, Kohler"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    <option value="operational">Operational</option>
                    <option value="needs-service">Needs Service</option>
                    <option value="out-of-service">Out of Service</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Custom QR Tag Value (Optional)
                </label>
                <input
                  placeholder="Leave blank to auto-generate fieldtech://asset/..."
                  value={form.qrCode}
                  onChange={(e) => setForm({ ...form, qrCode: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-xs font-mono dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 py-3 text-sm font-bold text-neutral-600 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-neutral-900 dark:bg-white py-3 text-sm font-bold text-white dark:text-neutral-900 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAsset && (
        <AssetDetailsModal
          asset={selectedAsset}
          sites={sites}
          tickets={tickets}
          onClose={() => setSelectedAsset(null)}
          onOpenTicket={(ticket) => {
            setSelectedAsset(null);
            setSelectedTicket(ticket);
          }}
        />
      )}

      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
