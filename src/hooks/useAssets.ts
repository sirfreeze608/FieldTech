import { useEffect, useState } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, Timestamp } from '../lib/firebase';
import { TradeId } from '../lib/trades';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export type AssetStatus = 'operational' | 'needs-service' | 'out-of-service' | 'retired';

export interface Asset {
  id: string;
  orgCode: string;
  name: string;
  assetTag?: string;
  qrCode?: string;
  type: string;
  trade?: TradeId;
  siteId: string;
  locationId?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status: AssetStatus;
  linkedTicketId?: string | null;
  lastServicedAt?: string | null;
  nextServiceDue?: string | null;
  notes?: string;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export function useAssets(orgCode?: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgCode) {
      setAssets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'assets'),
      where('orgCode', '==', orgCode),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAssets(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Asset)));
        setLoading(false);
      },
      (error) => {
        // Fallback if composite index on (orgCode, name) is not built yet
        console.warn('Assets query fallback:', error);
        const fallbackQ = query(collection(db, 'assets'), where('orgCode', '==', orgCode));
        onSnapshot(
          fallbackQ,
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Asset));
            list.sort((a, b) => a.name.localeCompare(b.name));
            setAssets(list);
            setLoading(false);
          },
          (err2) => {
            handleFirestoreError(err2, OperationType.LIST, 'assets');
            setLoading(false);
          }
        );
      }
    );

    return () => unsubscribe();
  }, [orgCode]);

  return { assets, loading };
}
