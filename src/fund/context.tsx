import { useQuery } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import type { FundPayload, FundSummary } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { compute, type FundProgress, scheduleOf } from '@/lib/plan';
import { queryClient } from '@/lib/query';
import { useOutbox, withPending } from './outbox';
import * as storage from '@/lib/storage';

export const LAST_FUND_KEY = 'fund.last';

/** Archived items are out of the plan, and so is the money allocated to them. */
export function planFor(payload: FundPayload, now = new Date()): FundProgress {
  const active = payload.items.filter((entry) => !entry.archived);
  const ids = new Set(active.map((entry) => entry.id));
  return compute({
    schedule: scheduleOf(payload.fund, payload.skips, payload.adjustments),
    pace: payload.fund.pace,
    timezone: payload.fund.timezone,
    now,
    items: active,
    contributions: payload.contributions.map((entry) => ({
      ...entry,
      allocations: entry.allocations.filter((line) => ids.has(line.itemId)),
    })),
  });
}

type FundContextValue = {
  fundId: string;
  payload: FundPayload;
  progress: FundProgress;
  currency: string;
  /** Editors and the owner can change the fund's contents; viewers only read. */
  canEdit: boolean;
  isOwner: boolean;
  funds: FundSummary[];
  switchFund: (id: string) => void;
  /** Swap in a payload the server returned from a mutation (every mutation returns the fresh fund). */
  commit: (payload: FundPayload) => void;
  refresh: () => Promise<void>;
  refreshing: boolean;
};

const FundContext = createContext<FundContextValue | null>(null);

export function useFund(): FundContextValue {
  const value = useContext(FundContext);
  if (!value) throw new Error('useFund must be used inside FundProvider');
  return value;
}

export const fundKey = (id: string) => ['fund', id] as const;

/** Drop a fund that was deleted or left, and refetch the list (which may now create a fresh default fund). */
export async function forgetFund(id: string) {
  queryClient.removeQueries({ queryKey: fundKey(id) });
  await queryClient.invalidateQueries({ queryKey: ['funds'] });
}

/** Loads the fund list, picks the last-used fund and keeps its payload fresh. */
export function FundProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<string | null | undefined>(undefined); // undefined = still reading storage
  const list = useQuery({ queryKey: ['funds'], queryFn: async () => (await call(client.GET('/funds'))).funds });

  useEffect(() => {
    let cancelled = false;
    storage.getItem(LAST_FUND_KEY).then((id) => {
      if (!cancelled) setChosen(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const funds = list.data;
  const fundId = useMemo(() => {
    if (!funds || chosen === undefined) return null;
    return funds.find((f) => f.id === chosen)?.id ?? funds[0]?.id ?? null;
  }, [funds, chosen]);

  const switchFund = useCallback((id: string) => {
    setChosen(id);
    storage.setItem(LAST_FUND_KEY, id).catch(() => {});
  }, []);

  const detail = useQuery({
    queryKey: fundKey(fundId ?? 'none'),
    enabled: fundId !== null,
    queryFn: async () =>
      (await call(client.GET('/funds/{fundId}', { params: { path: { fundId: fundId! } } }))).payload,
  });

  const commit = useCallback((payload: FundPayload) => {
    queryClient.setQueryData(fundKey(payload.fund.id), payload);
    queryClient.setQueryData(['funds'], payload.funds);
  }, []);

  // What the screens show: the server's fund plus deposits still waiting to sync.
  const { entries: queued } = useOutbox();
  const payload = useMemo(() => (detail.data ? withPending(detail.data, queued) : undefined), [detail.data, queued]);
  const progress = useMemo(() => (payload ? planFor(payload) : null), [payload]);

  const refresh = useCallback(async () => {
    await Promise.all([list.refetch(), detail.refetch()]);
  }, [list, detail]);

  if (list.isError || detail.isError) {
    const error = list.error ?? detail.error;
    return (
      <Screen title="Could not load your fund">
        <Notice kind="error">{errorMessage(error)}</Notice>
        <Button title="Try again" block onPress={() => void refresh()} />
      </Screen>
    );
  }

  if (!payload || !progress || !fundId || !funds) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  const canEdit = payload.role !== 'viewer';
  const value: FundContextValue = {
    fundId,
    payload,
    progress,
    currency: payload.fund.currency,
    canEdit,
    isOwner: payload.role === 'owner',
    funds: payload.funds,
    switchFund,
    commit,
    refresh,
    refreshing: detail.isRefetching,
  };
  return <FundContext.Provider value={value}>{children}</FundContext.Provider>;
}
