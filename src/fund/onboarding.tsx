import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { digitsOnly, fmtLong, isIsoDate } from '@/lib/format';
import { nextPayday, scheduleOf, todayIn } from '@/lib/plan';

import { useFund } from './context';
import { useAction } from './use-action';

const STEPS = ['name', 'currency', 'payday', 'pace', 'timezone', 'item'] as const;
type Step = (typeof STEPS)[number];

const COPY: Record<Step, { title: string; description: string }> = {
  name: { title: 'Name your fund', description: 'Something you will recognise in the switcher.' },
  currency: { title: 'Currency label', description: 'A label only. It does not convert existing numbers.' },
  payday: { title: 'Payday', description: 'One day each month for the whole fund. You can add more paydays later in Settings.' },
  pace: { title: 'Saved per payday', description: 'Optional. Leave empty to hide the finish date on the overview.' },
  timezone: { title: 'Timezone', description: 'Paydays and deadlines follow this zone.' },
  item: { title: 'First item', description: 'Add what you are saving for, or skip and do it later.' },
};

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'];

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function OnboardingWizard() {
  const { payload, fundId } = useFund();
  const { run, busy, error } = useAction();
  const [index, setIndex] = useState(0);
  const step = STEPS[index]!;

  const [name, setName] = useState(payload.fund.name);
  const [currency, setCurrency] = useState(payload.fund.currency);
  const [day, setDay] = useState(31);
  const [pace, setPace] = useState('');
  const [timezone, setTimezone] = useState(deviceTimezone());
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [deadline, setDeadline] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const preview = useMemo(() => {
    try {
      const today = todayIn(timezone);
      return nextPayday(today, true, scheduleOf({ paydays: [day] }));
    } catch {
      return null;
    }
  }, [day, timezone]);

  function validate(): string | null {
    if (step === 'name' && !name.trim()) return 'Enter a name.';
    if (step === 'currency' && (!currency.trim() || currency.trim().length > 8)) return 'Use 1 to 8 characters.';
    if (step === 'timezone' && !timezone.trim()) return 'Enter a timezone such as Africa/Nairobi.';
    if (step === 'item' && (itemName || price || deadline)) {
      if (!itemName.trim()) return 'Give the item a name.';
      if (!price || Number(price) <= 0) return 'Enter a price above zero.';
      if (!isIsoDate(deadline)) return 'Pick a deadline.';
      if (deadline < todayIn(timezone)) return 'The deadline has to be today or later.';
    }
    return null;
  }

  async function finish() {
    const payloadAfterSettings = await run(() =>
      call(
        client.PATCH('/funds/{fundId}', {
          params: { path: { fundId } },
          body: {
            name: name.trim(),
            currency: currency.trim(),
            paydays: [day],
            pace: pace ? Number(pace) : null,
            timezone: timezone.trim(),
            timezoneConfirmed: true,
            onboardingCompleted: true,
          },
        }),
      ),
    );
    if (!payloadAfterSettings) return;
    if (itemName.trim() && price && isIsoDate(deadline)) {
      // The fund is already set up; if adding the item fails the person can add it from Items.
      await run(() =>
        call(client.POST('/funds/{fundId}/items', { params: { path: { fundId } }, body: { name: itemName.trim(), price: Number(price), deadline } })),
      );
    }
  }

  function next() {
    const problem = validate();
    setFieldError(problem);
    if (problem) return;
    if (index === STEPS.length - 1) void finish();
    else setIndex(index + 1);
  }

  const last = index === STEPS.length - 1;
  const skippable = step === 'pace' || step === 'item';

  return (
    <Screen title="Set up your fund" subtitle={`Step ${index + 1} of ${STEPS.length}`}>
      <View className="flex-row gap-1.5">
        {STEPS.map((s, i) => (
          <View key={s} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </View>

      <View className="gap-1">
        <AppText variant="headline" accessibilityRole="header">
          {COPY[step].title}
        </AppText>
        <AppText tone="muted">{COPY[step].description}</AppText>
      </View>

      {error ? <Notice kind="error">{error}</Notice> : null}

      {step === 'name' ? <TextField label="Fund name" value={name} onChangeText={setName} maxLength={80} autoFocus error={fieldError} returnKeyType="next" onSubmitEditing={next} /> : null}

      {step === 'currency' ? (
        <View className="gap-3">
          <TextField label="Currency label" value={currency} onChangeText={setCurrency} maxLength={8} autoCapitalize="characters" autoFocus error={fieldError} />
          <View className="flex-row flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityState={{ selected: currency.trim().toUpperCase() === c }}
                onPress={() => setCurrency(c)}
                className={`rounded-full border px-4 py-2 ${currency.trim().toUpperCase() === c ? 'border-accent bg-surface' : 'border-border'}`}>
                <AppText variant="caption" tone={currency.trim().toUpperCase() === c ? 'accent' : 'default'} className="font-medium">
                  {c}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === 'payday' ? (
        <View className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <Pressable
                key={d}
                accessibilityRole="radio"
                accessibilityLabel={d === 31 ? 'Last day of the month' : `Day ${d}`}
                accessibilityState={{ selected: day === d }}
                onPress={() => setDay(d)}
                className={`h-11 w-11 items-center justify-center rounded-control border ${day === d ? 'border-accent bg-accent' : 'border-border bg-surface'}`}>
                <AppText variant="caption" tone={day === d ? 'onAccent' : 'default'} className="font-medium" numeric>
                  {d === 31 ? 'Last' : d}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText variant="caption" tone="muted">
            {preview ? `Next payday would be ${fmtLong(preview, true)}.` : ' '}
          </AppText>
        </View>
      ) : null}

      {step === 'pace' ? (
        <TextField
          label={`Amount per payday (${currency.trim() || 'KES'})`}
          value={pace}
          onChangeText={(t) => setPace(digitsOnly(t))}
          keyboardType="number-pad"
          maxLength={10}
          autoFocus
          hint="What you can realistically set aside each payday."
        />
      ) : null}

      {step === 'timezone' ? (
        <TextField
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          autoCapitalize="none"
          error={fieldError}
          hint="Detected from this device. Use a name like Africa/Nairobi."
        />
      ) : null}

      {step === 'item' ? (
        <View className="gap-4">
          <TextField label="What are you saving for?" value={itemName} onChangeText={setItemName} maxLength={80} />
          <TextField label={`Price (${currency.trim() || 'KES'})`} value={price} onChangeText={(t) => setPrice(digitsOnly(t))} keyboardType="number-pad" maxLength={10} />
          <DateField label="Needed by" value={deadline} onChange={setDeadline} minimumDate={new Date()} error={fieldError} />
        </View>
      ) : null}

      <View className="gap-3">
        <Button title={last ? 'Finish' : 'Next'} block loading={busy} onPress={next} />
        <View className="flex-row items-center justify-between">
          {index > 0 ? <Button title="Back" variant="ghost" onPress={() => { setFieldError(null); setIndex(index - 1); }} /> : <View />}
          {skippable ? (
            <Button
              title="Skip"
              variant="ghost"
              onPress={() => {
                setFieldError(null);
                if (step === 'pace') setPace('');
                if (step === 'item') {
                  setItemName('');
                  setPrice('');
                  setDeadline('');
                }
                if (last) void finish();
                else setIndex(index + 1);
              }}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
