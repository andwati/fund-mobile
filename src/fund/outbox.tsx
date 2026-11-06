import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { call, client } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { FundPayload } from '@/api/types';
import { readJson, removeKey, writeJson } from '@/lib/kv';
import { queryClient } from '@/lib/query';

const KEY = 'fund.outbox';
const SYNC_INTERVAL_MS = 30_000;

export type OutboxLine = { itemId: string; amount: number };

/** A deposit logged without a connection. `id` is also the idempotency key sent to the server. */
export type OutboxEntry = {
  id: string;
  fundId: string;
  date: string;
  note: string;
  allocations: OutboxLine[];
  createdAt: number;
  status: 'pending' | 'failed';
  /** The server's reason, when `status` is "failed". */
  error?: string;
};

type OutboxValue = {
  entries: OutboxEntry[];
  enqueue: (entry: Omit<OutboxEntry, 'createdAt' | 'status'>) => void;
  remove: (id: string) => void;
  /** Try to sync now (also runs on foreground, on a timer, and right after queueing). */
  sync: () => Promise<void>;
};

const OutboxContext = createContext<OutboxValue | null>(null);

export function useOutbox(): OutboxValue {
  const value = useContext(OutboxContext);
  if (!value) throw new Error('useOutbox must be used inside OutboxProvider');
  return value;
}

/**
 * The fund as it will look once the queued entries sync: each pending entry for this fund is added as a
 * deposit, so progress and the chart move at once. Failed entries are not applied.
 */
export function withPending(payload: FundPayload, pending: OutboxEntry[]): FundPayload {
  const known = new Set(payload.contributions.map((entry) => entry.id));
  const extra = pending
    .filter((entry) => entry.status === 'pending' && entry.fundId === payload.fund.id && !known.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      note: entry.note,
      kind: 'deposit' as const,
      allocations: entry.allocations.map((line, index) => ({ id: `${entry.id}:${index}`, itemId: line.itemId, amount: line.amount })),
    }));
  if (extra.length === 0) return payload;
  return {
    ...payload,
    // Oldest date first, like the server; the sort is stable so same-day entries keep their logging order.
    contributions: [...payload.contributions, ...extra].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
  };
}

export function OutboxProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const loaded = useRef(false);
  const syncing = useRef(false);
  // Mirrors `entries` for async code (sync loops) that must not read a stale closure; updated wherever state changes.
  const latest = useRef<OutboxEntry[]>([]);

  const persist = useCallback((next: OutboxEntry[]) => {
    latest.current = next;
    setEntries(next);
    if (next.length === 0) void removeKey(KEY);
    else void writeJson(KEY, next);
  }, []);

  useEffect(() => {
    readJson<OutboxEntry[]>(KEY).then((stored) => {
      loaded.current = true;
      if (stored?.length) {
        latest.current = stored;
        setEntries(stored);
      }
    });
  }, []);

  const sync = useCallback(async () => {
    if (syncing.current || !loaded.current) return;
    syncing.current = true;
    try {
      for (const entry of latest.current.filter((e) => e.status === 'pending')) {
        try {
          const res = await call(
            client.POST('/funds/{fundId}/contributions', {
              params: { path: { fundId: entry.fundId } },
              body: { id: entry.id, date: entry.date, note: entry.note, allocations: entry.allocations },
            }),
          );
          queryClient.setQueryData(['fund', entry.fundId], res.payload);
          queryClient.setQueryData(['funds'], res.payload.funds);
          persist(latest.current.filter((e) => e.id !== entry.id));
        } catch (error) {
          if (!(error instanceof ApiError)) throw error;
          // 401 pauses the queue (the session handler signs out); network/5xx stay pending for a later try.
          if (error.status === 401 || error.retryable) break;
          // Any other 4xx will never succeed as sent: keep it visible so the person can remove it.
          persist(latest.current.map((e) => (e.id === entry.id ? { ...e, status: 'failed', error: error.message } : e)));
        }
      }
    } finally {
      syncing.current = false;
    }
  }, [persist]);

  const enqueue = useCallback(
    (entry: Omit<OutboxEntry, 'createdAt' | 'status'>) => {
      persist([...latest.current, { ...entry, createdAt: Date.now(), status: 'pending' }]);
      void sync();
    },
    [persist, sync],
  );

  const remove = useCallback((id: string) => persist(latest.current.filter((e) => e.id !== id)), [persist]);

  // Sync once loaded, whenever the app comes to the foreground, and on a timer while something is waiting.
  useEffect(() => {
    const timer = setTimeout(() => void sync(), 500);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [sync]);

  const waiting = entries.some((e) => e.status === 'pending');
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => void sync(), SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [waiting, sync]);

  const value = useMemo(() => ({ entries, enqueue, remove, sync }), [entries, enqueue, remove, sync]);
  return <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>;
}
