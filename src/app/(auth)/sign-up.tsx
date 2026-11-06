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

export default function SignUp() {
  const { signIn } = useSession();
  const emailRef = useRef<TextInputRef>(null);
  const passwordRef = useRef<TextInputRef>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weak = pw.length > 0 && pw.length < 8;

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(await call(client.POST('/auth/sign-up', { body: { name: name.trim(), email: email.trim(), password: pw } })));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen title="Create your account" subtitle="Plan what you are saving for, one payday at a time.">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <View className="gap-4">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={pw}
          onChangeText={setPw}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          error={weak ? 'Use at least 8 characters.' : null}
          hint="At least 8 characters."
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>
      <Button title="Create account" block loading={busy} disabled={!name.trim() || !email.trim() || pw.length < 8} onPress={submit} />
      <View className="items-center">
        <Link href="/sign-in" asChild>
          <AppText tone="muted">
            Already have an account? <AppText tone="accent" className="font-medium">Sign in</AppText>
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}
