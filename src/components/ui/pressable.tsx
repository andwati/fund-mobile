import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { withUniwind } from 'uniwind';

// Strong ease-out (emil-design-eng). Native CSS transitions need cubicBezier(), not a CSS string.
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const AnimatedPressable = withUniwind(Animated.createAnimatedComponent(RNPressable));

export type AppPressableProps = Omit<PressableProps, 'style'> & {
  className?: string;
  /** Light impact on commit (press-out inside the target). Off by default: haptics are for meaningful actions. */
  haptic?: boolean;
};

/**
 * Pressable with the app's press feedback: scale 0.97 in 120ms ease-out on press-in,
 * action commits on press. Reduced motion keeps an opacity cue instead of scale.
 * hitSlop pads the target toward 44pt without growing the visual.
 */
export function Pressable({ className, haptic, onPress, onPressIn, onPressOut, ...rest }: AppPressableProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();

  return (
    <AnimatedPressable
      hitSlop={8}
      pressRetentionOffset={16}
      {...rest}
      className={className}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={{
        transitionProperty: reduced ? 'opacity' : 'transform',
        transitionDuration: 120,
        transitionTimingFunction: EASE_OUT,
        transform: [{ scale: pressed && !reduced ? 0.97 : 1 }],
        // Only set opacity when needed: even `opacity: undefined` would override className (opacity-50 when disabled).
        ...(pressed && reduced ? { opacity: 0.7 } : null),
      }}
    />
  );
}
