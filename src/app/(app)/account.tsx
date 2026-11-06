import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useSession, useUser } from '@/auth/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { ToggleRow } from '@/components/ui/toggle-row';
import { confirm } from '@/lib/confirm';

type Msg = { kind: 'success' | 'error'; text: string } | null;

/** Profile, email, password, signed-in devices and account deletion. */
export default function Account() {
  const user = useUser();
  const { setUser, signOut } = useSession();
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState(user.name);
  const [newEmail, setNewEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [deletePw, setDeletePw] = useState('');

  const sessions = useQuery({ queryKey: ['sessions'], queryFn: async () => (await call(client.GET('/auth/sessions'))).sessions });

  async function task(key: string, work: () => Promise<string | void>) {
    setBusy(key);
    setMsg(null);
    try {
      const text = await work();
      if (text) setMsg({ kind: 'success', text });
    } catch (e) {
      setMsg({ kind: 'error', text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen title="Account" subtitle={user.email} header>
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}

      <View className="gap-3">
        <TextField label="Name" value={name} onChangeText={setName} maxLength={80} />
        <Button
          title="Save name"
          variant="secondary"
          loading={busy === 'name'}
          disabled={!name.trim() || name.trim() === user.name}
          onPress={() =>
            task('name', async () => {
              setUser((await call(client.PATCH('/auth/profile', { body: { name: name.trim() } }))).user);
              return 'Name updated.';
            })
          }
        />
      </View>

      <Card>
        <AppText variant="headline">Change email</AppText>
        <TextField label="New email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" />
        <Button
          title="Send approval link"
          variant="secondary"
          loading={busy === 'email'}
          disabled={!newEmail.trim()}
          onPress={() =>
            task('email', async () => {
              await call(client.POST('/auth/change-email', { body: { newEmail: newEmail.trim() } }));
              setNewEmail('');
              return `We emailed ${user.email}. Approve the change there, then confirm the new address.`;
            })
          }
        />
      </Card>

      <Card>
        <AppText variant="headline">Change password</AppText>
        <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
        <TextField label="New password" value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" autoComplete="new-password" hint="At least 8 characters." />
        <ToggleRow label="Sign out other devices" value={revokeOthers} onValueChange={setRevokeOthers} />
        <Button
          title="Update password"
          loading={busy === 'password'}
          disabled={!current || next.length < 8}
          onPress={() =>
            task('password', async () => {
              await call(client.POST('/auth/change-password', { body: { currentPassword: current, newPassword: next, revokeOtherSessions: revokeOthers } }));
              setCurrent('');
              setNext('');
              void sessions.refetch();
              return 'Password updated.';
            })
          }
        />
      </Card>

      <View className="gap-2">
        <AppText variant="label" tone="muted">
          Signed-in devices
        </AppText>
        <Card className="gap-0 py-1">
          {(sessions.data ?? []).map((s, i) => (
            <View key={s.id} className={`flex-row items-center justify-between gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <View className="flex-1">
                <AppText className="font-medium" numberOfLines={1}>
                  {s.userAgent ? s.userAgent.slice(0, 40) : 'Unknown device'}
                  {s.current ? ' (this device)' : ''}
                </AppText>
                <AppText variant="caption" tone="muted">
                  Since {s.createdAt.slice(0, 10)}
                  {s.ipAddress ? ` · ${s.ipAddress}` : ''}
                </AppText>
              </View>
              {!s.current ? (
                <Button
                  title="Sign out"
                  variant="ghost"
                  disabled={busy !== null}
                  onPress={() =>
                    task('revoke', async () => {
                      await call(client.DELETE('/auth/sessions/{id}', { params: { path: { id: s.id } } }));
                      await sessions.refetch();
                    })
                  }
                />
              ) : null}
            </View>
          ))}
          {sessions.isPending ? <AppText tone="muted" className="py-3">Loading…</AppText> : null}
        </Card>
      </View>

      <Card className="border-destructive">
        <AppText variant="headline" tone="destructive">
          Delete account
        </AppText>
        <AppText tone="muted">Removes your account and the funds you own. Transfer or delete shared funds first.</AppText>
        <TextField label="Your password" value={deletePw} onChangeText={setDeletePw} secureTextEntry autoCapitalize="none" />
        <Button
          title="Delete my account"
          variant="destructive"
          loading={busy === 'delete'}
          disabled={!deletePw}
          onPress={async () => {
            const sure = await confirm('Delete your account?', 'This cannot be undone.', 'Delete');
            if (!sure) return;
            await task('delete', async () => {
              await call(client.DELETE('/auth/account', { body: { password: deletePw } }));
              await signOut();
            });
          }}
        />
      </Card>
    </Screen>
  );
}
