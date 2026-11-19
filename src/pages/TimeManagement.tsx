import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useAllTimeEntries, TimeEntry } from '../hooks/useAllTimeEntries';
import { useOrgUsers } from '../hooks/useOrgUsers';
import { getTrade } from '../lib/trades';
import { Calendar, FileDown, Edit2, X, Save, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { db, doc, updateDoc, deleteDoc, Timestamp } from '../lib/firebase';

export function TimeManagement() {
  const { user } = useStore();
  const { entries, loading } = useAllTimeEntries(user?.orgCode);
  const { users } = useOrgUsers(user?.orgCode);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isAdmin = user?.role === 'manager';

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditIn(format(entry.clockIn.toDate(), "yyyy-MM-dd'T'HH:mm"));
    setEditOut(entry.clockOut ? format(entry.clockOut.toDate(), "yyyy-MM-dd'T'HH:mm") : '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    setSaving(true);
    setFeedback(null);
    try {
      const clockInDate = new Date(editIn);
      const clockOutDate = editOut ? new Date(editOut) : null;
      
      let totalMinutes = 0;
      if (clockOutDate) {
        totalMinutes = Math.round((clockOutDate.getTime() - clockInDate.getTime()) / 60000);
      }

      await updateDoc(doc(db, 'timeEntries', editingEntry.id), {
        clockIn: Timestamp.fromDate(clockInDate),
        clockOut: clockOutDate ? Timestamp.fromDate(clockOutDate) : null,
        totalMinutes: totalMinutes > 0 ? totalMinutes : null,
        lastEditedBy: user?.uid,
        lastEditedAt: Timestamp.now()
      });
      setEditingEntry(null);
      setFeedback('Time entry updated.');
    } catch (error) {
      console.error('Error updating entry:', error);
      setFeedback('Failed to update entry. Please verify permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'timeEntries', id));
      setConfirmDeleteId(null);
      setFeedback('Time entry removed.');
    } catch (error) {
      console.error('Error deleting entry:', error);
      setFeedback('Failed to delete time entry.');
    }
  };

  const exportToCSV = () => {
    if (entries.length === 0) return;

    const headers = ['User', 'Email', 'Role', 'Trade', 'Clock In', 'Clock Out', 'Duration (Min)'];
    const rows = entries.map(entry => {
      const entryUid = entry.userId || entry.uid;
      const tech = users.find(u => u.uid === entryUid);
      return [
        tech?.displayName || 'Unknown',
        tech?.email || 'N/A',
        tech?.role || 'N/A',
        getTrade(tech?.trade).label,
        entry.clockIn.toDate().toISOString(),
        entry.clockOut ? entry.clockOut.toDate().toISOString() : 'N/A',
        entry.totalMinutes || '0'
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TimeLogs_${user?.orgCode}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Time Management</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">View and export organization crew time logs by trade</p>
        </div>
        <button 
          onClick={exportToCSV}
          disabled={loading || entries.length === 0}
          className="flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 dark:bg-neutral-100 px-6 py-3 text-sm font-bold text-white dark:text-neutral-900 shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      {feedback && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-blue-500" /> {feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Crew Member</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Clock In</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Clock Out</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <div className="animate-spin rounded-full h-6 w-6 border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-100" />
                       <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Fetching Logs...</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">No time entries found.</td>
                </tr>
              ) : entries.map(entry => {
                const entryUid = entry.userId || entry.uid;
                const tech = users.find(u => u.uid === entryUid);
                const tradeMeta = getTrade(tech?.trade);
                return (
                  <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-500 dark:text-neutral-300">
                          {tech?.displayName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{tech?.displayName || 'Unknown User'}</p>
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                            {tradeMeta.label} · {tech?.role || 'Technician'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-l border-neutral-50 dark:border-neutral-800">
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 tabular-nums">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs font-bold">{format(entry.clockIn.toDate(), 'MMM dd, HH:mm')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-l border-neutral-50 dark:border-neutral-800">
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 tabular-nums">
                        {entry.clockOut ? (
                          <>
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs font-bold">{format(entry.clockOut.toDate(), 'MMM dd, HH:mm')}</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-neutral-400 italic">In Progress</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-l border-neutral-50 dark:border-neutral-800">
                       <div className="flex items-center gap-2 tabular-nums">
                         <div className="h-2 w-2 rounded-full bg-blue-500" />
                         <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                           {entry.totalMinutes ? `${entry.totalMinutes} min` : '-'}
                         </span>
                       </div>
                    </td>
                    <td className="px-6 py-4 border-l border-neutral-50 dark:border-neutral-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          entry.clockOut ? 'bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 animate-pulse'
                        }`}>
                          {entry.clockOut ? 'Completed' : 'Active'}
                        </span>
                        {isAdmin && (
                          confirmDeleteId === entry.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold uppercase tracking-wider"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEdit(entry)}
                                className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(entry.id)}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm" onClick={() => setEditingEntry(null)} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-2xl border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Edit Time Entry</h2>
              <button onClick={() => setEditingEntry(null)}><X className="h-5 w-5 text-neutral-400" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Clock In Time</label>
                <input 
                  type="datetime-local" 
                  value={editIn}
                  onChange={e => setEditIn(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3 text-sm text-neutral-900 dark:text-neutral-100 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-0"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Clock Out Time (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={editOut}
                  onChange={e => setEditOut(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3 text-sm text-neutral-900 dark:text-neutral-100 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-0"
                />
                <p className="text-[9px] text-neutral-400 mt-1 uppercase font-bold tracking-widest italic">Leave blank if crew member is still active</p>
              </div>
              <button 
                type="submit"
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Saving...' : <><Save className="h-4 w-4" /> Save Changes</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
