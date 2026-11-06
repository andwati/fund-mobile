import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useFund } from '@/fund/context';
import { useAction } from '@/fund/use-action';
import { digitsOnly, fmtLong, money } from '@/lib/format';

/** One payday: what the plan expected, and (for upcoming ones) skip it or say how much you will set aside. */
export default function PaydaySheet() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { fundId, progress, currency, canEdit } = useFund();
  const { run, busy, error } = useAction();
  const row = progress.schedule.find((entry) => entry.date === date);
  const [amount, setAmount] = useState(row?.adjusted != null ? String(row.adjusted) : '');

  if (!row || !date) {
    return (
      <Screen title="Payday" header>
        <Notice>That payday is not on the plan any more.</Notice>
        <Button title="Close" variant="secondary" block onPress={() => router.back()} />
      </Screen>
    );
  }

  const path = { fundId, date };
  const editable = canEdit && date >= progress.today;

  const act = async (request: () => Promise<{ payload: import('@/api/types').FundPayload }>) => {
    if (await run(request)) router.back();
  };

  return (
    <Screen title={fmtLong(date, true)} subtitle={row.skipped ? 'Skipped' : 'Payday'} header>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Card>
        {!row.skipped ? (
          <>
            <AppText tone="muted" numeric>
              The plan expects {money(currency, row.planTotal)} saved by this day.
            </AppText>
            {row.saved !== null ? (
              <AppText numeric>You had {money(currency, row.saved)} saved.</AppText>
            ) : null}
          </>
        ) : (
          <AppText tone="muted">No installment falls on this payday.</AppText>
        )}
        {row.adjusted !== null ? (
          <AppText tone="accent" numeric>
            You expect to set aside {money(currency, row.adjusted)}.
          </AppText>
        ) : null}
      </Card>

      {editable ? (
        <View className="gap-4">
          {row.skipped ? (
            <Button title="Restore this payday" block loading={busy} onPress={() => act(() => call(client.DELETE('/funds/{fundId}/paydays/{date}/skip', { params: { path } })))} />
          ) : (
            <>
              <View className="gap-3">
                <TextField
                  label={`How much will you set aside (${currency})`}
                  value={amount}
                  onChangeText={(t) => setAmount(digitsOnly(t))}
                  keyboardType="number-pad"
                  maxLength={10}
                  hint="Changes how the plan splits the remaining cost across paydays."
                />
                <Button
                  title="Set amount"
                  block
                  loading={busy}
                  disabled={!amount || Number(amount) <= 0}
                  onPress={() => act(() => call(client.PUT('/funds/{fundId}/paydays/{date}/amount', { params: { path }, body: { amount: Number(amount) } })))}
                />
                {row.adjusted !== null ? (
                  <Button title="Back to the usual amount" variant="secondary" block disabled={busy} onPress={() => act(() => call(client.DELETE('/funds/{fundId}/paydays/{date}/amount', { params: { path } })))} />
                ) : null}
              </View>
              <Button title="Skip this payday" variant="secondary" block disabled={busy} onPress={() => act(() => call(client.POST('/funds/{fundId}/paydays/{date}/skip', { params: { path } })))} />
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}
