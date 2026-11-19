import React from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { AlertCircle, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

const MOCK_DATA = [
  { time: '00:00', reports: 12 },
  { time: '04:00', reports: 18 },
  { time: '08:00', reports: 45 },
  { time: '12:00', reports: 32 },
  { time: '16:00', reports: 89 },
  { time: '20:00', reports: 24 },
  { time: '23:59', reports: 15 },
];

const SERVICES = [
  { name: 'Core API', status: 'operational', delay: '12ms' },
  { name: 'Auth Server', status: 'degraded', delay: '450ms' },
  { name: 'Storage Buckets', status: 'operational', delay: '8ms' },
];

export function DownDetectorWidget() {
  return (
    <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 h-full transition-colors flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
          <h2 className="text-lg font-bold dark:text-white">DownDetector</h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Live Reports</span>
        </div>
      </div>

      <div className="h-24 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOCK_DATA}>
            <defs>
              <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#171717', 
                border: 'none', 
                borderRadius: '8px',
                fontSize: '10px',
                color: '#fff'
              }}
              labelStyle={{ display: 'none' }}
            />
            <Area 
              type="monotone" 
              dataKey="reports" 
              stroke="#f59e0b" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorReports)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        {SERVICES.map((s) => (
          <div key={s.name} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 group hover:border-neutral-200 dark:hover:border-neutral-700 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              {s.status === 'operational' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{s.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">Latency</span>
                  <span className="text-[10px] font-bold text-neutral-500">{s.delay}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
          </div>
        ))}
      </div>

      <button className="mt-4 w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all">
        Full Status Report
      </button>
    </section>
  );
}
