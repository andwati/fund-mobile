import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useSession, useUser } from '@/auth/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { ToggleRow } from '@/components/ui/toggle-row';
import { forgetFund, useFund } from '@/fund/context';
import { downloadAndShare } from '@/lib/files';
import { pickCsvText } from '@/lib/pick-csv';
import { useAction } from '@/fund/use-action';
import { confirm } from '@/lib/confirm';
import { type ThemePreference, useThemePreference } from '@/hooks/use-theme-preference';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function Row({ title, detail, onPress, first }: { title: string; detail?: string; onPress: () => void; first?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={`min-h-14 flex-row items-center justify-between gap-3 px-4 ${first ? '' : 'border-t border-border'}`}>
      <View className="flex-1 py-3">
        <AppText>{title}</AppText>
        {detail ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </AppText>
        ) : null}
      </View>
      <AppText tone="muted">›</AppText>
    </Pressable>
  );
}

export default function Settings() {
  const user = useUser();
  const { signOut } = useSession();
  const { payload, fundId, isOwner, funds, switchFund } = useFund();
  const { run, error } = useAction();
  const { preference, setPreference } = useThemePreference();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dataBusy, setDataBusy] = useState<string | null>(null);
  const [dataMsg, setDataMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function deleteFund() {
    const sure = await confirm('Delete this fund?', `${payload.fund.name} and everything in it will be removed for everyone. This cannot be undone.`, 'Delete fund');
    if (!sure) return;
    setDeleteError(null);
    try {
      await call(client.DELETE('/funds/{fundId}', { params: { path: { fundId } } }));
      const other = funds.find((f) => f.id !== fundId);
      if (other) switchFund(other.id);
      await forgetFund(fundId);
    } catch (e) {
      setDeleteError(errorMessage(e));
    }
  }

  async function dataTask(key: string, work: () => Promise<string | void>) {
    setDataBusy(key);
    setDataMsg(null);
    try {
      const text = await work();
      if (text) setDataMsg({ kind: 'success', text });
    } catch (e) {
      setDataMsg({ kind: 'error', text: errorMessage(e) });
    } finally {
      setDataBusy(null);
    }
  }

  const exportFile = (key: string, path: string, name: string, mime: string) => dataTask(key, () => downloadAndShare(path, name, mime));

  async function importCsv() {
    await dataTask('import', async () => {
      const csv = await pickCsvText();
      if (csv === null) return;
      const res = await run(() => call(client.POST('/funds/{fundId}/contributions/import', { params: { path: { fundId } }, body: { csv } })));
      return res ? 'Imported. Your contributions are updated.' : undefined;
    });
  }

  return (
    <Screen title="Settings" bottomInset={120}>
      {error ? <Notice kind="error">{error}</Notice> : null}

      <View className="gap-2">
        <AppText variant="label" tone="muted">
          {payload.fund.name}
        </AppText>
        <Card className="gap-0 overflow-hidden p-0">
          {isOwner ? <Row first title="Fund settings" detail="Name, paydays, pace, timezone" onPress={() => router.push('/fund-settings')} /> : null}
          <Row first={!isOwner} title="Sharing" detail={isOwner ? 'Invite people and manage access' : `You are ${payload.role}`} onPress={() => router.push('/sharing')} />
        </Card>
        <ToggleRow
          label="Payday reminders"
          hint="An email the day before a payday saying how much to set aside."
          value={payload.fund.remindersEnabled}
          onValueChange={(enabled) => void run(() => call(client.PUT('/funds/{fundId}/reminders', { params: { path: { fundId } }, body: { enabled } })))}
        />
      </View>

      <View className="gap-2">
        <AppText variant="label" tone="muted">
          Your data
        </AppText>
        {dataMsg ? <Notice kind={dataMsg.kind}>{dataMsg.text}</Notice> : null}
        <Card className="gap-0 overflow-hidden p-0">
          <Row first title="Export contributions" detail={dataBusy === 'contributions' ? 'Preparing…' : 'CSV you can re-import'} onPress={() => void exportFile('contributions', `/funds/${fundId}/export/contributions.csv`, 'fund-contributions.csv', 'text/csv')} />
          <Row title="Export items" detail={dataBusy === 'items' ? 'Preparing…' : 'CSV'} onPress={() => void exportFile('items', `/funds/${fundId}/export/items.csv`, 'fund-items.csv', 'text/csv')} />
          <Row title="Payday calendar" detail={dataBusy === 'schedule' ? 'Preparing…' : 'Add your paydays to any calendar app (.ics)'} onPress={() => void exportFile('schedule', `/funds/${fundId}/export/schedule.ics`, 'fund-paydays.ics', 'text/calendar')} />
          {payload.role !== 'viewer' ? <Row title="Import contributions" detail={dataBusy === 'import' ? 'Importing…' : 'From a CSV file, all or nothing'} onPress={() => void importCsv()} /> : null}
          <Row title="Download all my data" detail={dataBusy === 'account' ? 'Preparing…' : 'Zip of everything you own'} onPress={() => void exportFile('account', '/account/export', 'fund-export.zip', 'application/zip')} />
        </Card>
      </View>

      <View className="gap-2">
        <AppText variant="label" tone="muted">
          Appearance
        </AppText>
        <View className="overflow-hidden rounded-card border border-border bg-surface">
          {THEMES.map((option, i) => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: preference === option.value }}
              onPress={() => setPreference(option.value)}
              className={`min-h-12 flex-row items-center justify-between px-4 ${i > 0 ? 'border-t border-border' : ''}`}>
              <AppText>{option.label}</AppText>
              {preference === option.value ? <AppText tone="accent">✓</AppText> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <AppText variant="label" tone="muted">
          Account
        </AppText>
        <Card className="gap-0 overflow-hidden p-0">
          <Row first title={user.name} detail={user.email} onPress={() => router.push('/account')} />
        </Card>
      </View>

      {deleteError ? <Notice kind="error">{deleteError}</Notice> : null}
      <View className="gap-3">
        <Button title="Sign out" variant="secondary" block onPress={signOut} />
        {isOwner ? <Button title="Delete this fund" variant="dangerGhost" center onPress={deleteFund} /> : null}
      </View>
    </Screen>
  );
}
