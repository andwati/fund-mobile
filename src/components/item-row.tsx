import { View } from 'react-native';

import { fmtDate, money, plural } from '@/lib/format';
import type { ItemProgress } from '@/lib/plan';
import { standing } from '@/lib/status';

import { StatusChip } from './status-chip';
import { ProgressBar } from './ui/progress';
import { AppText } from './ui/text';

/** One item of the plan with its progress, what it needs next and where it stands. */
export function ItemRow({ item, currency }: { item: ItemProgress; currency: string }) {
  const state = standing({ target: item.price, remaining: item.remaining, diff: item.diff });
  return (
    <View className="gap-2 py-3">
      <View className="flex-row items-baseline justify-between gap-3">
        <AppText variant="body" className="flex-1 font-semibold" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="caption" tone="muted" numeric>
          {money(currency, item.contributed)} / {money(currency, item.price)}
        </AppText>
      </View>
      <ProgressBar value={item.percent} label={`${item.name} progress`} />
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <AppText variant="caption" tone="muted">
          Due {fmtDate(item.deadline, true)}
          {item.remaining > 0 && item.paydaysLeft > 0 ? ` · ${plural(item.paydaysLeft, 'payday')} left` : ''}
        </AppText>
        {state.kind !== 'none' ? <StatusChip kind={state.kind} amount={state.amount} currency={currency} /> : null}
      </View>
      {item.needed > 0 ? (
        <AppText variant="caption" tone="muted" numeric>
          Set aside {money(currency, Math.ceil(item.needed))} next payday
        </AppText>
      ) : null}
    </View>
  );
}
