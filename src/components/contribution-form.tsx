import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { ApiError, errorMessage } from '@/api/errors';
import type { Contribution } from '@/api/types';
import { useFund } from '@/fund/context';
import { useOutbox } from '@/fund/outbox';
import { confirm } from '@/lib/confirm';
import { digitsOnly, isIsoDate, money } from '@/lib/format';
import { todayIn } from '@/lib/plan';

import { Button } from './ui/button';
import { DateField } from './ui/date-field';
import { Notice } from './ui/notice';
import { Pressable } from './ui/pressable';
import { AppText } from './ui/text';
import { TextField } from './ui/text-field';

type Kind = 'deposit' | 'withdrawal';

/** Log, edit or delete a deposit or withdrawal across the items. Deposits made offline are queued and synced later. */
export function ContributionForm({ contribution }: { contribution?: Contribution }) {
  const { fundId, payload, progress, currency, commit, canEdit } = useFund();
  const { enqueue } = useOutbox();
  const editing = !!contribution;
  // One id per form: a double tap or a retry after a dropped connection can never save the entry twice.
  const newId = useRef(Crypto.randomUUID());

  const today = todayIn(payload.fund.timezone);
  const [kind, setKind] = useState<Kind>(contribution?.kind ?? 'deposit');
  const [date, setDate] = useState(contribution?.date ?? today);
  const [note, setNote] = useState(contribution?.note ?? '');
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries((contribution?.allocations ?? []).map((line) => [line.itemId, String(line.amount)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active items, plus any item this entry already has lines on (an edit keeps them even if purchased since).
  const rows = useMemo(() => {
    const existing = new Set((contribution?.allocations ?? []).map((l) => l.itemId));
    return payload.items
      .filter((entry) => !entry.archived || existing.has(entry.id))
      .map((entry) => ({ item: entry, plan: progress.items.find((p) => p.id === entry.id) }));
  }, [payload.items, progress.items, contribution]);

  const lines = rows
    .map(({ item }) => ({ itemId: item.id, amount: Number(amounts[item.id] ?? 0) }))
    .filter((line) => line.amount > 0);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  function fillNeeded() {
    const next: Record<string, string> = {};
    for (const { item, plan } of rows) {
      const needed = plan ? Math.ceil(plan.needed) : 0;
      if (needed > 0 && !item.archived) next[item.id] = String(needed);
    }
    setAmounts(next);
  }

  async function submit() {
    if (!isIsoDate(date)) return setError('Pick a date.');
    if (date > today) return setError('The date cannot be later than today.');
    if (lines.length === 0) return setError('Enter an amount for at least one item.');
    setBusy(true);
    setError(null);
    const body = { id: editing ? undefined : newId.current, date, note: note.trim(), kind, allocations: lines };
    try {
      const res = editing
        ? await call(client.PATCH('/funds/{fundId}/contributions/{contributionId}', { params: { path: { fundId, contributionId: contribution.id } }, body }))
        : await call(client.POST('/funds/{fundId}/contributions', { params: { path: { fundId } }, body }));
      commit(res.payload);
      router.back();
    } catch (e) {
      // No connection (or the server is down): a new deposit is kept on the device and synced later.
      if (!editing && kind === 'deposit' && e instanceof ApiError && e.retryable) {
        enqueue({ id: newId.current, fundId, date, note: note.trim(), allocations: lines });
        router.back();
        return;
      }
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function remove() {
    if (!contribution) return;
    const sure = await confirm('Delete this entry?', 'It will be removed from your savings. This cannot be undone.', 'Delete');
    if (!sure) return;
    setBusy(true);
    setError(null);
    try {
      const res = await call(client.DELETE('/funds/{fundId}/contributions/{contributionId}', { params: { path: { fundId, contributionId: contribution.id } } }));
      commit(res.payload);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <View className="gap-4">
      {error ? <Notice kind="error">{error}</Notice> : null}

      <View className="flex-row rounded-control border border-border bg-surface p-1" accessibilityRole="radiogroup">
        {(['deposit', 'withdrawal'] as const).map((k) => (
          <Pressable
            key={k}
            accessibilityRole="radio"
            accessibilityState={{ selected: kind === k }}
            disabled={!canEdit}
            onPress={() => setKind(k)}
            className={`min-h-10 flex-1 items-center justify-center rounded-control ${kind === k ? 'bg-accent' : ''}`}>
            <AppText variant="caption" tone={kind === k ? 'onAccent' : 'muted'} className="font-semibold">
              {k === 'deposit' ? 'Set aside' : 'Took out'}
            </AppText>
          </Pressable>
        ))}
      </View>

      <DateField label={kind === 'deposit' ? 'Date set aside' : 'Date taken out'} value={date} onChange={setDate} maximumDate={new Date()} />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} maxLength={80} editable={canEdit} />

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <AppText variant="label" tone="muted">
            Split across items
          </AppText>
          {kind === 'deposit' && canEdit ? <Button title="Fill what is needed" variant="ghost" onPress={fillNeeded} /> : null}
        </View>
        {rows.length === 0 ? <Notice>Add an item first, then you can log money against it.</Notice> : null}
        {rows.map(({ item, plan }) => (
          <View key={item.id} className="flex-row items-center gap-3 rounded-control border border-border bg-surface px-4 py-2">
            <View className="flex-1">
              <AppText className="font-medium" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="caption" tone="muted" numeric>
                {plan ? `Holds ${money(currency, plan.contributed)}` : 'Purchased'}
                {kind === 'deposit' && plan && plan.needed > 0 ? ` · needs ${money(currency, Math.ceil(plan.needed))}` : ''}
              </AppText>
            </View>
            <View className="w-28">
              <TextField
                label=""
                accessibilityLabel={`Amount for ${item.name}`}
                value={amounts[item.id] ?? ''}
                onChangeText={(t) => setAmounts((prev) => ({ ...prev, [item.id]: digitsOnly(t) }))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="0"
                editable={canEdit}
              />
            </View>
          </View>
        ))}
        <View className="flex-row items-center justify-between px-1">
          <AppText tone="muted">Total</AppText>
          <AppText variant="headline" numeric>
            {money(currency, total)}
          </AppText>
        </View>
      </View>

      {canEdit ? (
        <View className="gap-3">
          <Button title={editing ? 'Save changes' : kind === 'deposit' ? 'Log it' : 'Log withdrawal'} block loading={busy} disabled={total <= 0} onPress={submit} />
          {editing ? <Button title="Delete entry" variant="destructive" block disabled={busy} onPress={remove} /> : null}
        </View>
      ) : (
        <Notice>You can view this fund but not change it.</Notice>
      )}
    </View>
  );
}
