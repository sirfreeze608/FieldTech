import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp, limit, orderBy } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export interface TimeEntry {
  id: string;
  userId: string;
  orgCode: string;
  clockIn: Timestamp;
  clockOut?: Timestamp;
  status: 'active' | 'completed';
}

export function useClock() {
  const { user } = useStore();
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || user?.orgCode === undefined) return;

    try {
      const q = query(
        collection(db, 'timeEntries'),
        where('userId', '==', user.uid),
        where('orgCode', '==', user.orgCode),
        where('status', '==', 'active'),
        orderBy('clockIn', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const entry = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TimeEntry;
          setActiveEntry(entry);
        } else {
          setActiveEntry(null);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'timeEntries');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Query Error (Clock):", err, { user: user.uid, orgCode: user.orgCode });
      setLoading(false);
    }
  }, [user]);

  const clockIn = async () => {
    if (!user || activeEntry) return;

    try {
      await addDoc(collection(db, 'timeEntries'), {
        userId: user.uid,
        orgCode: user.orgCode,
        clockIn: Timestamp.now(),
        status: 'active',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'timeEntries');
    }
  };

  const clockOut = async () => {
    if (!activeEntry) return;

    try {
      await updateDoc(doc(db, 'timeEntries', activeEntry.id), {
        clockOut: Timestamp.now(),
        status: 'completed',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'timeEntries');
    }
  };

  return { activeEntry, loading, clockIn, clockOut };
}
