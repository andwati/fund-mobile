import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useSession } from '@/auth/session';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField, type TextInputRef } from '@/components/ui/text-field';

export default function SignIn() {
  const { signIn } = useSession();
  const password = useRef<TextInputRef>(null);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(await call(client.POST('/auth/sign-in', { body: { email: email.trim(), password: pw } })));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen title="Welcome back" subtitle="Sign in to see where your fund stands.">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <View className="gap-4">
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => password.current?.focus()}
        />
        <TextField
          ref={password}
          label="Password"
          value={pw}
          onChangeText={setPw}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>
      <Button title="Sign in" block loading={busy} disabled={!email.trim() || !pw} onPress={submit} />
      <View className="items-center gap-3">
        <Link href="/forgot-password" asChild>
          <AppText tone="accent" className="font-medium">
            Forgot your password?
          </AppText>
        </Link>
        <Link href="/sign-up" asChild>
          <AppText tone="muted">
            New here? <AppText tone="accent" className="font-medium">Create an account</AppText>
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}
