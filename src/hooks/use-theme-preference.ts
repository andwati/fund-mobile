import { Uniwind, useUniwind } from 'uniwind';

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Light / dark / system preference, backed by Uniwind.
 * TODO: persist the choice once the storage layer is decided; for now it resets on launch.
 */
export function useThemePreference() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const preference: ThemePreference = hasAdaptiveThemes ? 'system' : (theme as ThemePreference);

  return {
    preference,
    /** The theme actually being rendered. */
    resolved: theme === 'dark' ? ('dark' as const) : ('light' as const),
    setPreference: (next: ThemePreference) => Uniwind.setTheme(next),
  };
}
