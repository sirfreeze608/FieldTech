import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Wrench,
  MapPin,
  Download,
  Plus,
  ChevronRight,
  Edit2,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Ticket as TicketIcon,
  Calendar,
} from 'lucide-react';
import { Asset, AssetStatus } from '../hooks/useAssets';
import { Ticket } from '../hooks/useTickets';
import { Site } from '../hooks/useSites';
import { useStore } from '../store/useStore';
import { db, doc, updateDoc, deleteDoc, addDoc, collection, Timestamp } from '../lib/firebase';
import { buildAssetQrValue } from '../lib/qr';
import { getTrade, TRADE_LIST, TRADES, TradeId } from '../lib/trades';
import { TradeIcon } from './TradeIcon';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

interface AssetDetailsModalProps {
  asset: Asset;
  sites: Site[];
  tickets: Ticket[];
  onClose: () => void;
  onOpenTicket: (ticket: Ticket) => void;
}

export function AssetDetailsModal({
  asset,
  sites,
  tickets,
  onClose,
  onOpenTicket,
}: AssetDetailsModalProps) {
  const { user } = useStore();
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const [currentAsset, setCurrentAsset] = useState<Asset>(asset);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    name: asset.name,
    type: asset.type,
    trade: (asset.trade || 'general') as TradeId,
    assetTag: asset.assetTag || '',
    qrCode: asset.qrCode || buildAssetQrValue(asset.id),
    siteId: asset.siteId,
    locationId: asset.locationId || '',
    manufacturer: asset.manufacturer || '',
    model: asset.model || '',
    serialNumber: asset.serialNumber || '',
    nextServiceDue: asset.nextServiceDue || '',
    notes: asset.notes || '',
  });

  const resolvedTrade = getTrade(currentAsset.trade);
  const [ticketForm, setTicketForm] = useState({
    title: `${currentAsset.name} — Maintenance`,
    description: '',
    priority: 'medium' as Ticket['priority'],
    category: resolvedTrade.categories[0],
    permitRequired: Boolean(resolvedTrade.defaultPermit),
  });

  const isAdmin = user?.role === 'manager' || user?.role === 'dispatcher';
  const qrValue = currentAsset.qrCode || buildAssetQrValue(currentAsset.id);
  const siteName = sites.find((s) => s.id === currentAsset.siteId)?.name || currentAsset.siteId;

  const relatedTickets = tickets.filter(
    (t) => t.assetId === currentAsset.id || t.id === currentAsset.linkedTicketId
  );

  const handleStatusChange = async (newStatus: AssetStatus) => {
    try {
      await updateDoc(doc(db, 'assets', currentAsset.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      setCurrentAsset((prev) => ({ ...prev, status: newStatus }));
      setFeedback(`Equipment status updated to ${newStatus.replace(/-/g, ' ')}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `assets/${currentAsset.id}`);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        type: editForm.type.trim(),
        trade: editForm.trade,
        assetTag: editForm.assetTag.trim(),
        qrCode: editForm.qrCode.trim() || buildAssetQrValue(currentAsset.id),
        siteId: editForm.siteId,
        locationId: editForm.locationId.trim(),
        manufacturer: editForm.manufacturer.trim(),
        model: editForm.model.trim(),
        serialNumber: editForm.serialNumber.trim(),
        nextServiceDue: editForm.nextServiceDue.trim() || null,
        notes: editForm.notes.trim(),
        updatedAt: Timestamp.now(),
      };
      await updateDoc(doc(db, 'assets', currentAsset.id), payload);
      setCurrentAsset((prev) => ({ ...prev, ...payload }));
      setIsEditing(false);
      setFeedback('Equipment specifications saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `assets/${currentAsset.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMaintenanceTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const tradeId = (currentAsset.trade || 'general') as TradeId;
      const ticketPayload = {
        title: ticketForm.title.trim(),
        description:
          ticketForm.description.trim() ||
          `Maintenance requested for ${currentAsset.name} (${currentAsset.assetTag || currentAsset.id}).`,
        priority: ticketForm.priority,
        status: 'open' as const,
        trade: tradeId,
        category: ticketForm.category,
        siteId: currentAsset.siteId,
        assetId: currentAsset.id,
        permitRequired: ticketForm.permitRequired,
        orgCode: user.orgCode,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const ticketRef = await addDoc(collection(db, 'tickets'), ticketPayload);
      await updateDoc(doc(db, 'assets', currentAsset.id), {
        linkedTicketId: ticketRef.id,
        status: currentAsset.status === 'operational' ? 'needs-service' : currentAsset.status,
        updatedAt: Timestamp.now(),
      });
      setIsCreatingTicket(false);
      onOpenTicket({ id: ticketRef.id, ...ticketPayload } as Ticket);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tickets');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async () => {
    try {
      await deleteDoc(doc(db, 'assets', currentAsset.id));
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `assets/${currentAsset.id}`);
    }
  };

  const handleDownloadQrSvg = () => {
    const svgEl = qrContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentAsset.assetTag || currentAsset.name.replace(/\s+/g, '_')}_QR.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 p-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <span className="inline-flex items-center gap-1 font-bold text-neutral-800 dark:text-neutral-200">
                <TradeIcon trade={resolvedTrade.id} className="h-3.5 w-3.5" />
                {resolvedTrade.label}
              </span>
              <span aria-hidden="true">·</span>
              <span>{currentAsset.type}</span>
              {currentAsset.assetTag && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums font-bold text-neutral-700 dark:text-neutral-300">
                    {currentAsset.assetTag}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white truncate">
              {currentAsset.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                title="Edit Equipment"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {feedback && (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {feedback}
              </span>
              <button onClick={() => setFeedback(null)} className="text-emerald-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Equipment Name</label>
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Equipment Type</label>
                  <input
                    required
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Trade</label>
                  <select
                    value={editForm.trade}
                    onChange={(e) => setEditForm({ ...editForm, trade: e.target.value as TradeId })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm dark:text-white"
                  >
                    {TRADE_LIST.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Site</label>
                  <select
                    required
                    value={editForm.siteId}
                    onChange={(e) => setEditForm({ ...editForm, siteId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm dark:text-white"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Asset Tag</label>
                  <input
                    value={editForm.assetTag}
                    onChange={(e) => setEditForm({ ...editForm, assetTag: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Zone / Room</label>
                  <input
                    value={editForm.locationId}
                    onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Manufacturer</label>
                  <input
                    value={editForm.manufacturer}
                    onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Model / Serial</label>
                  <input
                    value={editForm.serialNumber}
                    onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                    placeholder="Serial number"
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">QR Code Value</label>
                  <input
                    value={editForm.qrCode}
                    onChange={(e) => setEditForm({ ...editForm, qrCode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Next Service Due</label>
                  <input
                    type="date"
                    value={editForm.nextServiceDue}
                    onChange={(e) => setEditForm({ ...editForm, nextServiceDue: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Technical Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Status Selector */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Operational Condition</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'operational', label: 'Operational', active: 'bg-emerald-600 text-white border-emerald-600' },
                      { id: 'needs-service', label: 'Needs Service', active: 'bg-amber-600 text-white border-amber-600' },
                      { id: 'out-of-service', label: 'Out of Service', active: 'bg-red-600 text-white border-red-600' },
                      { id: 'retired', label: 'Retired', active: 'bg-neutral-700 text-white border-neutral-700' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => void handleStatusChange(st.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                        currentAsset.status === st.id
                          ? st.active
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment Specs & QR Label Split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-7 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Site</p>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                        {siteName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Zone / Location</p>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-0.5">
                        {currentAsset.locationId || 'Unassigned Zone'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Manufacturer</p>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-0.5">
                        {currentAsset.manufacturer || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Model</p>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-0.5">
                        {currentAsset.model || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Serial Number</p>
                      <p className="font-mono font-semibold text-neutral-900 dark:text-white mt-0.5">
                        {currentAsset.serialNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Next Service Due</p>
                      <p className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-white mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                        {currentAsset.nextServiceDue || 'Not scheduled'}
                      </p>
                    </div>
                  </div>

                  {currentAsset.notes && (
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Field Notes</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {currentAsset.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Printable / Downloadable QR Equipment Tag */}
                <div className="md:col-span-5 flex flex-col items-center p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-center">
                  <div ref={qrContainerRef} className="p-3 bg-white rounded-2xl border border-neutral-200">
                    <QRCodeSVG value={qrValue} size={132} level="H" fgColor="#171717" />
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mt-2 break-all">
                    {qrValue}
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadQrSvg}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold active:scale-95"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR Tag
                  </button>
                </div>
              </div>

              {/* Linked Maintenance Tickets */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <TicketIcon className="h-3.5 w-3.5" />
                    Maintenance Work Orders ({relatedTickets.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTicket(!isCreatingTicket)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isCreatingTicket ? 'Cancel' : 'Create Maintenance Ticket'}
                  </button>
                </div>

                {isCreatingTicket && (
                  <form
                    onSubmit={handleCreateMaintenanceTicket}
                    className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3"
                  >
                    <input
                      required
                      value={ticketForm.title}
                      onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                      placeholder="Maintenance ticket title"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs dark:text-white"
                      >
                        {TRADES[resolvedTrade.id].categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as Ticket['priority'] })}
                        className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs dark:text-white"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="critical">Critical Priority</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      placeholder="Describe issue, fault codes, or inspection findings..."
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold disabled:opacity-50"
                    >
                      {saving ? 'Creating Work Order...' : 'Open Maintenance Ticket'}
                    </button>
                  </form>
                )}

                {relatedTickets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-6 text-center text-xs text-neutral-400">
                    No maintenance work orders linked to this equipment yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relatedTickets.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpenTicket(t)}
                        className="w-full text-left p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] font-semibold">
                            <span
                              className={`uppercase ${
                                t.priority === 'critical'
                                  ? 'text-red-600'
                                  : t.priority === 'high'
                                  ? 'text-orange-600'
                                  : 'text-blue-600'
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span aria-hidden="true" className="text-neutral-300">·</span>
                            <span className="capitalize text-neutral-500 dark:text-neutral-400">{t.status}</span>
                            <span aria-hidden="true" className="text-neutral-300">·</span>
                            <span className="text-neutral-500 dark:text-neutral-400">{t.category}</span>
                          </div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white truncate mt-0.5">
                            {t.title}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" />
                    Asset ID: <span className="font-mono">{currentAsset.id}</span>
                  </span>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Remove asset?
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAsset()}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Equipment
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
