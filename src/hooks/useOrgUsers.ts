import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, doc, updateDoc } from '../lib/firebase';
import { useStore } from '../store/useStore';

import type { TradeId } from '../lib/trades';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'technician' | 'dispatcher' | 'manager';
  trade?: TradeId;
  skills?: string[];
  orgCode: string;
  location?: { 
    lat: number; 
    lng: number; 
    updatedAt: string;
  };
  lastActive: string;
}

export function useLocationTracking() {
  const { user } = useStore();

  useEffect(() => {
    if (!user || user.role !== 'technician') return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              updatedAt: new Date().toISOString(),
            },
            lastActive: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Location update failed:", error);
        }
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);
}

export function useOrgUsers(orgCode?: string) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgCode) return;

    const q = query(
      collection(db, 'users'),
      where('orgCode', '==', orgCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error (Org Users):", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgCode]);

  return { users, loading };
}
