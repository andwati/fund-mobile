import { Switch, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { AppText } from './text';

export function ToggleRow({ label, hint, value, onValueChange }: { label: string; hint?: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const accent = useCSSVariable('--color-accent') as string;
  return (
    <View className="flex-row items-center justify-between gap-4 rounded-control border border-border bg-surface px-4 py-3">
      <View className="flex-1 gap-0.5">
        <AppText className="font-medium">{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} trackColor={{ true: accent }} />
    </View>
  );
}
