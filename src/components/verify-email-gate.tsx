import { useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useSession, useUser } from '@/auth/session';

import { Button } from './ui/button';
import { Notice } from './ui/notice';
import { Screen } from './ui/screen';

export function VerifyEmailGate() {
  const user = useUser();
  const { refreshUser, signOut } = useSession();
  const [busy, setBusy] = useState<'resend' | 'check' | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  async function resend() {
    setBusy('resend');
    try {
      await call(client.POST('/auth/send-verification-email', { body: { email: user.email } }));
      setMessage({ kind: 'success', text: 'Sent. It can take a minute to arrive; check spam too.' });
    } catch (e) {
      setMessage({ kind: 'error', text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    setBusy('check');
    const fresh = await refreshUser();
    setBusy(null);
    if (fresh && !fresh.emailVerified) setMessage({ kind: 'info', text: 'Not verified yet. Open the link in the email first.' });
  }

  return (
    <Screen title="Verify your email" subtitle={`We sent a link to ${user.email}. Open it to start using Fund.`}>
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
      <Button title="I have verified it" block loading={busy === 'check'} onPress={check} />
      <Button title="Send the email again" variant="secondary" block loading={busy === 'resend'} onPress={resend} />
      <View className="items-center">
        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
