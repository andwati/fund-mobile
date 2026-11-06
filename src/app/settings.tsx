import { Text, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';
import { type ThemePreference, useThemePreference } from '@/hooks/use-theme-preference';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { preference, setPreference } = useThemePreference();

  return (
    <View className="flex-1 gap-4 bg-background px-6 pt-safe">
      <Text className="mt-6 text-title font-semibold text-foreground">Settings</Text>
      <View className="gap-2">
        <Text className="text-caption text-muted">Appearance</Text>
        <View className="overflow-hidden rounded-card border border-border bg-surface">
          {OPTIONS.map((option, i) => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: preference === option.value }}
              onPress={() => setPreference(option.value)}
              className={`min-h-11 flex-row items-center justify-between px-4 ${i > 0 ? 'border-t border-border' : ''}`}>
              <Text className="text-body text-foreground">{option.label}</Text>
              {preference === option.value && <Text className="text-body text-accent">✓</Text>}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
