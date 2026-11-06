import { View } from 'react-native';

import { money } from '@/lib/format';
import type { Standing } from '@/lib/status';

import { AppText } from './ui/text';

const STYLE: Record<Exclude<Standing, 'none'>, { box: string; tone: 'success' | 'warning' | 'muted' }> = {
  funded: { box: 'border-success', tone: 'success' },
  ahead: { box: 'border-success', tone: 'success' },
  'on-plan': { box: 'border-border', tone: 'muted' },
  behind: { box: 'border-warning', tone: 'warning' },
};

export function StatusChip({ kind, amount, currency }: { kind: Exclude<Standing, 'none'>; amount: number; currency: string }) {
  const label =
    kind === 'funded'
      ? 'Funded'
      : kind === 'on-plan'
        ? 'On plan'
        : kind === 'ahead'
          ? `Ahead by ${money(currency, amount)}`
          : `Behind by ${money(currency, amount)}`;
  const s = STYLE[kind];
  return (
    <View className={`self-start rounded-full border px-3 py-1 ${s.box}`}>
      <AppText variant="caption" tone={s.tone} className="font-medium" numeric>
        {label}
      </AppText>
    </View>
  );
}
