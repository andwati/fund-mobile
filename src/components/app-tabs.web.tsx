import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Text, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View className="absolute w-full flex-row items-center justify-center p-4">
          <View className="max-w-3xl flex-1 flex-row items-center gap-2 rounded-sheet border border-border bg-surface px-6 py-2">
            <Text className="mr-auto text-body font-semibold text-foreground">Fund</Text>
            <TabTrigger name="home" href="/" asChild>
              <TabButton>Home</TabButton>
            </TabTrigger>
            <TabTrigger name="settings" href="/settings" asChild>
              <TabButton>Settings</TabButton>
            </TabTrigger>
          </View>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} className="rounded-control px-3 py-1">
      <Text className={`text-caption font-medium ${isFocused ? 'text-foreground' : 'text-muted'}`}>
        {children}
      </Text>
    </Pressable>
  );
}
