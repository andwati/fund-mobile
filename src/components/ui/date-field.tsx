import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, View } from 'react-native';

import { dateFromIso, fmtLong, isIsoDate, isoFromDate } from '@/lib/format';

import { Pressable } from './pressable';
import { AppText } from './text';
import { TextField } from './text-field';

type Props = {
  label: string;
  /** YYYY-MM-DD, or '' for none. */
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string | null;
  hint?: string;
};

/** A date picker that works everywhere: dialog on Android, compact picker on iOS, typed ISO date on the web. */
export function DateField({ label, value, onChange, minimumDate, maximumDate, error, hint }: Props) {
  if (Platform.OS === 'web') {
    return (
      <TextField
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        error={error ?? (value && !isIsoDate(value) ? 'Use the format YYYY-MM-DD.' : null)}
        hint={hint}
      />
    );
  }

  const current = value && isIsoDate(value) ? dateFromIso(value) : new Date();
  const pick = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) onChange(isoFromDate(date));
  };

  return (
    <View className="gap-1.5">
      <AppText variant="caption" tone="muted" className="font-medium">
        {label}
      </AppText>
      {Platform.OS === 'ios' ? (
        <View className={`min-h-12 flex-row items-center rounded-control border bg-surface px-4 ${error ? 'border-destructive' : 'border-border'}`}>
          <DateTimePicker
            value={current}
            mode="date"
            display="compact"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={pick}
            style={{ marginLeft: -8 }}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? fmtLong(value, true) : 'not set'}`}
          onPress={() =>
            DateTimePickerAndroid.open({ value: current, mode: 'date', minimumDate, maximumDate, onChange: pick })
          }
          className={`min-h-12 justify-center rounded-control border bg-surface px-4 ${error ? 'border-destructive' : 'border-border'}`}>
          <AppText tone={value ? 'default' : 'muted'}>{value ? fmtLong(value, true) : 'Choose a date'}</AppText>
        </Pressable>
      )}
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
}
