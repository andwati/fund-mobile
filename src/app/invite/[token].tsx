import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useSession } from '@/auth/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { LAST_FUND_KEY } from '@/fund/context';
import { queryClient } from '@/lib/query';
import * as storage from '@/lib/storage';

/** Opened from the link in an invite email: join with your account, or create one in one step. */
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { status, user, signIn, signOut } = useSession();
  const invite = useQuery({
    queryKey: ['invite', token],
    queryFn: async () => (await call(client.GET('/invites/{token}', { params: { path: { token } } }))).invite,
    retry: false,
  });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joined(fundId: string) {
    await storage.setItem(LAST_FUND_KEY, fundId).catch(() => {});
    await queryClient.invalidateQueries({ queryKey: ['funds'] });
    router.replace('/overview');
  }

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await call(client.POST('/invites/{token}/accept', { params: { path: { token } } }));
      queryClient.setQueryData(['fund', res.payload.fund.id], res.payload);
      await joined(res.payload.fund.id);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function signUpAndJoin() {
    setBusy(true);
    setError(null);
    try {
      const res = await call(client.POST('/invites/{token}/accept-signup', { params: { path: { token } }, body: { name: name.trim(), password } }));
      await signIn({ token: res.token, user: res.user });
      await joined(res.fundId);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (invite.isPending) {
    return (
      <Screen title="Invite">
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }
  const info = invite.data;
  if (!info || info.state === 'invalid') {
    return (
      <Screen title="Invite">
        <Notice kind="error" title="This invite is no longer valid">
          It may have been used or withdrawn. Ask the owner to send a new one.
        </Notice>
        <Button title="Continue" variant="secondary" block onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  if (info.state === 'expired') {
    return (
      <Screen title="Invite">
        <Notice kind="warning" title="This invite has expired">
          Ask the owner to send a new one.
        </Notice>
        <Button title="Continue" variant="secondary" block onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const role = info.role === 'editor' ? 'an editor' : 'a viewer';
  const signedIn = status === 'signed-in' && user;

  return (
    <Screen title={`Join ${info.fundName}`}>
      <Card>
        <AppText>
          {info.inviter} invited you to join {info.fundName} as {role}.
        </AppText>
        <AppText variant="caption" tone="muted">
          Invited address: {info.email}
        </AppText>
      </Card>
      {error ? <Notice kind="error">{error}</Notice> : null}

      {signedIn ? (
        user.email.toLowerCase() === info.email?.toLowerCase() ? (
          user.emailVerified ? (
            <Button title={`Join ${info.fundName}`} block loading={busy} onPress={accept} />
          ) : (
            <Notice kind="warning">Verify your email first, then open this link again.</Notice>
          )
        ) : (
          <>
            <Notice kind="warning" title="Different account">
              {`This invite was sent to ${info.email}, but you are signed in as ${user.email}.`}
            </Notice>
            <Button title="Sign out" variant="secondary" block onPress={signOut} />
          </>
        )
      ) : info.account === 'verified' ? (
        <>
          <Notice>{`There is already an account for ${info.email}. Sign in with it, then open this link again.`}</Notice>
          <Button title="Sign in" block onPress={() => router.push('/sign-in')} />
        </>
      ) : (
        <View className="gap-4">
          <AppText tone="muted">Choose a name and password to create your account and join in one step.</AppText>
          <TextField label="Name" value={name} onChangeText={setName} autoComplete="name" />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" hint="At least 8 characters." />
          <Button title="Create account and join" block loading={busy} disabled={!name.trim() || password.length < 8} onPress={signUpAndJoin} />
        </View>
      )}
    </Screen>
  );
}
