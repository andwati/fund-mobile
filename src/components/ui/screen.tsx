import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './text';

type ScreenProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Skip the safe-area top padding when a native header already provides it. */
  header?: boolean;
  /** Extra space under the content, e.g. for a floating tab bar. */
  bottomInset?: number;
};

/** Scrollable page with a comfortable reading width on tablets and the web. */
export function Screen({ children, title, subtitle, header = false, bottomInset = 32 }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: header ? 16 : insets.top + 24, paddingBottom: insets.bottom + bottomInset }}>
      <View className="w-full max-w-xl gap-5 self-center px-5">
        {title ? (
          <View className="gap-1">
            <AppText variant="title" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? (
              <AppText tone="muted">{subtitle}</AppText>
            ) : null}
          </View>
        ) : null}
        {children}
      </View>
    </ScrollView>
  );
}
