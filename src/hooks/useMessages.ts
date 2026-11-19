import { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, Timestamp, limit } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  channelId: string;
  createdAt: Timestamp;
}

export function useMessages(channelId: string, orgCode?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId || orgCode === undefined) return;

    try {
      const q = query(
        collection(db, 'messages'),
        where('orgCode', '==', orgCode),
        where('channelId', '==', channelId),
        orderBy('createdAt', 'asc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(docs);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'messages');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Query Error (Messages):", err, { orgCode, channelId });
      setLoading(false);
    }
  }, [channelId, orgCode]);

  return { messages, loading };
}
