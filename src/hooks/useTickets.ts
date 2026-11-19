import { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, Timestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

import type { TradeId } from '../lib/trades';

export interface TicketMaterial {
  name: string;
  quantity: string;
  unit: string;
  addedBy: string;
  addedAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  trade?: TradeId;
  category: string;
  siteId: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  slaDeadline?: Timestamp;
  permitRequired?: boolean;
  materials?: TicketMaterial[];
  assetId?: string | null;
}

export function useTickets(userId?: string, orgCode?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgCode === undefined) return;

    try {
      let q = query(
        collection(db, 'tickets'), 
        where('orgCode', '==', orgCode),
        orderBy('createdAt', 'desc')
      );
      
      if (userId !== undefined && userId !== null) {
        q = query(
          collection(db, 'tickets'), 
          where('orgCode', '==', orgCode),
          where('assignedTo', '==', userId), 
          orderBy('createdAt', 'desc')
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
        setTickets(docs);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tickets');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Query Error (Tickets):", err, { orgCode, userId });
      setLoading(false);
    }
  }, [userId, orgCode]);

  return { tickets, loading };
}
