import { type ComponentRef, forwardRef, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { Pressable } from './pressable';
import { AppText } from './text';

/** The instance type of RN's TextInput (it changed shape in RN 0.8x), for `useRef`. */
export type TextInputRef = ComponentRef<typeof TextInput>;

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
};

export const TextField = forwardRef<TextInputRef, TextFieldProps>(function TextField(
  { label, error, hint, secureTextEntry, ...rest },
  ref,
) {
  const muted = useCSSVariable('--color-muted') as string;
  const [hidden, setHidden] = useState(true);
  const secure = !!secureTextEntry;
  return (
    <View className="gap-1.5">
      {label ? (
        <AppText variant="caption" tone="muted" className="font-medium">
          {label}
        </AppText>
      ) : null}
      <View
        className={`min-h-12 flex-row items-center rounded-control border bg-surface px-4 ${error ? 'border-destructive' : 'border-border'}`}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={muted}
          secureTextEntry={secure && hidden}
          autoCorrect={false}
          className="flex-1 py-3 text-body text-foreground"
          {...rest}
        />
        {secure ? (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden((h) => !h)} className="pl-3">
            <AppText variant="caption" tone="accent" className="font-medium">
              {hidden ? 'Show' : 'Hide'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="destructive" accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});
