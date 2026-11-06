import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { forgetFund, useFund } from '@/fund/context';
import { useAction } from '@/fund/use-action';
import { confirm } from '@/lib/confirm';
import { fmtDate } from '@/lib/format';

const ROLE = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' } as const;

/** Who can see and change this fund. Owners manage people; everyone else can leave. */
export default function Sharing() {
  const { payload, fundId, isOwner, funds, switchFund } = useFund();
  const { run, busy, error } = useAction();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [notice, setNotice] = useState<string | null>(null);
  const sharing = payload.sharing;
  const path = { fundId };

  async function leave() {
    const sure = await confirm('Leave this fund?', `You will no longer see ${payload.fund.name}.`, 'Leave');
    if (!sure) return;
    try {
      await call(client.POST('/funds/{fundId}/leave', { params: { path } }));
      const other = funds.find((f) => f.id !== fundId);
      if (other) switchFund(other.id);
      await forgetFund(fundId);
      router.dismissAll();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not leave.');
    }
  }

  if (!isOwner || !sharing) {
    return (
      <Screen title="Sharing" header>
        <Card>
          <AppText variant="headline">{payload.fund.name}</AppText>
          <AppText tone="muted">You have {ROLE[payload.role].toLowerCase()} access.</AppText>
        </Card>
        {notice ? <Notice kind="error">{notice}</Notice> : null}
        <Button title="Leave this fund" variant="destructive" block onPress={leave} />
      </Screen>
    );
  }

  async function invite() {
    setNotice(null);
    const ok = await run(() => call(client.POST('/funds/{fundId}/invites', { params: { path }, body: { email: email.trim(), role } })));
    if (ok) {
      setNotice(`Invite sent to ${email.trim()}.`);
      setEmail('');
    }
  }

  async function transfer(userId: string, name: string) {
    const sure = await confirm('Make them the owner?', `${name} becomes the owner and you become an editor. Only they can undo this.`, 'Transfer');
    if (sure) await run(() => call(client.POST('/funds/{fundId}/transfer-ownership', { params: { path }, body: { userId } })));
  }

  async function removeMember(userId: string, name: string) {
    const sure = await confirm('Remove this person?', `${name} will lose access to ${payload.fund.name}.`, 'Remove');
    if (sure) await run(() => call(client.DELETE('/funds/{fundId}/members/{userId}', { params: { path: { fundId, userId } } })));
  }

  return (
    <Screen title="Sharing" subtitle="Invite people to see or help with this fund." header>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {notice ? <Notice kind="success">{notice}</Notice> : null}

      <View className="gap-2">
        <AppText variant="label" tone="muted">
          People
        </AppText>
        <Card className="gap-0 py-1">
          <View className="min-h-14 justify-center py-3">
            <AppText className="font-medium">You</AppText>
            <AppText variant="caption" tone="muted">
              Owner
            </AppText>
          </View>
          {sharing.members.map((m) => (
            <View key={m.userId} className="gap-2 border-t border-border py-3">
              <View>
                <AppText className="font-medium">{m.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {m.email} · {ROLE[m.role]}
                </AppText>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  title={m.role === 'editor' ? 'Make viewer' : 'Make editor'}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => run(() => call(client.PATCH('/funds/{fundId}/members/{userId}', { params: { path: { fundId, userId: m.userId } }, body: { role: m.role === 'editor' ? 'viewer' : 'editor' } })))}
                />
                {m.role === 'editor' ? <Button title="Make owner" variant="secondary" disabled={busy} onPress={() => transfer(m.userId, m.name)} /> : null}
                <Button title="Remove" variant="dangerGhost" disabled={busy} onPress={() => removeMember(m.userId, m.name)} />
              </View>
            </View>
          ))}
        </Card>
      </View>

      {sharing.invites.length > 0 ? (
        <View className="gap-2">
          <AppText variant="label" tone="muted">
            Pending invites
          </AppText>
          <Card className="gap-0 py-1">
            {sharing.invites.map((inv, i) => (
              <View key={inv.id} className={`gap-2 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <View>
                  <AppText className="font-medium">{inv.email}</AppText>
                  <AppText variant="caption" tone="muted">
                    {ROLE[inv.role]} · expires {fmtDate(inv.expiresAt.slice(0, 10), true)}
                  </AppText>
                </View>
                <View className="flex-row gap-2">
                  <Button title="Resend" variant="secondary" disabled={busy} onPress={() => run(() => call(client.POST('/funds/{fundId}/invites/{inviteId}/resend', { params: { path: { fundId, inviteId: inv.id } } })))} />
                  <Button title="Revoke" variant="dangerGhost" disabled={busy} onPress={() => run(() => call(client.DELETE('/funds/{fundId}/invites/{inviteId}', { params: { path: { fundId, inviteId: inv.id } } })))} />
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View className="gap-3">
        <AppText variant="label" tone="muted">
          Invite someone
        </AppText>
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <View className="flex-row rounded-control border border-border bg-surface p-1">
          {(['viewer', 'editor'] as const).map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected: role === r }}
              onPress={() => setRole(r)}
              className={`min-h-10 flex-1 items-center justify-center rounded-control ${role === r ? 'bg-accent' : ''}`}>
              <AppText variant="caption" tone={role === r ? 'onAccent' : 'muted'} className="font-semibold">
                {r === 'viewer' ? 'Can view' : 'Can edit'}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Button title="Send invite" block loading={busy} disabled={!email.trim()} onPress={invite} />
      </View>
    </Screen>
  );
}
