import React, { useEffect } from 'react';
import { auth, signIn, db, getDoc, doc, setDoc } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useStore } from '../store/useStore';
import { LogIn, Loader2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, setUser, isAuthReady, setAuthReady } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              displayName: data.displayName || firebaseUser.displayName || 'Technician',
              email: data.email || firebaseUser.email || '',
              orgCode: data.orgCode || 'DEFAULT',
              role: data.role || 'technician',
              trade: data.trade || 'general',
              skills: data.skills || [],
              ...data,
            } as any);
          } else {
            const newUser = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Technician',
              email: firebaseUser.email || '',
              orgCode: 'DEFAULT', // Default organization for new signups
              role: 'technician',
              trade: 'general',
              skills: [],
              lastActive: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser as any);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, firebaseUser ? `users/${firebaseUser.uid}` : 'users');
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [setUser, setAuthReady]);

  if (!isAuthReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950 text-center">
        <div className="mb-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-6 shadow-xl shadow-neutral-200/50 dark:shadow-none">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Field Tech</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Multi-Trade Field Operations & Collaboration</p>
        </div>
        <button
          onClick={signIn}
          className="flex w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 px-6 py-4 text-lg font-semibold text-white dark:text-neutral-900 transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98]"
        >
          <LogIn className="h-5 w-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
