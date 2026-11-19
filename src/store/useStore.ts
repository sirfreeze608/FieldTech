import { create } from 'zustand';
import type { TradeId } from '../lib/trades';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  address?: string;
  orgCode: string;
  role: 'technician' | 'dispatcher' | 'manager';
  trade?: TradeId;
  skills: string[];
  location?: { lat: number; lng: number };
}

interface AppState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isAuthReady: boolean;
  setAuthReady: (ready: boolean) => void;
  dispatcherMode: boolean;
  setDispatcherMode: (mode: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isAuthReady: false,
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  dispatcherMode: false,
  setDispatcherMode: (mode) => set({ dispatcherMode: mode }),
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
}));
