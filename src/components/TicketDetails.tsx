import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, TicketMaterial } from '../hooks/useTickets';
import { useWorkLogs } from '../hooks/useWorkLogs';
import { useStore } from '../store/useStore';
import { useOrgUsers } from '../hooks/useOrgUsers';
import { useSites } from '../hooks/useSites';
import { useAssets, Asset } from '../hooks/useAssets';
import { useTasks, Task } from '../hooks/useTasks';
import { db, collection, addDoc, Timestamp, doc, updateDoc } from '../lib/firebase';
import { buildTicketQrValue } from '../lib/qr';
import { X, Camera, MessageSquare, Info, CheckCircle, Clock, Search, Check, ListChecks, Plus, AlertTriangle, CheckCheck, Package, ShieldAlert, QrCode, Wrench, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTrade, inferTradeFromCategory } from '../lib/trades';
import { TradeIcon } from './TradeIcon';
import { AssetDetailsModal } from './AssetDetailsModal';

interface TicketDetailsProps {
  ticket: Ticket;
  onClose: () => void;
}

export function TicketDetails({ ticket, onClose }: TicketDetailsProps) {
  const { user } = useStore();
  const { logs, loading } = useWorkLogs(ticket.id, user?.orgCode);
  const { users: orgUsers } = useOrgUsers(user?.orgCode);
  const { sites } = useSites(user?.orgCode);
  const { assets } = useAssets(user?.orgCode);
  const { tasks, loading: loadingTasks } = useTasks(ticket.id, user?.orgCode);
  const [newComment, setNewComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState(ticket.assignedTo || '');
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [materials, setMaterials] = useState<TicketMaterial[]>(ticket.materials || []);
  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('1');
  const [matUnit, setMatUnit] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [showQrTag, setShowQrTag] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const ticketQrRef = useRef<HTMLDivElement>(null);

  const ticketTrade = getTrade(ticket.trade || inferTradeFromCategory(ticket.category));
  const defaultUnit = matUnit || ticketTrade.materialUnits[0] || 'ea';
  const linkedAsset = ticket.assetId ? assets.find((a) => a.id === ticket.assetId) : undefined;
  const ticketQrValue = buildTicketQrValue(ticket.id);

  const handleDownloadTicketQr = () => {
    const svgEl = ticketQrRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WorkOrder_${ticket.id.slice(0, 8)}_QR.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const filteredUsers = orgUsers
    .filter(u =>
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      getTrade(u.trade).label.toLowerCase().includes(userSearch.toLowerCase())
    )
    .sort((a, b) => {
      const aMatch = (a.trade || 'it') === ticketTrade.id ? 1 : 0;
      const bMatch = (b.trade || 'it') === ticketTrade.id ? 1 : 0;
      return bMatch - aMatch;
    });

  const assignedUser = orgUsers.find(u => u.uid === ticket.assignedTo);

  const handleAssign = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), { 
        assignedTo: userId,
        updatedAt: Timestamp.now() 
      });
      setIsAssigning(false);
      showNotification('Crew member assigned', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'workLogs'), {
        ticketId: ticket.id,
        orgCode: user.orgCode,
        technicianId: user.uid,
        comment: newComment,
        photoUrl: photoUrl || null,
        createdAt: Timestamp.now(),
      });
      setNewComment('');
      setPhotoUrl('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status: Ticket['status']) => {
    if ((status === 'resolved' || status === 'closed') && tasks.some(t => t.status === 'pending')) {
      showNotification("Complete all checkpoint tasks before resolving.", 'info');
      return;
    }
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), { status, updatedAt: Timestamp.now() });
      showNotification(`Status updated to ${status}`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskTitle.trim() || !taskAssignedTo) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        title: taskTitle,
        orgCode: user.orgCode,
        status: 'pending',
        trade: ticketTrade.id,
        assignedTo: taskAssignedTo,
        ticketId: ticket.id,
        siteId: ticket.siteId,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
      });
      setTaskTitle('');
      setIsAddingTask(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedTradeChecklist = async () => {
    if (!user) return;
    const assignee = ticket.assignedTo || user.uid;
    try {
      for (const step of ticketTrade.checklistTemplates) {
        if (!tasks.some(t => t.title === step)) {
          await addDoc(collection(db, 'tasks'), {
            title: step,
            orgCode: user.orgCode,
            status: 'pending',
            trade: ticketTrade.id,
            assignedTo: assignee,
            ticketId: ticket.id,
            siteId: ticket.siteId,
            createdBy: user.uid,
            createdAt: Timestamp.now(),
          });
        }
      }
      showNotification(`Loaded ${ticketTrade.label} QA checklist`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !matName.trim()) return;
    setSavingMaterial(true);
    try {
      const nextMaterials: TicketMaterial[] = [
        ...materials,
        {
          name: matName.trim(),
          quantity: matQty.trim() || '1',
          unit: defaultUnit,
          addedBy: user.displayName,
          addedAt: new Date().toISOString(),
        },
      ];
      await updateDoc(doc(db, 'tickets', ticket.id), {
        materials: nextMaterials,
        updatedAt: Timestamp.now(),
      });
      setMaterials(nextMaterials);
      setMatName('');
      setMatQty('1');
      showNotification('Material logged to work order', 'success');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (task.status === 'pending') {
      setTaskToComplete(task);
      return;
    }

    try {
      await updateDoc(doc(db, 'tasks', task.id), { status: 'pending' });
      showNotification('Task marked as pending', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmComplete = async () => {
    if (!taskToComplete) return;
    try {
      await updateDoc(doc(db, 'tasks', taskToComplete.id), { status: 'completed' });
      setTaskToComplete(null);
      showNotification('Task completed successfully', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const showNotification = (message: string, type: 'success' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-hidden safe-top safe-bottom">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800">
            <X className="h-6 w-6 text-neutral-400" />
          </button>
          <div>
            <h2 className="text-sm font-bold truncate max-w-[220px] dark:text-white">{ticket.title}</h2>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span>{ticketTrade.label}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{ticket.id.slice(0, 8)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQrTag((prev) => !prev)}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            title="Show Work Order QR Code"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
            ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
            ticket.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
            'bg-neutral-100 text-neutral-600'
          }`}>
            {ticket.status}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[3000] px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 border ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-100 text-green-600' 
                : 'bg-blue-50 border-blue-100 text-blue-600'
            }`}
          >
            {notification.type === 'success' ? <CheckCheck className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            <span className="text-xs font-bold uppercase tracking-wider">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {taskToComplete && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold mb-2 dark:text-white">Complete Task?</h3>
                <p className="text-sm text-neutral-500 mb-6">
                  Are you sure you want to mark &quot;<span className="font-bold text-neutral-900 dark:text-white">{taskToComplete.title}</span>&quot; as completed?
                </p>
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setTaskToComplete(null)}
                    className="flex-1 py-3 rounded-xl bg-neutral-100 text-neutral-600 font-bold text-xs active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmComplete}
                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold text-xs active:scale-95 transition-all shadow-lg"
                  >
                    Yes, Complete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Work Order Scope</h3>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${
              ticket.priority === 'critical' ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}>
              {ticket.priority} Priority
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{ticket.description}</p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-50 dark:border-neutral-800">
            <div>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Site</p>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">
                {sites.find(s => s.id === ticket.siteId)?.name || ticket.siteId}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Trade</p>
              <p className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1 mt-0.5">
                <TradeIcon trade={ticketTrade.id} className="h-3.5 w-3.5" />
                {ticketTrade.label}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Category</p>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{ticket.category}</p>
            </div>
          </div>

          {ticket.permitRequired && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-semibold">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Safety Permit Required: {ticketTrade.defaultPermit || 'Site Permit Verification'}</span>
            </div>
          )}

          {linkedAsset && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
                  <Wrench className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Linked Equipment {linkedAsset.assetTag ? `· ${linkedAsset.assetTag}` : ''}
                  </p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{linkedAsset.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAsset(linkedAsset)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Inspect Asset
              </button>
            </div>
          )}

          {showQrTag && (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div ref={ticketQrRef} className="p-2.5 bg-white rounded-xl border border-neutral-200 shrink-0">
                  <QRCodeSVG value={ticketQrValue} size={76} level="H" fgColor="#171717" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">Work Order QR Label</p>
                  <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 break-all mt-0.5">
                    {ticketQrValue}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTicketQr}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                Download SVG
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-neutral-50 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Assignment</p>
              <button 
                onClick={() => setIsAssigning(true)}
                className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
              >
                {ticket.assignedTo ? 'Change' : 'Assign'}
              </button>
            </div>
            {assignedUser ? (
              <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-2xl">
                <div className="h-8 w-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 text-[10px] font-bold">
                  {assignedUser.displayName[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">{assignedUser.displayName}</p>
                  <p className="text-[10px] text-neutral-400">
                    {getTrade(assignedUser.trade).label} · {assignedUser.role}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No one assigned yet</p>
            )}
          </div>

          {isAssigning && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
              <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/50">
                  <h3 className="text-sm font-bold dark:text-white">Assign {ticketTrade.label} Crew</h3>
                  <button onClick={() => setIsAssigning(false)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <X className="h-4 w-4 text-neutral-400" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search by name or trade..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full rounded-xl border-none bg-neutral-100 dark:bg-neutral-800 px-10 py-2.5 text-sm ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                    {filteredUsers.map(u => {
                      const uTrade = getTrade(u.trade);
                      const isTradeMatch = uTrade.id === ticketTrade.id;
                      return (
                        <button
                          key={u.uid}
                          onClick={() => handleAssign(u.uid)}
                          className={`flex w-full items-center justify-between p-3 rounded-2xl transition-colors ${
                            ticket.assignedTo === u.uid ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-bold ${
                              ticket.assignedTo === u.uid ? 'bg-white/20' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200'
                            }`}>
                              {u.displayName[0]}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold">{u.displayName}</p>
                              <p className={`text-[10px] ${ticket.assignedTo === u.uid ? 'text-white/70' : 'text-neutral-400'}`}>
                                {uTrade.label} · {u.role}
                                {isTradeMatch ? ' · Matching Trade' : ''}
                              </p>
                            </div>
                          </div>
                          {ticket.assignedTo === u.uid && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <p className="text-center py-8 text-sm text-neutral-400">No users found</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button 
              onClick={() => handleStatusChange('in-progress')}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-white shadow-lg active:scale-95"
            >
              <Clock className="h-4 w-4" />
              In Progress
            </button>
            <button 
              onClick={() => handleStatusChange('resolved')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg active:scale-95 ${
                tasks.some(t => t.status === 'pending') ? 'bg-neutral-300' : 'bg-green-500'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              Resolved
            </button>
          </div>
        </section>

        {/* Materials & Parts Used Section */}
        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              Materials &amp; Parts Log
            </h3>
            <span className="text-[10px] font-mono text-neutral-400 tabular-nums">{materials.length} logged</span>
          </div>

          <form onSubmit={handleAddMaterial} className="grid grid-cols-12 gap-2">
            <input
              type="text"
              list={`materials-${ticket.id}`}
              placeholder={`e.g. ${ticketTrade.commonMaterials[0] || 'Material name'}`}
              value={matName}
              onChange={(e) => setMatName(e.target.value)}
              className="col-span-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs dark:text-white"
              required
            />
            <datalist id={`materials-${ticket.id}`}>
              {ticketTrade.commonMaterials.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <input
              type="text"
              placeholder="Qty"
              value={matQty}
              onChange={(e) => setMatQty(e.target.value)}
              className="col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-2 text-xs font-mono tabular-nums dark:text-white"
            />
            <select
              value={defaultUnit}
              onChange={(e) => setMatUnit(e.target.value)}
              className="col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-2 text-xs dark:text-white"
            >
              {ticketTrade.materialUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={savingMaterial || !matName.trim()}
              className="col-span-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center active:scale-95 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          {materials.length === 0 ? (
            <p className="text-[11px] text-neutral-400 italic text-center py-2">
              No materials logged yet for this {ticketTrade.label} work order.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {materials.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-900 dark:text-white">{item.name}</span>
                  <span className="font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {item.quantity} {item.unit} · {item.addedBy}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
              <ListChecks className="h-3 w-3" />
              Checkpoint Tasks
            </h3>
            {(user?.role === 'manager' || user?.role === 'dispatcher') && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSeedTradeChecklist}
                  className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:underline"
                >
                  + Load {ticketTrade.label} Checklist
                </button>
                <button 
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:underline"
                >
                  {isAddingTask ? 'Cancel' : 'Add Task'}
                </button>
              </div>
            )}
          </div>

          {isAddingTask && (
            <form onSubmit={handleAddTask} className="space-y-3 bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
              <input
                type="text"
                placeholder="Task title..."
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="w-full rounded-xl border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-neutral-900 dark:text-white"
                required
              />
              <select
                value={taskAssignedTo}
                onChange={e => setTaskAssignedTo(e.target.value)}
                className="w-full rounded-xl border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-neutral-900 dark:text-white"
                required
              >
                <option value="">Assign To...</option>
                {orgUsers.map(u => (
                  <option key={u.uid} value={u.uid}>{u.displayName} ({getTrade(u.trade).label} · {u.role})</option>
                ))}
              </select>
              <button 
                type="submit"
                className="w-full rounded-xl bg-neutral-900 dark:bg-white py-2.5 text-xs font-bold text-white dark:text-neutral-900 shadow-md active:scale-[0.98]"
              >
                Create Task
              </button>
            </form>
          )}

          <div className="space-y-2">
            {loadingTasks ? (
              <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-200 border-t-neutral-900" /></div>
            ) : tasks.length === 0 ? (
              <p className="text-[11px] text-neutral-400 italic text-center py-2">No tasks assigned to this ticket.</p>
            ) : tasks.map(task => {
              const isAssignedToMe = task.assignedTo === user?.uid;
              return (
                <div 
                  key={task.id} 
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all group ${
                    isAssignedToMe 
                      ? 'bg-blue-50/30 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' 
                      : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleTask(task)}
                      className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        task.status === 'completed' 
                          ? 'bg-green-500 border-green-500 scale-100' 
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      {task.status === 'completed' && <Check className="h-4 w-4 text-white" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold ${task.status === 'completed' ? 'text-neutral-400 line-through' : 'text-neutral-900 dark:text-white'}`}>
                          {task.title}
                        </p>
                        {isAssignedToMe && (
                          <span className="text-[8px] font-black uppercase tracking-tighter bg-blue-600 text-white px-1 rounded">You</span>
                        )}
                      </div>
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">
                        {orgUsers.find(u => u.uid === task.assignedTo)?.displayName || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  {task.status === 'pending' && isAssignedToMe && (
                    <button 
                      onClick={() => handleToggleTask(task)}
                      className="text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest px-2 py-1 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-blue-100 dark:border-blue-900/30 active:scale-95 transition-all md:hidden"
                    >
                      Done
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 px-2 flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Work Logs & Photos
          </h3>
          
          <form onSubmit={handleAddLog} className="bg-white rounded-3xl p-4 shadow-sm border border-neutral-100 space-y-3">
            <textarea
              placeholder="Add progress note..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="w-full rounded-2xl border-neutral-100 bg-neutral-50 px-4 py-3 text-sm focus:border-neutral-900 focus:ring-0 min-h-[100px]"
            />
            
            {photoUrl && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200">
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              <button
                type="button"
                onClick={triggerCamera}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                  photoUrl ? 'bg-blue-50 text-blue-600' : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                <Camera className="h-4 w-4" />
                {photoUrl ? 'Stored' : 'Add Photo'}
              </button>
              <div className="flex-1" />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="rounded-xl bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-neutral-200 border-t-neutral-900" /></div>
            ) : logs.map(log => (
              <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-neutral-900 uppercase tracking-widest">Update from {log.technicianId === user?.uid ? 'Me' : 'Tech'}</p>
                  <p className="text-[9px] text-neutral-300">{log.createdAt?.toDate().toLocaleString()}</p>
                </div>
                <p className="text-sm text-neutral-600 italic leading-relaxed">"{log.comment}"</p>
                {log.photoUrl && (
                  <div className="rounded-xl overflow-hidden border border-neutral-100">
                    <img src={log.photoUrl} alt="Work log" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {viewingAsset && (
        <AssetDetailsModal
          asset={viewingAsset}
          sites={sites}
          tickets={[ticket]}
          onClose={() => setViewingAsset(null)}
          onOpenTicket={() => setViewingAsset(null)}
        />
      )}
    </div>
  );
}
