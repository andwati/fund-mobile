import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Contribution } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { AppText } from '@/components/ui/text';
import { useFund } from '@/fund/context';
import { useOutbox } from '@/fund/outbox';
import { fmtLong, fmtMonth, money } from '@/lib/format';

type Row = { type: 'header'; key: string; title: string } | { type: 'entry'; key: string; entry: Contribution };

export default function Contributions() {
  const insets = useSafeAreaInsets();
  const { payload, currency, canEdit, fundId, refresh, refreshing } = useFund();
  const { entries: queued, remove } = useOutbox();

  const names = useMemo(() => new Map(payload.items.map((item) => [item.id, item.name])), [payload.items]);
  const waiting = useMemo(() => new Set(queued.filter((e) => e.status === 'pending').map((e) => e.id)), [queued]);
  const failed = queued.filter((e) => e.status === 'failed' && e.fundId === fundId);

  const rows = useMemo<Row[]>(() => {
    // Newest first; the API lists oldest first and keeps same-day entries in the order they were logged.
    const list = [...payload.contributions].reverse().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const out: Row[] = [];
    let month = '';
    for (const entry of list) {
      const title = fmtMonth(entry.date);
      if (title !== month) {
        month = title;
        out.push({ type: 'header', key: `h:${title}`, title });
      }
      out.push({ type: 'entry', key: entry.id, entry });
    }
    return out;
  }, [payload.contributions]);

  const header = (
    <View className="gap-5 pb-4">
      <View className="gap-1">
        <AppText variant="title" accessibilityRole="header">
          Contributions
        </AppText>
        <AppText tone="muted">Money you set aside, and money you took out.</AppText>
      </View>
      {canEdit ? <Button title="Log money" block onPress={() => router.push('/contribution/new')} /> : null}
      {failed.map((e) => (
        <Card key={e.id} className="border-destructive">
          <AppText className="font-semibold">Not saved</AppText>
          <AppText variant="caption" tone="muted">
            {fmtLong(e.date, true)} · {money(currency, e.allocations.reduce((s, l) => s + l.amount, 0))}. {e.error}
          </AppText>
          <Button title="Remove" variant="secondary" onPress={() => remove(e.id)} />
        </Card>
      ))}
    </View>
  );

  return (
    <FlatList
      className="flex-1 bg-background"
      data={rows}
      keyExtractor={(row) => row.key}
      ListHeaderComponent={header}
      ListEmptyComponent={<Notice title="No entries yet">When you set money aside for your items, it shows up here.</Notice>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120, paddingHorizontal: 20, maxWidth: 640, width: '100%', alignSelf: 'center' }}
      renderItem={({ item: row }) =>
        row.type === 'header' ? (
          <AppText variant="label" tone="muted" className="pb-1 pt-4">
            {row.title}
          </AppText>
        ) : (
          <EntryRow entry={row.entry} names={names} currency={currency} waiting={waiting.has(row.entry.id)} />
        )
      }
    />
  );
}

function EntryRow({ entry, names, currency, waiting }: { entry: Contribution; names: Map<string, string>; currency: string; waiting: boolean }) {
  const total = entry.allocations.reduce((sum, line) => sum + line.amount, 0);
  const out = entry.kind === 'withdrawal';
  const summary = entry.allocations.map((line) => `${names.get(line.itemId) ?? 'Item'} ${money(currency, line.amount)}`).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${out ? 'Withdrawal' : 'Deposit'} of ${money(currency, total)} on ${fmtLong(entry.date, true)}`}
      disabled={waiting}
      onPress={() => router.push({ pathname: '/contribution/[id]', params: { id: entry.id } })}
      className="gap-1 border-b border-border py-3">
      <View className="flex-row items-baseline justify-between gap-3">
        <AppText className="font-semibold">{fmtLong(entry.date, true)}</AppText>
        <AppText variant="body" tone={out ? 'warning' : 'default'} className="font-semibold" numeric>
          {out ? '−' : '+'}
          {money(currency, total)}
        </AppText>
      </View>
      {entry.note ? <AppText tone="muted">{entry.note}</AppText> : null}
      <AppText variant="caption" tone="muted" numberOfLines={2}>
        {summary}
      </AppText>
      {waiting ? (
        <AppText variant="caption" tone="warning" className="font-medium">
          Waiting to sync
        </AppText>
      ) : null}
    </Pressable>
  );
}
