import { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, Timestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

import type { TradeId } from '../lib/trades';

export interface Task {
  id: string;
  orgCode: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  trade?: TradeId;
  assignedTo: string;
  ticketId?: string;
  siteId?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export function useTasks(ticketId?: string, orgCode?: string, assignedTo?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgCode) return;

    let q = query(
      collection(db, 'tasks'),
      where('orgCode', '==', orgCode),
      orderBy('createdAt', 'desc')
    );

    if (ticketId) {
      q = query(q, where('ticketId', '==', ticketId));
    } else if (assignedTo) {
      q = query(q, where('assignedTo', '==', assignedTo));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgCode, ticketId, assignedTo]);

  return { tasks, loading };
}
