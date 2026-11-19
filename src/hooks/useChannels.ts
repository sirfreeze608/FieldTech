import { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, Timestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
  orgCode: string;
  memberIds?: string[];
  createdBy: string;
  createdAt: Timestamp;
}

export function useChannels(orgCode?: string, userId?: string) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgCode || !userId) return;

    // We fetch public channels and private channels where user is a member
    // Since Firestore doesn't support OR between disparate filters easily without complex indexes,
    // we'll fetch all channels in the org and filter client-side for now, or use two queries.
    // Given security rules enforce this anyway, fetching all in the org is safe and will be filtered by the rules on read if we are not careful.
    // Actually, to avoid "Missing or insufficient permissions" on a LIST query, 
    // we should ideally query specifically for what we are allowed to see.
    
    // For simplicity and to satisfy the "member restrictions" requirement:
    // Query 1: Public channels in org
    // Query 2: Private channels where memberIds contains userId
    
    const publicQuery = query(
      collection(db, 'channels'),
      where('orgCode', '==', orgCode),
      where('type', '==', 'public'),
      orderBy('createdAt', 'desc')
    );

    const privateQuery = query(
      collection(db, 'channels'),
      where('orgCode', '==', orgCode),
      where('type', '==', 'private'),
      where('memberIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    let publicChannels: Channel[] = [];
    let privateChannels: Channel[] = [];

    const updateState = () => {
      const combined = [...publicChannels, ...privateChannels].sort((a, b) => 
        b.createdAt.toMillis() - a.createdAt.toMillis()
      );
      setChannels(combined);
      setLoading(false);
    };

    const unsubPublic = onSnapshot(publicQuery, (snapshot) => {
      publicChannels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
      updateState();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'channels/public');
      setLoading(false);
    });

    const unsubPrivate = onSnapshot(privateQuery, (snapshot) => {
      privateChannels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
      updateState();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'channels/private');
      setLoading(false);
    });

    return () => {
      unsubPublic();
      unsubPrivate();
    };
  }, [orgCode, userId]);

  return { channels, loading };
}
