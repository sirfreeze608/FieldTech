import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Zap, BookOpen, Globe, RefreshCw, Settings2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FeedItem {
  id: string;
  source: 'CVE' | 'CISA' | 'NIST' | 'OSINT' | 'TIPS';
  title: string;
  timestamp: string;
  url: string;
}

const MOCK_FEEDS: FeedItem[] = [
  { id: '1', source: 'CVE', title: 'CVE-2026-1234: Critical Remote Code Execution in Common Web Framework', timestamp: '2h ago', url: '#' },
  { id: '2', source: 'CISA', title: 'CISA Adds Five Known Exploited Vulnerabilities to Catalog', timestamp: '4h ago', url: '#' },
  { id: '3', source: 'NIST', title: 'SP 800-53 Rev. 5: Security and Privacy Controls for Information Systems', timestamp: '1d ago', url: '#' },
  { id: '4', source: 'OSINT', title: 'Major Botnet Infrastructure Dismantled in Collaborative Operation', timestamp: '3h ago', url: '#' },
  { id: '5', source: 'TIPS', title: 'Securing Remote Access: Multi-Factor Authentication Best Practices', timestamp: '5h ago', url: '#' },
  { id: '6', source: 'CVE', title: 'CVE-2026-5678: Improper Input Validation in Industrial Control Systems', timestamp: '6h ago', url: '#' },
  { id: '7', source: 'CISA', title: 'Alert: Threat Actors Exploiting Vulnerabilities in Unpatched VPNs', timestamp: '8h ago', url: '#' },
];

export function PulseOverview() {
  const [activeFeeds, setActiveFeeds] = useState<string[]>(['CVE', 'CISA', 'NIST', 'OSINT', 'TIPS']);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feeds, setFeeds] = useState<FeedItem[]>(MOCK_FEEDS);

  const toggleFeed = (source: string) => {
    setActiveFeeds(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const refreshFeeds = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // In a real app, this would re-fetch from an RSS proxy
    }, 1000);
  };

  const filteredFeeds = feeds.filter(f => activeFeeds.includes(f.source));

  const getSourceStyle = (source: string) => {
    switch (source) {
      case 'CVE': return 'bg-red-500/10 text-red-500';
      case 'CISA': return 'bg-blue-500/10 text-blue-500';
      case 'NIST': return 'bg-purple-500/10 text-purple-500';
      case 'OSINT': return 'bg-emerald-500/10 text-emerald-500';
      case 'TIPS': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-neutral-500/10 text-neutral-500';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'CVE': return <ShieldAlert className="h-3 w-3" />;
      case 'CISA': return <Activity className="h-3 w-3" />;
      case 'NIST': return <BookOpen className="h-3 w-3" />;
      case 'OSINT': return <Globe className="h-3 w-3" />;
      case 'TIPS': return <Zap className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <section className="bg-neutral-900 rounded-3xl p-6 text-white shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Pulse Overview
          </h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Live Intelligence Feed</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshFeeds}
            className={`p-2 rounded-xl hover:bg-white/5 transition-colors ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="h-4 w-4 text-white/40" />
          </button>
          <button 
            onClick={() => setIsConfiguring(!isConfiguring)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Settings2 className="h-4 w-4 text-white/40" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isConfiguring && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="grid grid-cols-3 gap-2 bg-white/5 p-4 rounded-2xl border border-white/5">
              {['CVE', 'CISA', 'NIST', 'OSINT', 'TIPS'].map(source => (
                <button
                  key={source}
                  onClick={() => toggleFeed(source)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${
                    activeFeeds.includes(source) 
                      ? 'bg-white text-neutral-900' 
                      : 'bg-white/5 text-white/40'
                  }`}
                >
                  {getSourceIcon(source)}
                  {source}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {filteredFeeds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No active feeds selected</p>
          </div>
        ) : (
          filteredFeeds.map(feed => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={feed.id} 
              className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${getSourceStyle(feed.source)}`}>
                      {getSourceIcon(feed.source)}
                      {feed.source}
                    </span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{feed.timestamp}</span>
                  </div>
                  <h3 className="text-xs font-bold text-white/90 leading-relaxed group-hover:text-blue-400 transition-colors">
                    {feed.title}
                  </h3>
                </div>
                <ExternalLink className="h-3 w-3 text-white/20 group-hover:text-white/60" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5">
           <span className="text-xl font-bold">2.4k</span>
           <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Total CVEs</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5">
           <span className="text-xl font-bold text-emerald-400">Stable</span>
           <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Grid Status</span>
        </div>
      </div>
    </section>
  );
}
