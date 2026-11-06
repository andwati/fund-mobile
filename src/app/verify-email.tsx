import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useSession } from '@/auth/session';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';

type Outcome =
  | { kind: 'working' }
  | { kind: 'verified' }
  | { kind: 'email-changed' }
  | { kind: 'confirmation-sent' }
  | { kind: 'error'; message: string };

/** Opened from the link in a verification email (verify, approve or finish an email change). */
export default function VerifyEmail() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { signIn, status, refreshUser } = useSession();
  const [result, setOutcome] = useState<Outcome>({ kind: 'working' });
  // A link without a token can never succeed, so show that directly instead of calling the API.
  const outcome: Outcome = token ? result : { kind: 'error', message: 'That link is incomplete. Open it again from the email.' };
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (!token) return;
    started.current = true;
    (async () => {
      try {
        const res = await call(client.POST('/auth/verify-email', { body: { token } }));
        if (res.status === 'verified' && res.token) {
          await signIn({ token: res.token, user: res.user });
          setOutcome({ kind: 'verified' });
        } else if (res.status === 'email-changed') {
          if (status === 'signed-in') await refreshUser();
          setOutcome({ kind: 'email-changed' });
        } else {
          setOutcome({ kind: 'confirmation-sent' });
        }
      } catch (e) {
        setOutcome({ kind: 'error', message: errorMessage(e) });
      }
    })();
  }, [token, signIn, refreshUser, status]);

  const goHome = () => router.replace('/overview');

  return (
    <Screen title="Email">
      {outcome.kind === 'working' ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : null}
      {outcome.kind === 'verified' ? (
        <>
          <Notice kind="success" title="Email verified">
            You are signed in.
          </Notice>
          <Button title="Open Fund" block onPress={goHome} />
        </>
      ) : null}
      {outcome.kind === 'email-changed' ? (
        <>
          <Notice kind="success" title="Email updated">
            Use your new address the next time you sign in.
          </Notice>
          <Button title="Continue" block onPress={goHome} />
        </>
      ) : null}
      {outcome.kind === 'confirmation-sent' ? (
        <>
          <Notice kind="success" title="Change approved">
            We sent a verification link to your new address. Open it to finish.
          </Notice>
          <Button title="Continue" block onPress={goHome} />
        </>
      ) : null}
      {outcome.kind === 'error' ? (
        <>
          <Notice kind="error" title="That did not work">
            {outcome.message}
          </Notice>
          <Button title="Continue" variant="secondary" block onPress={goHome} />
        </>
      ) : null}
    </Screen>
  );
}
