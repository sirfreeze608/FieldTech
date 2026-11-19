import { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, Timestamp } from '../lib/firebase';

export interface WorkLog {
  id: string;
  ticketId: string;
  technicianId: string;
  comment: string;
  photoUrl?: string;
  createdAt: Timestamp;
}

export function useWorkLogs(ticketId: string, orgCode?: string) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId || orgCode === undefined) return;

    try {
      const q = query(
        collection(db, 'workLogs'),
        where('orgCode', '==', orgCode),
        where('ticketId', '==', ticketId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkLog));
        setLogs(docs);
        setLoading(false);
      }, (error) => {
        console.error("Firestore Error (WorkLogs):", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Query Error (WorkLogs):", err, { orgCode, ticketId });
      setLoading(false);
    }
  }, [ticketId, orgCode]);

  return { logs, loading };
}
