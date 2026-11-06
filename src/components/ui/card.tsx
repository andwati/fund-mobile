import { View, type ViewProps } from 'react-native';

export function Card({ className, ...rest }: ViewProps & { className?: string }) {
  return <View className={`gap-3 rounded-card border border-border bg-surface p-4 ${className ?? ''}`} {...rest} />;
}
