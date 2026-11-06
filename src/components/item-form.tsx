import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import type { Item } from '@/api/types';
import { useAction } from '@/fund/use-action';
import { useFund } from '@/fund/context';
import { digitsOnly, isIsoDate } from '@/lib/format';
import { todayIn } from '@/lib/plan';

import { Button } from './ui/button';
import { DateField } from './ui/date-field';
import { Notice } from './ui/notice';
import { TextField } from './ui/text-field';
import { ToggleRow } from './ui/toggle-row';

/** Add an item, or edit one. Editing can restart its plan from today (the web app's "re-plan"). */
export function ItemForm({ item }: { item?: Item }) {
  const { fundId, payload, canEdit } = useFund();
  const { run, busy, error } = useAction();
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [deadline, setDeadline] = useState(item?.deadline ?? '');
  const [replan, setReplan] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const today = todayIn(payload.fund.timezone);
  const changedDeadline = !!item && deadline !== item.deadline;

  async function save() {
    if (!name.trim()) return setProblem('Give the item a name.');
    if (!price || Number(price) <= 0) return setProblem('Enter a price above zero.');
    if (!isIsoDate(deadline)) return setProblem('Pick a deadline.');
    if ((!item || replan) && deadline < today) return setProblem('The deadline has to be today or later.');
    setProblem(null);
    const done = await run(() =>
      item
        ? call(
            client.PATCH('/funds/{fundId}/items/{itemId}', {
              params: { path: { fundId, itemId: item.id } },
              body: { name: name.trim(), price: Number(price), deadline, replanFromToday: replan },
            }),
          )
        : call(client.POST('/funds/{fundId}/items', { params: { path: { fundId } }, body: { name: name.trim(), price: Number(price), deadline } })),
    );
    if (done) router.back();
  }

  return (
    <View className="gap-4">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <TextField label="What are you saving for?" value={name} onChangeText={setName} maxLength={80} editable={canEdit} autoFocus={!item} />
      <TextField label={`Price (${payload.fund.currency})`} value={price} onChangeText={(t) => setPrice(digitsOnly(t))} keyboardType="number-pad" maxLength={10} editable={canEdit} />
      <DateField label="Needed by" value={deadline} onChange={setDeadline} error={problem?.includes('eadline') ? problem : null} />
      {item && changedDeadline ? (
        <ToggleRow
          label="Restart the plan from today"
          hint="Spread what is left over the paydays from today to the new deadline."
          value={replan}
          onValueChange={setReplan}
        />
      ) : null}
      {problem && !problem.includes('eadline') ? <Notice kind="error">{problem}</Notice> : null}
      {canEdit ? <Button title={item ? 'Save changes' : 'Add item'} block loading={busy} onPress={save} /> : null}
    </View>
  );
}
