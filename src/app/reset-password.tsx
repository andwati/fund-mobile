import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy || !token) return;
    setBusy(true);
    setError(null);
    try {
      await call(client.POST('/auth/reset-password', { body: { token, password: pw } }));
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <Screen title="Reset your password">
        <Notice kind="error">That link is incomplete. Open it again from the email, or request a new one.</Notice>
        <Link href="/forgot-password" asChild>
          <AppText tone="accent" className="text-center font-medium">
            Request a new link
          </AppText>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen title="Choose a new password">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {done ? (
        <>
          <Notice kind="success" title="Password updated">
            You can sign in with your new password.
          </Notice>
          <Link href="/sign-in" asChild>
            <Button title="Go to sign in" block />
          </Link>
        </>
      ) : (
        <>
          <TextField
            label="New password"
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            hint="At least 8 characters."
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Button title="Update password" block loading={busy} disabled={pw.length < 8} onPress={submit} />
        </>
      )}
    </Screen>
  );
}
