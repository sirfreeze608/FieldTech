import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Globe, Newspaper, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

interface SystemStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: string;
}

export function SystemsHealthWidget({ systems, lastUpdated, refreshStatus }: { systems: SystemStatus[], lastUpdated: Date, refreshStatus: () => void }) {
  return (
    <section className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden relative h-full transition-colors">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-neutral-900 dark:text-white" />
          <h2 className="text-lg font-bold dark:text-white">Systems Health</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button 
            onClick={refreshStatus}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <RefreshCw className="h-3 w-3 text-neutral-400" />
          </button>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        {systems.slice(0, 4).map((sys) => (
          <div key={sys.name} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-100/50 dark:border-neutral-700/50">
            <div className="flex items-center gap-3">
              {sys.status === 'operational' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : sys.status === 'degraded' ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <Activity className="h-4 w-4 text-red-500" />
              )}
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{sys.name}</p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-medium">Uptime: {sys.uptime}</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
              sys.status === 'operational' ? 'bg-green-100 text-green-700' :
              sys.status === 'degraded' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {sys.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TechPulseWidget({ news, newsIndex, loadingNews }: { news: NewsItem[], newsIndex: number, loadingNews: boolean }) {
  return (
    <section className="bg-neutral-900 rounded-3xl p-6 text-white shadow-xl flex flex-col relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-bold">Tech Pulse</h2>
        </div>
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Live News</span>
      </div>

      <div className="flex-1 flex flex-col justify-center relative z-10 min-h-[140px]">
        {loadingNews ? (
           <div className="p-4 border-l border-white/10 animate-pulse space-y-2">
              <div className="h-4 w-3/4 bg-white/10 rounded" />
              <div className="h-3 w-1/4 bg-white/10 rounded" />
           </div>
        ) : (
          <AnimatePresence mode="wait">
            {news.length > 0 && (
              <motion.div
                key={newsIndex}
                initial={{ rotateX: -90, opacity: 0, y: 20 }}
                animate={{ rotateX: 0, opacity: 1, y: 0 }}
                exit={{ rotateX: 90, opacity: 0, y: -20 }}
                transition={{ 
                  duration: 0.6, 
                  type: "spring", 
                  stiffness: 100,
                  damping: 10
                }}
                className="flex flex-col gap-2 p-1"
              >
                <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest self-start mb-2">
                  <Globe className="h-2 w-2" />
                  {news[newsIndex].source}
                </div>
                <h3 className="text-sm font-bold font-serif leading-tight tracking-tight h-[3rem] line-clamp-3">
                  {news[newsIndex].title}
                </h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-white/40 font-mono">
                    {new Date(news[newsIndex].pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <div className="absolute top-0 right-0 p-4 font-mono text-[60px] font-black text-white/[0.03] pointer-events-none select-none">
        NEWS
      </div>
    </section>
  );
}

export function TechDashboardWidgets() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const [loadingNews, setLoadingNews] = useState(true);
  const [systems, setSystems] = useState<SystemStatus[]>([
    { name: 'AWS Cloud', status: 'operational', uptime: '99.9%' },
    { name: 'Google Workspace', status: 'operational', uptime: '100%' },
    { name: 'Azure Active Dir', status: 'operational', uptime: '99.95%' },
    { name: 'Cloudflare Edge', status: 'operational', uptime: '99.99%' },
    { name: 'Organization VPN', status: 'operational', uptime: '98.5%' },
  ]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchNews = async () => {
    setLoadingNews(true);
    try {
      const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/feed/');
      const data = await response.json();
      if (data.status === 'ok') {
        const items = data.items.map((item: any) => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: 'TechCrunch'
        }));
        setNews(items);
      }
    } catch (err) {
      console.error('Failed to fetch tech news:', err);
    } finally {
      setLoadingNews(false);
    }
  };

  const refreshStatus = () => {
    setSystems(prev => prev.map(sys => {
      const rand = Math.random();
      let status = sys.status;
      if (rand > 0.98) status = 'outage';
      else if (rand > 0.95) status = 'degraded';
      else status = 'operational';
      return { ...sys, status };
    }));
    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchNews();
    const newsTimer = setInterval(() => {
      setNewsIndex(prev => (news.length > 0 ? (prev + 1) % news.length : 0));
    }, 6000);

    const statusTimer = setInterval(refreshStatus, 30 * 60 * 1000);

    return () => {
      clearInterval(newsTimer);
      clearInterval(statusTimer);
    };
  }, [news.length]);

  return (
    <div className="flex flex-col gap-6">
      <SystemsHealthWidget systems={systems} lastUpdated={lastUpdated} refreshStatus={refreshStatus} />
      <TechPulseWidget news={news} newsIndex={newsIndex} loadingNews={loadingNews} />
    </div>
  );
}
