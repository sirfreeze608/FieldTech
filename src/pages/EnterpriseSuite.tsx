import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { db, doc, updateDoc } from '../lib/firebase';
import { ShieldAlert, BarChart3, Palette, Clock, CheckCircle2, ChevronLeft, Save, Globe, Zap } from 'lucide-react';

interface EnterpriseSuiteProps {
  onBack: () => void;
}

export function EnterpriseSuite({ onBack }: EnterpriseSuiteProps) {
  const { user } = useStore();
  const [saving, setSaving] = useState(false);
  
  // Mock state for enterprise settings (would normally be in an org settings collection)
  const [slaTime, setSlaTime] = useState('4');
  const [priorityLevels, setPriorityLevels] = useState(['Critical', 'High', 'Medium', 'Low']);
  const [enableAudit, setEnableAudit] = useState(true);
  const [brandingColor, setBrandingColor] = useState('#1a1a1a');

  const handleSave = async () => {
    setSaving(true);
    // In a real app, we'd update a 'organizations' document
    setTimeout(() => {
      setSaving(false);
      alert('Enterprise configuration updated successfully!');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 dark:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Enterprise Suite</h1>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Global Organization Controls</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLA & Response Section */}
        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold dark:text-white">SLA Management</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Standard Response Time (Hours)</label>
              <input 
                type="number" 
                value={slaTime}
                onChange={e => setSlaTime(e.target.value)}
                className="w-full rounded-2xl border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 p-4 text-sm focus:border-neutral-900 dark:focus:border-white focus:ring-0 dark:text-white"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Active Priorities</label>
              <div className="flex flex-wrap gap-2">
                {priorityLevels.map(p => (
                  <span key={p} className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-widest">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Compliance & Audit */}
        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold dark:text-white">Compliance & Audit</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
              <div>
                <p className="text-sm font-bold dark:text-white">Full Identity Trail</p>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Track all document mutations</p>
              </div>
              <button 
                onClick={() => setEnableAudit(!enableAudit)}
                className={`h-6 w-11 rounded-full transition-colors relative ${enableAudit ? 'bg-green-500' : 'bg-neutral-300'}`}
              >
                <div className={`h-5 w-5 rounded-full bg-white absolute top-0.5 transition-all ${enableAudit ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
               <Globe className="h-4 w-4 text-neutral-400" />
               <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Geo-fencing active for all technicians</span>
            </div>
          </div>
        </section>

        {/* Advanced Analytics */}
        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold dark:text-white">Predictive Analytics</h2>
          </div>
          <div className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">AI Suggestion</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Based on historical data, ticket volume peaks on Tuesdays. Consider increasing remote technician availability.
            </p>
          </div>
        </section>

        {/* Branding section */}
        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900">
              <Palette className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold dark:text-white">Branding</h2>
          </div>
          <div className="flex items-center gap-4">
            <div 
              className="h-12 w-12 rounded-2xl shadow-lg"
              style={{ backgroundColor: brandingColor }}
            />
            <div className="flex-1">
               <input 
                 type="text" 
                 value={brandingColor}
                 onChange={e => setBrandingColor(e.target.value)}
                 className="w-full rounded-xl border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 p-3 text-xs font-mono dark:text-white"
               />
            </div>
          </div>
        </section>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {saving ? 'Saving Changes...' : (
          <>
            <Save className="h-4 w-4" />
            Deploy Organizational Policy
          </>
        )}
      </button>
    </div>
  );
}
