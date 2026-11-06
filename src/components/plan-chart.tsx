import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';

import type { FundProgress } from '@/lib/plan';
import { daysBetween } from '@/lib/plan';
import { fmtDate, money } from '@/lib/format';

import { AppText } from './ui/text';

const HEIGHT = 170;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };

/** The plan (dashed) against what has actually been saved, with a marker for today. */
export function PlanChart({ progress, currency }: { progress: FundProgress; currency: string }) {
  const [width, setWidth] = useState(0);
  const [accent, muted, border, foreground] = useCSSVariable([
    '--color-accent',
    '--color-muted',
    '--color-border',
    '--color-foreground',
  ]) as [string, string, string, string];

  const start = progress.earliestStart;
  const end = progress.latestDeadline;
  if (!start || !end || progress.planLine.length === 0) return null;

  const span = Math.max(1, daysBetween(start, end));
  const maxY = Math.max(progress.target, ...progress.actualLine.map((p) => p.amount), 1);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (date: string) => PAD.left + (Math.min(Math.max(daysBetween(start, date), 0), span) / span) * innerW;
  const y = (amount: number) => PAD.top + innerH - (Math.min(amount, maxY) / maxY) * innerH;

  const path = (points: { date: string; amount: number }[], step: boolean) =>
    points
      .map((p, i) => {
        const px = x(p.date).toFixed(1);
        const py = y(p.amount).toFixed(1);
        if (i === 0) return `M${px},${py}`;
        // Savings are steps (money arrives on a day); the plan is a straight ramp.
        return step ? `H${px}V${py}` : `L${px},${py}`;
      })
      .join('');

  const todayX = x(progress.today);
  const showToday = progress.today >= start && progress.today <= end;
  const actual = progress.actualLine.length > 0 ? path(progress.actualLine, true) : '';

  return (
    <View className="gap-2">
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel={`Plan against savings, ${money(currency, progress.saved)} saved of ${money(currency, progress.target)}`}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Line x1={PAD.left} x2={PAD.left + innerW} y1={y(0)} y2={y(0)} stroke={border} strokeWidth={1} />
            <Line x1={PAD.left} x2={PAD.left + innerW} y1={y(maxY)} y2={y(maxY)} stroke={border} strokeWidth={1} strokeDasharray="2 4" />
            {showToday ? <Line x1={todayX} x2={todayX} y1={PAD.top} y2={y(0)} stroke={muted} strokeWidth={1} strokeDasharray="3 3" /> : null}
            <Path d={path(progress.planLine, false)} stroke={muted} strokeWidth={2} strokeDasharray="6 5" fill="none" />
            {actual ? <Path d={actual} stroke={accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" /> : null}
            <SvgText x={PAD.left} y={HEIGHT - 6} fill={foreground} fontSize={11} opacity={0.6}>
              {fmtDate(start)}
            </SvgText>
            <SvgText x={PAD.left + innerW} y={HEIGHT - 6} fill={foreground} fontSize={11} opacity={0.6} textAnchor="end">
              {fmtDate(end)}
            </SvgText>
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} />
        )}
      </View>
      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-0.5 w-4 rounded-full bg-accent" />
          <AppText variant="caption" tone="muted">
            Saved
          </AppText>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-0.5 w-4 rounded-full bg-muted" />
          <AppText variant="caption" tone="muted">
            Plan
          </AppText>
        </View>
      </View>
    </View>
  );
}
