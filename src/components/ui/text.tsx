import { Text as RNText, type TextProps } from 'react-native';

const VARIANTS = {
  body: 'text-body',
  caption: 'text-caption',
  label: 'text-caption font-medium uppercase tracking-wide',
  headline: 'text-headline font-semibold',
  title: 'text-title font-semibold',
  figure: 'text-figure font-semibold',
} as const;

const TONES = {
  default: 'text-foreground',
  muted: 'text-muted',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  onAccent: 'text-accent-foreground',
} as const;

export type AppTextProps = TextProps & {
  variant?: keyof typeof VARIANTS;
  tone?: keyof typeof TONES;
  className?: string;
  /** Tabular numerals so money columns and counters do not jiggle. */
  numeric?: boolean;
};

export function AppText({ variant = 'body', tone = 'default', className, numeric, style, ...rest }: AppTextProps) {
  return (
    <RNText
      className={`${VARIANTS[variant]} ${TONES[tone]} ${className ?? ''}`}
      style={numeric ? [{ fontVariant: ['tabular-nums'] }, style] : style}
      {...rest}
    />
  );
}
