import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useFund } from '@/fund/context';

const ROLE = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' } as const;

/** Sheet to pick another fund or start a new one. */
export default function SwitchFund() {
  const { funds, fundId, switchFund, commit } = useFund();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(id: string) {
    switchFund(id);
    router.back();
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await call(client.POST('/funds', { body: { name: name.trim() } }));
      commit(res.payload);
      switchFund(res.payload.fund.id);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen title="Your funds" header>
      <View className="overflow-hidden rounded-card border border-border bg-surface">
        {funds.map((f, i) => (
          <Pressable
            key={f.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: f.id === fundId }}
            onPress={() => pick(f.id)}
            className={`min-h-14 flex-row items-center justify-between gap-3 px-4 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="flex-1">
              <AppText numberOfLines={1} className="font-medium">
                {f.name}
              </AppText>
              <AppText variant="caption" tone="muted">
                {ROLE[f.role]}
              </AppText>
            </View>
            {f.id === fundId ? <AppText tone="accent">✓</AppText> : null}
          </Pressable>
        ))}
      </View>

      {error ? <Notice kind="error">{error}</Notice> : null}
      {creating ? (
        <View className="gap-3">
          <TextField label="Name of the new fund" value={name} onChangeText={setName} autoFocus maxLength={80} returnKeyType="done" onSubmitEditing={create} />
          <Button title="Create fund" block loading={busy} disabled={!name.trim()} onPress={create} />
        </View>
      ) : (
        <Button title="New fund" variant="secondary" block onPress={() => setCreating(true)} />
      )}
    </Screen>
  );
}
