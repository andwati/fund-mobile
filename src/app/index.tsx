import { Text, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-6 pt-safe">
      <View className="items-center gap-2">
        <Text className="text-caption text-muted">Needed this payday</Text>
        <Text className="text-figure font-semibold text-foreground" style={{ fontVariant: ['tabular-nums'] }}>
          KES 4,250
        </Text>
      </View>
      <Pressable
        haptic
        accessibilityRole="button"
        className="min-h-11 items-center justify-center rounded-control bg-accent px-6">
        <Text className="text-body font-semibold text-accent-foreground">Log contribution</Text>
      </Pressable>
    </View>
  );
}
