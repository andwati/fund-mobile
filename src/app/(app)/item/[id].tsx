import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { ItemForm } from '@/components/item-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useFund } from '@/fund/context';
import { useAction } from '@/fund/use-action';
import { confirm } from '@/lib/confirm';
import { digitsOnly, fmtDate, isIsoDate, money } from '@/lib/format';
import { todayIn } from '@/lib/plan';

export default function ItemSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { payload, fundId, canEdit, currency } = useFund();
  const item = payload.items.find((entry) => entry.id === id);
  const { run, busy, error } = useAction();
  const [buying, setBuying] = useState(false);
  const [paid, setPaid] = useState('');
  const [boughtOn, setBoughtOn] = useState(todayIn(payload.fund.timezone));

  if (!item) {
    return (
      <Screen title="Item" header>
        <Notice>That item is gone.</Notice>
        <Button title="Close" variant="secondary" block onPress={() => router.back()} />
      </Screen>
    );
  }

  const path = { fundId, itemId: item.id };
  const active = payload.items.filter((entry) => !entry.archived);
  const position = active.findIndex((entry) => entry.id === item.id);

  async function remove() {
    const sure = await confirm('Delete this item?', `${item!.name} will be removed. This cannot be undone.`, 'Delete');
    if (!sure) return;
    const ok = await run(() => call(client.DELETE('/funds/{fundId}/items/{itemId}', { params: { path } })));
    if (ok) router.back();
  }

  async function markPurchased() {
    if (!paid || Number(paid) <= 0) return;
    const ok = await run(() =>
      call(client.POST('/funds/{fundId}/items/{itemId}/archive', { params: { path }, body: { archived: true, purchase: { actualPrice: Number(paid), purchasedOn: boughtOn } } })),
    );
    if (ok) router.back();
  }

  async function restore() {
    const ok = await run(() => call(client.POST('/funds/{fundId}/items/{itemId}/archive', { params: { path }, body: { archived: false } })));
    if (ok) router.back();
  }

  const move = (direction: 'up' | 'down') =>
    void run(() => call(client.POST('/funds/{fundId}/items/{itemId}/move', { params: { path }, body: { direction } })));

  if (item.archived) {
    return (
      <Screen title={item.name} subtitle="Purchased" header>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Card>
          <AppText tone="muted">Planned price {money(currency, item.price)}</AppText>
          <AppText variant="headline" numeric>
            Paid {item.actualPrice !== null ? money(currency, item.actualPrice) : '—'}
          </AppText>
          {item.purchasedOn ? <AppText tone="muted">Bought {fmtDate(item.purchasedOn, true)}</AppText> : null}
        </Card>
        {canEdit ? (
          <View className="gap-3">
            <Button title="Back into the plan" block loading={busy} onPress={restore} />
            <Button title="Delete item" variant="destructive" block disabled={busy} onPress={remove} />
          </View>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen title={canEdit ? 'Edit item' : item.name} header>
      <ItemForm item={item} />
      {error ? <Notice kind="error">{error}</Notice> : null}

      {canEdit ? (
        <View className="gap-3">
          {buying ? (
            <Card>
              <AppText variant="headline">Mark as purchased</AppText>
              <TextField label={`What you paid (${currency})`} value={paid} onChangeText={(t) => setPaid(digitsOnly(t))} keyboardType="number-pad" maxLength={10} autoFocus />
              <DateField label="Bought on" value={boughtOn} onChange={setBoughtOn} maximumDate={new Date()} />
              <Button title="Confirm purchase" block loading={busy} disabled={!paid || !isIsoDate(boughtOn)} onPress={markPurchased} />
              <Button title="Cancel" variant="ghost" center onPress={() => setBuying(false)} />
            </Card>
          ) : (
            <Button title="Mark as purchased" variant="secondary" block onPress={() => setBuying(true)} />
          )}
          <View className="flex-row gap-3">
            <Button title="Move up" variant="secondary" className="flex-1" disabled={busy || position <= 0} onPress={() => move('up')} />
            <Button title="Move down" variant="secondary" className="flex-1" disabled={busy || position < 0 || position >= active.length - 1} onPress={() => move('down')} />
          </View>
          <Button title="Delete item" variant="destructive" block disabled={busy} onPress={remove} />
        </View>
      ) : null}
    </Screen>
  );
}
