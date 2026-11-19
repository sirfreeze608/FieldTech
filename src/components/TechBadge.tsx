import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Calendar, CheckCircle2 } from 'lucide-react';
import { getTrade } from '../lib/trades';

interface TechBadgeProps {
  user: {
    displayName: string;
    role: string;
    trade?: string;
    orgCode: string;
    email: string;
    uid: string;
  } | null;
}

export function TechBadge({ user }: TechBadgeProps) {
  if (!user) return null;
  const userTrade = getTrade(user.trade);

  return (
    <div className="relative w-80 h-[480px] bg-neutral-900 rounded-[40px] p-1 shadow-2xl overflow-hidden border-4 border-neutral-800">
      {/* Decorative top pattern */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-neutral-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        <div className="absolute -right-10 -top-10 h-32 w-32 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full bg-white dark:bg-neutral-900 rounded-[36px] overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-neutral-900 flex justify-between items-center text-white">
           <div className="flex items-center gap-2">
             <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-neutral-900">
               <span className="font-bold text-xs">FT</span>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest">Trade Credential</span>
           </div>
           <Shield className="h-4 w-4 text-blue-400" />
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="h-28 w-28 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-800">
               <span className="text-4xl font-bold text-neutral-300 dark:text-neutral-700">
                 {user.displayName[0]}
               </span>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-xl border-4 border-white dark:border-neutral-900 shadow-md">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <h2 className="text-xl font-bold dark:text-white text-center mb-1">{user.displayName}</h2>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4 text-center">
            {userTrade.label} · {user.role}
          </p>

          <div className="w-full bg-neutral-50 dark:bg-neutral-800 p-4 rounded-3xl space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <Shield className="h-3 w-3 text-blue-500" />
              <div>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Organization</p>
                <p className="text-xs font-bold dark:text-white">{user.orgCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-3 w-3 text-amber-500" />
              <div>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Issued On</p>
                <p className="text-xs font-bold dark:text-white">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-4 bg-white rounded-3xl shadow-sm border border-neutral-100 mb-4">
            <QRCodeSVG 
              value={user.uid} 
              size={100}
              level="H"
              includeMargin={false}
              fgColor="#171717"
            />
          </div>
          <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Verification QR</p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-center gap-4">
           <div className="h-1 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
           <div className="h-1 w-1 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
           <div className="h-1 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        </div>
      </div>
    </div>
  );
}
