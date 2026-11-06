import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { PaydayDays } from '@/components/payday-days';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useFund } from '@/fund/context';
import { useAction } from '@/fund/use-action';
import { digitsOnly } from '@/lib/format';

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** The fund's own settings. Owner only. */
export default function FundSettings() {
  const { payload, fundId, isOwner } = useFund();
  const f = payload.fund;
  const { run, busy, error } = useAction();
  const [name, setName] = useState(f.name);
  const [currency, setCurrency] = useState(f.currency);
  const [days, setDays] = useState(f.paydays);
  const [pace, setPace] = useState(f.pace ? String(f.pace) : '');
  const [timezone, setTimezone] = useState(f.timezone);
  const [problem, setProblem] = useState<string | null>(null);

  if (!isOwner) {
    return (
      <Screen title="Fund settings" header>
        <Notice>Only the owner can change the fund&apos;s settings.</Notice>
      </Screen>
    );
  }

  const paydaysChanged = !same([...days].sort((a, b) => a - b), f.paydays);

  async function save() {
    if (!name.trim()) return setProblem('Enter a name.');
    if (days.length === 0) return setProblem('Pick at least one payday.');
    setProblem(null);
    const ok = await run(() =>
      call(
        client.PATCH('/funds/{fundId}', {
          params: { path: { fundId } },
          body: {
            name: name.trim(),
            currency: currency.trim(),
            paydays: days,
            pace: pace ? Number(pace) : null,
            timezone: timezone.trim(),
            timezoneConfirmed: true,
          },
        }),
      ),
    );
    if (ok) router.back();
  }

  return (
    <Screen title="Fund settings" header>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {problem ? <Notice kind="error">{problem}</Notice> : null}
      <TextField label="Name" value={name} onChangeText={setName} maxLength={80} />
      <TextField label="Currency label" value={currency} onChangeText={setCurrency} maxLength={8} autoCapitalize="characters" hint="A label only. It does not convert existing numbers." />
      <View className="gap-2">
        <AppText variant="caption" tone="muted" className="font-medium">
          Paydays
        </AppText>
        <PaydayDays days={days} onChange={setDays} />
        {paydaysChanged ? <Notice kind="warning">Changing paydays restarts the plan of your active items from today. Skipped and adjusted paydays that are no longer paydays are dropped.</Notice> : null}
      </View>
      <TextField
        label={`Saved per payday (${currency.trim() || 'KES'})`}
        value={pace}
        onChangeText={(t) => setPace(digitsOnly(t))}
        keyboardType="number-pad"
        maxLength={10}
        hint="Optional. Leave empty to hide the finish date on the overview."
      />
      <TextField label="Timezone" value={timezone} onChangeText={setTimezone} autoCapitalize="none" hint="Paydays and deadlines follow this zone, e.g. Africa/Nairobi." />
      <Button title="Save" block loading={busy} onPress={save} />
    </Screen>
  );
}
