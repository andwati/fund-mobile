import { View } from 'react-native';

import { Pressable } from './ui/pressable';
import { AppText } from './ui/text';

/** Pick up to `max` days of the month. 31 means the last day (short months clamp). */
export function PaydayDays({ days, onChange, max = 4 }: { days: number[]; onChange: (days: number[]) => void; max?: number }) {
  const toggle = (d: number) => {
    if (days.includes(d)) onChange(days.filter((x) => x !== d));
    else if (days.length < max) onChange([...days, d].sort((a, b) => a - b));
  };
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
          const on = days.includes(d);
          return (
            <Pressable
              key={d}
              accessibilityRole="checkbox"
              accessibilityLabel={d === 31 ? 'Last day of the month' : `Day ${d}`}
              accessibilityState={{ checked: on }}
              onPress={() => toggle(d)}
              className={`h-11 w-11 items-center justify-center rounded-control border ${on ? 'border-accent bg-accent' : 'border-border bg-surface'}`}>
              <AppText variant="caption" tone={on ? 'onAccent' : 'default'} className="font-medium" numeric>
                {d === 31 ? 'Last' : d}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" tone="muted">
        Up to {max} days. Pick at least one.
      </AppText>
    </View>
  );
}
