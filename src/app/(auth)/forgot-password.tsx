import { Link } from 'expo-router';
import { useState } from 'react';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await call(client.POST('/auth/request-password-reset', { body: { email: email.trim() } }));
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Reset your password" subtitle="We will email you a link that works once, for one hour.">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {sent ? (
        <Notice kind="success" title="Check your email">
          If that address has an account, a reset link is on its way.
        </Notice>
      ) : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Button title="Send reset link" block loading={busy} disabled={!email.trim()} onPress={submit} />
        </>
      )}
      <Link href="/sign-in" asChild>
        <AppText tone="accent" className="text-center font-medium">
          Back to sign in
        </AppText>
      </Link>
    </Screen>
  );
}
