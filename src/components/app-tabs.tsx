import { NativeTabs } from 'expo-router/native-tabs';
import { useCSSVariable } from 'uniwind';

export default function AppTabs() {
  const [background, foreground, surface] = useCSSVariable([
    '--color-background',
    '--color-foreground',
    '--color-surface',
  ]) as [string, string, string];

  return (
    <NativeTabs
      backgroundColor={background}
      indicatorColor={surface}
      labelStyle={{ selected: { color: foreground } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
