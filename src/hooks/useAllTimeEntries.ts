import { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, Timestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export interface TimeEntry {
  id: string;
  uid?: string;
  userId?: string;
  orgCode: string;
  clockIn: Timestamp;
  clockOut?: Timestamp;
  totalMinutes?: number;
}

export function useAllTimeEntries(orgCode?: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgCode) return;

    const q = query(
      collection(db, 'timeEntries'),
      where('orgCode', '==', orgCode),
      orderBy('clockIn', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'timeEntries');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgCode]);

  return { entries, loading };
}
