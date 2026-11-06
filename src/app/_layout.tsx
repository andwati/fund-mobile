import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import { SessionProvider, useSession } from '@/auth/session';
import { useThemePreference } from '@/hooks/use-theme-preference';
import { queryClient } from '@/lib/query';

SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signed-in'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signed-out'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* Reachable from email links whether or not someone is signed in. */}
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="invite/[token]" />
    </Stack>
  );
}

export default function RootLayout() {
  const { resolved } = useThemePreference();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
          <ThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
            <Navigator />
          </ThemeProvider>
        </SafeAreaListener>
      </SessionProvider>
    </QueryClientProvider>
  );
}
