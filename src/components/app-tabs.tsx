import { NativeTabs } from 'expo-router/native-tabs';
import { useCSSVariable } from 'uniwind';

export default function AppTabs() {
  const [background, foreground, surface] = useCSSVariable([
    '--color-background',
    '--color-foreground',
    '--color-surface',
  ]) as [string, string, string];

  return (
    <NativeTabs backgroundColor={background} indicatorColor={surface} labelStyle={{ selected: { color: foreground } }}>
      <NativeTabs.Trigger name="overview">
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.pie.fill" md="pie_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
