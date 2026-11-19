import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { db, doc, updateDoc } from '../lib/firebase';
import { User, Mail, Phone, MapPin, Save, ChevronLeft, HardHat, Plus, X, Check } from 'lucide-react';
import { TRADE_LIST, TRADES, TradeId } from '../lib/trades';

interface AccountSettingsProps {
  onBack: () => void;
}

export function AccountSettings({ onBack }: AccountSettingsProps) {
  const { user, setUser } = useStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [trade, setTrade] = useState<TradeId>(user?.trade || 'it');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [customSkill, setCustomSkill] = useState('');
  const [lat, setLat] = useState(user?.location?.lat?.toString() || '');
  const [lng, setLng] = useState(user?.location?.lng?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const tradeDef = TRADES[trade];

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills((prev) => [...prev, trimmed]);
    setCustomSkill('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const location = {
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0,
      };
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        phone,
        address,
        trade,
        skills,
        location,
      });
      setUser({ ...user, displayName, phone, address, trade, skills, location });
      setStatusMsg('Settings saved successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
      setStatusMsg('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5 dark:text-white" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Account Settings</h1>
        </div>
        {statusMsg && (
          <span className="text-xs font-bold text-emerald-600">{statusMsg}</span>
        )}
      </header>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Primary Trade Specialty</label>
            <div className="relative">
              <HardHat className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value as TradeId)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm font-semibold dark:text-white focus:outline-none"
              >
                {TRADE_LIST.map((t) => (
                  <option key={t.id} value={t.id}>{t.label} — {t.description}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">
              {tradeDef.label} Certifications &amp; Licenses
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tradeDef.certifications.map((cert) => {
                const active = skills.includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleSkill(cert)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      active
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                        : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {cert}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Add custom license or certification..."
                className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                className="px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 text-xs font-semibold">
                    {s}
                    <button type="button" onClick={() => toggleSkill(s)} className="hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 012-3456"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Street Address (Base Location)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Trade Way, Suite 100"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">GPS Coordinates (Optional)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Lat"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white focus:outline-none"
                />
              </div>
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Lng"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Organization Code (ReadOnly)</label>
            <div className="relative opacity-60">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
              <input
                type="text"
                value={user?.orgCode || ''}
                readOnly
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm font-mono dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Email (ReadOnly)</label>
            <div className="relative opacity-60">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 pl-10 pr-4 py-3 text-sm dark:text-white"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 dark:bg-white py-4 text-sm font-bold text-white dark:text-neutral-900 shadow-xl active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </button>
      </form>
    </div>
  );
}
