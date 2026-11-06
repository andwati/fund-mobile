import { router } from 'expo-router';
import { View } from 'react-native';

import type { ScheduleRow } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useFund } from '@/fund/context';
import { fmtLong, money } from '@/lib/format';

function label(row: ScheduleRow, currency: string): { text: string; tone: 'muted' | 'success' | 'warning' | 'accent' } {
  if (row.skipped) return { text: 'Skipped', tone: 'muted' };
  if (row.status === 'next') return { text: 'Next payday', tone: 'accent' };
  if (row.status === 'on-plan') return { text: 'On plan', tone: 'success' };
  if (row.status === 'short') return { text: `Short by ${money(currency, row.gap)}`, tone: 'warning' };
  return { text: 'Upcoming', tone: 'muted' };
}

export default function Schedule() {
  const { progress, currency, canEdit, refresh, refreshing } = useFund();
  const rows = progress.schedule;
  // Upcoming first would hide history; the web app lists the whole plan in date order, so do the same.
  return (
    <Screen title="Schedule" subtitle="Each payday on the plan, and how you did." bottomInset={120} onRefresh={() => void refresh()} refreshing={refreshing}>
      {rows.length === 0 ? (
        <Notice title="No paydays yet">Add an item and its paydays appear here.</Notice>
      ) : (
        <Card className="gap-0 py-1">
          {rows.map((row, i) => {
            const status = label(row, currency);
            const editable = canEdit && row.date >= progress.today;
            return (
              <Pressable
                key={row.date}
                accessibilityRole="button"
                accessibilityLabel={`${fmtLong(row.date, true)}, ${status.text}`}
                onPress={() => router.push({ pathname: '/payday/[date]', params: { date: row.date } })}
                className={`gap-1 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <View className="flex-row items-baseline justify-between gap-3">
                  <AppText className={`font-semibold ${row.skipped ? 'line-through' : ''}`}>{fmtLong(row.date, true)}</AppText>
                  <AppText variant="caption" tone={status.tone} className="font-medium" numeric>
                    {status.text}
                  </AppText>
                </View>
                {!row.skipped ? (
                  <AppText variant="caption" tone="muted" numeric>
                    Plan expects {money(currency, row.planTotal)} saved
                    {row.saved !== null ? ` · you had ${money(currency, row.saved)}` : ''}
                  </AppText>
                ) : null}
                {row.adjusted !== null ? (
                  <AppText variant="caption" tone="accent" numeric>
                    You expect to set aside {money(currency, row.adjusted)}
                  </AppText>
                ) : null}
                {editable ? (
                  <AppText variant="caption" tone="muted">
                    Tap to skip or adjust
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
