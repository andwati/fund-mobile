import { View } from 'react-native';

import { AppText } from './text';

/** A label, a value and a line of detail (the web app's MetricStat). */
export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View className="gap-0.5">
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <AppText variant="headline" numeric>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="caption" tone="muted">
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}
