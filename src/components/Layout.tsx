import React from 'react';
import { Home, Ticket, Map, MessageSquare, User, LayoutGrid, ToggleRight, ToggleLeft, Moon, Sun, HardHat, Wrench, QrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { getTrade } from '../lib/trades';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenScanner?: () => void;
}

export function Layout({ children, activeTab, setActiveTab, onOpenScanner }: LayoutProps) {
  const { user, dispatcherMode, setDispatcherMode, theme, setTheme } = useStore();
  const userTrade = getTrade(user?.trade || 'it');
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tickets', icon: Ticket, label: 'Tickets' },
    { id: 'assets', icon: Wrench, label: 'Assets' },
    { id: 'trades', icon: HardHat, label: 'Trades' },
    { id: 'maps', icon: Map, label: 'Maps' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  if (user?.role === 'manager') {
    tabs.splice(tabs.length - 1, 0, { id: 'time', icon: LayoutGrid, label: 'Time' });
  }

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm z-50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900">
                <span className="font-bold tracking-tighter">FT</span>
              </div>
              <div>
                <h2 className="font-bold text-neutral-900 dark:text-white leading-none">Field Tech</h2>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1 truncate max-w-[140px]">
                  {user?.orgCode} · {userTrade.shortCode}
                </p>
              </div>
            </div>
          </div>

          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2.5 text-xs font-bold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <QrCode className="h-4 w-4" />
              Scan Equipment QR
            </button>
          )}

          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-95 whitespace-nowrap ${
                    isActive 
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-lg' 
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white dark:text-neutral-900' : 'text-neutral-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="mt-auto p-6 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex w-full items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <div className="flex items-center gap-2">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 capitalize">{theme} Mode</span>
            </div>
            <div className={`h-5 w-5 rounded-full transition-all flex items-center justify-center ${theme === 'dark' ? 'bg-amber-400' : 'bg-neutral-300'}`}>
               <div className="h-3 w-3 rounded-full bg-white" />
            </div>
          </button>

          {user?.role === 'manager' && (
            <button 
              onClick={() => setDispatcherMode(!dispatcherMode)}
              className="flex w-full items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 group"
            >
              <div className="text-left">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Dispatcher Mode</p>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">{dispatcherMode ? 'Active' : 'Switch'}</p>
              </div>
              {dispatcherMode ? (
                <ToggleRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-400" />
              )}
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300">
              {user?.displayName?.[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{user?.displayName}</p>
              <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <main className="flex-1 overflow-y-auto safe-top pb-24 md:pb-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 md:p-8 max-w-7xl mx-auto w-full"
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg safe-bottom">
          <div className="flex justify-around items-center h-16 px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full gap-1 transition-colors ${
                    isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
                  }`}
                >
                  <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[9px] font-semibold tracking-tight whitespace-nowrap truncate max-w-full px-0.5">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
