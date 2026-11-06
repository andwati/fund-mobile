import { View } from 'react-native';

import { useSession, useUser } from '@/auth/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { type ThemePreference, useThemePreference } from '@/hooks/use-theme-preference';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function Settings() {
  const user = useUser();
  const { signOut } = useSession();
  const { preference, setPreference } = useThemePreference();

  return (
    <Screen title="Settings" bottomInset={120}>
      <Card>
        <AppText variant="headline">{user.name}</AppText>
        <AppText tone="muted">{user.email}</AppText>
      </Card>

      <View className="gap-2">
        <AppText variant="caption" tone="muted">
          Appearance
        </AppText>
        <View className="overflow-hidden rounded-card border border-border bg-surface">
          {OPTIONS.map((option, i) => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: preference === option.value }}
              onPress={() => setPreference(option.value)}
              className={`min-h-12 flex-row items-center justify-between px-4 ${i > 0 ? 'border-t border-border' : ''}`}>
              <AppText>{option.label}</AppText>
              {preference === option.value ? <AppText tone="accent">✓</AppText> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <Button title="Sign out" variant="secondary" block onPress={signOut} />
    </Screen>
  );
}
