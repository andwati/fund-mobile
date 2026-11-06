import { Stack } from 'expo-router';

import { useSession } from '@/auth/session';
import { VerifyEmailGate } from '@/components/verify-email-gate';

export default function AppLayout() {
  const { user } = useSession();
  // Fund actions need a verified address (the API answers 403 otherwise).
  if (!user?.emailVerified) return <VerifyEmailGate />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
