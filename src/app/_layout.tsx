import '@/global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import AppTabs from '@/components/app-tabs';
import { useThemePreference } from '@/hooks/use-theme-preference';

export default function RootLayout() {
  const { resolved } = useThemePreference();

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <ThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
        <AppTabs />
      </ThemeProvider>
    </SafeAreaListener>
  );
}
