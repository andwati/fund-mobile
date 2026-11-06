import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { call, client, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { SessionResponse, User } from '@/api/types';
import { queryClient } from '@/lib/query';
import * as storage from '@/lib/storage';

const TOKEN_KEY = 'fund.token';
const USER_KEY = 'fund.user';

type Status = 'loading' | 'signed-out' | 'signed-in';

type SessionValue = {
  status: Status;
  user: User | null;
  /** Adopt a session returned by sign-in, sign-up, email verification or invite sign-up. */
  signIn: (session: { token: string; user: User }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-read the user from the server (after verifying an email, changing a name, ...). */
  refreshUser: () => Promise<User | null>;
  setUser: (user: User) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/** The signed-in user. Only call below the signed-in guard. */
export function useUser(): User {
  const { user } = useSession();
  if (!user) throw new Error('No signed-in user');
  return user;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);

  const clear = useCallback(async () => {
    setAuthToken(null);
    setUserState(null);
    setStatus('signed-out');
    queryClient.clear();
    await Promise.all([storage.removeItem(TOKEN_KEY), storage.removeItem(USER_KEY)]).catch(() => {});
  }, []);

  const signIn = useCallback(async (session: { token: string; user: User }) => {
    setAuthToken(session.token);
    await Promise.all([
      storage.setItem(TOKEN_KEY, session.token),
      storage.setItem(USER_KEY, JSON.stringify(session.user)),
    ]).catch(() => {});
    setUserState(session.user);
    setStatus('signed-in');
  }, []);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    storage.setItem(USER_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    try {
      await call(client.POST('/auth/sign-out'));
    } catch {
      // Signing out locally is what matters; an offline or already-expired session is fine.
    }
    await clear();
  }, [clear]);

  const refreshUser = useCallback(async () => {
    try {
      const res: SessionResponse = await call(client.GET('/auth/session'));
      setUser(res.user);
      return res.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await clear();
      return null;
    }
  }, [clear, setUser]);

  // Expired or revoked sessions sign the person out wherever the API says 401.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clear();
    });
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  // Restore the stored session once. Offline starts keep the cached user so the app still opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [token, cachedUser] = await Promise.all([storage.getItem(TOKEN_KEY), storage.getItem(USER_KEY)]);
      if (cancelled) return;
      if (!token) {
        setStatus('signed-out');
        return;
      }
      setAuthToken(token);
      try {
        const res = await call(client.GET('/auth/session'));
        if (cancelled) return;
        setUserState(res.user);
        setStatus('signed-in');
        storage.setItem(USER_KEY, JSON.stringify(res.user)).catch(() => {});
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 0 && cachedUser) {
          setUserState(JSON.parse(cachedUser) as User);
          setStatus('signed-in');
        } else {
          await clear();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clear]);

  const value = useMemo(
    () => ({ status, user, signIn, signOut, refreshUser, setUser }),
    [status, user, signIn, signOut, refreshUser, setUser],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
