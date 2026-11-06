import { Stack } from 'expo-router';

import { VerifyEmailGate } from '@/components/verify-email-gate';
import { useSession } from '@/auth/session';
import { FundProvider, useFund } from '@/fund/context';
import { OnboardingWizard } from '@/fund/onboarding';

function Gate() {
  const { payload } = useFund();
  // A new owner sets the fund up before seeing an empty overview.
  if (payload.needsOnboarding) return <OnboardingWizard />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="switch-fund"
        options={{ presentation: 'formSheet', sheetAllowedDetents: [0.5, 0.9], sheetGrabberVisible: true, sheetCornerRadius: 20 }}
      />
    </Stack>
  );
}

export default function AppLayout() {
  const { user } = useSession();
  // Fund actions need a verified address (the API answers 403 otherwise).
  if (!user?.emailVerified) return <VerifyEmailGate />;
  return (
    <FundProvider>
      <Gate />
    </FundProvider>
  );
}
