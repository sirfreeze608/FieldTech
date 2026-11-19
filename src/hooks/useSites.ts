import { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, Timestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export interface Site {
  id: string;
  name: string;
  address: string;
  orgCode: string;
  location?: { lat: number; lng: number };
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  atmosphericData?: {
    temp: number;
    humidity: number;
    wind: string;
    updatedAt: string;
    updatedBy: string;
  };
}

export function useSites(orgCode?: string) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgCode) return;

    const q = query(
      collection(db, 'sites'),
      where('orgCode', '==', orgCode),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sites');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgCode]);

  return { sites, loading };
}
