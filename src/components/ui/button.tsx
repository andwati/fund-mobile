import { ActivityIndicator, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { Pressable, type AppPressableProps } from './pressable';
import { AppText } from './text';

const BOX = {
  primary: 'bg-accent',
  secondary: 'border border-border bg-surface',
  ghost: '',
  destructive: 'bg-destructive',
} as const;

const TONE = {
  primary: 'onAccent',
  secondary: 'default',
  ghost: 'accent',
  destructive: 'onAccent',
} as const;

export type ButtonProps = Omit<AppPressableProps, 'children'> & {
  title: string;
  variant?: keyof typeof BOX;
  loading?: boolean;
  /** Stretch to the full width of the parent (forms) instead of hugging the label. */
  block?: boolean;
};

export function Button({ title, variant = 'primary', loading, block, disabled, className, haptic, ...rest }: ButtonProps) {
  const spinner = useCSSVariable(variant === 'secondary' ? '--color-foreground' : '--color-accent-foreground') as string;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      haptic={haptic ?? variant === 'primary'}
      className={`min-h-12 items-center justify-center rounded-control px-5 ${BOX[variant]} ${block ? 'self-stretch' : 'self-start'} ${off ? 'opacity-50' : ''} ${className ?? ''}`}
      {...rest}>
      <View className="flex-row items-center gap-2">
        {loading ? <ActivityIndicator color={variant === 'ghost' ? undefined : spinner} /> : null}
        <AppText variant="body" tone={TONE[variant]} className="font-semibold">
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}
