import { Stack } from 'expo-router';

import { VerifyEmailGate } from '@/components/verify-email-gate';
import { useSession } from '@/auth/session';
import { FundProvider, useFund } from '@/fund/context';
import { OnboardingWizard } from '@/fund/onboarding';
import { OutboxProvider } from '@/fund/outbox';

const SHEET = { presentation: 'formSheet' as const, sheetAllowedDetents: [0.95], sheetGrabberVisible: true, sheetCornerRadius: 20 };

function Gate() {
  const { payload } = useFund();
  // A new owner sets the fund up before seeing an empty overview.
  if (payload.needsOnboarding) return <OnboardingWizard />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="switch-fund" options={{ ...SHEET, sheetAllowedDetents: [0.5, 0.95] }} />
      <Stack.Screen name="item/new" options={SHEET} />
      <Stack.Screen name="item/[id]" options={SHEET} />
      <Stack.Screen name="contribution/new" options={SHEET} />
      <Stack.Screen name="contribution/[id]" options={SHEET} />
      <Stack.Screen name="payday/[date]" options={SHEET} />
      <Stack.Screen name="fund-settings" options={SHEET} />
      <Stack.Screen name="sharing" options={SHEET} />
      <Stack.Screen name="account" options={SHEET} />
    </Stack>
  );
}

export default function AppLayout() {
  const { user } = useSession();
  // Fund actions need a verified address (the API answers 403 otherwise).
  if (!user?.emailVerified) return <VerifyEmailGate />;
  return (
    <OutboxProvider>
      <FundProvider>
        <Gate />
      </FundProvider>
    </OutboxProvider>
  );
}
