import { View } from 'react-native';

import { AppText } from './text';

const BOX = {
  info: 'border-border bg-surface',
  warning: 'border-warning bg-surface',
  error: 'border-destructive bg-surface',
  success: 'border-success bg-surface',
} as const;

/** An inline message: a failed request, a warning, a confirmation. */
export function Notice({ kind = 'info', title, children }: { kind?: keyof typeof BOX; title?: string; children?: string }) {
  return (
    <View accessibilityRole={kind === 'error' ? 'alert' : undefined} className={`gap-1 rounded-card border p-4 ${BOX[kind]}`}>
      {title ? (
        <AppText variant="body" className="font-semibold">
          {title}
        </AppText>
      ) : null}
      {children ? (
        <AppText variant="caption" tone="muted">
          {children}
        </AppText>
      ) : null}
    </View>
  );
}
