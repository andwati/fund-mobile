import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { PlanChart } from '@/components/plan-chart';
import { ItemRow } from '@/components/item-row';
import { StatusChip } from '@/components/status-chip';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Stat } from '@/components/ui/stat';
import { AppText } from '@/components/ui/text';
import { useFund } from '@/fund/context';
import { fmtDate, fmtLong, lateBy, money, plural } from '@/lib/format';
import { daysBetween, deadlineRisks, type FundProgress, scheduleOf } from '@/lib/plan';
import { catchUp, standing } from '@/lib/status';

export default function Overview() {
  const { payload, progress, currency, refresh, refreshing } = useFund();
  const hasItems = progress.items.length > 0;

  const risks = useMemo(() => {
    const active = payload.items.filter((entry) => !entry.archived);
    const ids = new Set(active.map((entry) => entry.id));
    return deadlineRisks({
      schedule: scheduleOf(payload.fund, payload.skips, payload.adjustments),
      pace: payload.fund.pace,
      timezone: payload.fund.timezone,
      items: active,
      contributions: payload.contributions.map((entry) => ({
        ...entry,
        allocations: entry.allocations.filter((line) => ids.has(line.itemId)),
      })),
    });
  }, [payload]);

  return (
    <Screen bottomInset={120} onRefresh={() => void refresh()} refreshing={refreshing}>
      <FundHeader />
      {hasItems ? (
        <>
          <Hero progress={progress} currency={currency} />
          <CatchUpNote progress={progress} currency={currency} />
          <DeadlineRiskNote risks={risks} pace={payload.fund.pace} currency={currency} />
          <Strip progress={progress} currency={currency} pace={payload.fund.pace} />
          <Card>
            <AppText variant="headline">Plan</AppText>
            <PlanChart progress={progress} currency={currency} />
          </Card>
          <View className="gap-1">
            <AppText variant="headline" className="px-1">
              Items
            </AppText>
            <Card className="gap-0 py-1">
              {progress.items.map((item, i) => (
                <View key={item.id} className={i > 0 ? 'border-t border-border' : ''}>
                  <ItemRow item={item} currency={currency} />
                </View>
              ))}
            </Card>
          </View>
        </>
      ) : (
        <Card>
          <AppText variant="headline">Welcome. Start with your first item</AppText>
          <AppText tone="muted">Add what you are saving for and when you need it. Fund spreads the cost over your paydays.</AppText>
        </Card>
      )}
    </Screen>
  );
}

/** The fund name doubles as the switcher. */
function FundHeader() {
  const { payload, funds } = useFund();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${payload.fund.name}. Switch fund`}
      onPress={() => router.push('/switch-fund')}
      className="flex-row items-center gap-2 self-start">
      <AppText variant="title" numberOfLines={1} className="shrink">
        {payload.fund.name}
      </AppText>
      {funds.length > 1 || payload.role === 'owner' ? (
        <AppText variant="headline" tone="muted">
          ▾
        </AppText>
      ) : null}
    </Pressable>
  );
}

function Hero({ progress, currency }: { progress: FundProgress; currency: string }) {
  const percent = Math.max(0, progress.percent);
  const state = standing({ target: progress.target, remaining: progress.remaining, diff: progress.diff });
  const funded = state.kind === 'funded';
  const days = progress.nextPayday ? daysBetween(progress.today, progress.nextPayday) : null;
  const nextSub = days === null ? 'No payday left on the plan' : days === 0 ? 'Today' : `In ${plural(days, 'day')}`;
  const neededSub =
    progress.paydaysLeft > 0 ? `Over ${plural(progress.paydaysLeft, 'payday')} still on the plan` : 'No payday left before the deadlines';

  return (
    <Card className="gap-5 p-5">
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <AppText variant="label" tone="muted">
            Saved so far
          </AppText>
          {state.kind !== 'none' ? <StatusChip kind={state.kind} amount={state.amount} currency={currency} /> : null}
        </View>
        <View className="gap-0.5">
          <AppText variant="figure" numeric adjustsFontSizeToFit numberOfLines={1}>
            {money(currency, progress.saved)}
          </AppText>
          <AppText tone="muted" numeric>
            of {money(currency, progress.target)}
          </AppText>
        </View>
        <ProgressBar value={Math.min(100, percent)} label="Progress toward the items" />
        <View className="flex-row flex-wrap justify-between gap-x-4">
          <AppText variant="caption" tone="muted">
            {Math.round(percent)}% saved
          </AppText>
          <AppText variant="caption" tone="muted" numeric>
            The plan expects {money(currency, progress.planned)} by today
          </AppText>
        </View>
      </View>
      <View className="gap-4 border-t border-border pt-4">
        {funded ? (
          <AppText tone="success">You have reached the target. Nothing more is needed this payday.</AppText>
        ) : (
          <>
            <Stat label="Next payday" value={progress.nextPayday ? fmtLong(progress.nextPayday) : 'None'} detail={nextSub} />
            <Stat label="Needed this payday" value={money(currency, progress.needed)} detail={neededSub} />
          </>
        )}
      </View>
    </Card>
  );
}

function DeadlineRiskNote({ risks, pace, currency }: { risks: ReturnType<typeof deadlineRisks>; pace: number | null; currency: string }) {
  if (!pace || risks.length === 0) return null;
  const needed = Math.max(...risks.map((risk) => risk.requiredPace));
  const first = risks[0];
  const head =
    risks.length === 1 ? `${first?.name} misses its deadline` : `${risks.length} items miss their deadlines`;
  const detail = risks.map((r) => `${r.name}: ${lateBy(r.daysLate)} late, finishing ${fmtDate(r.finish)} against ${fmtDate(r.deadline)}.`).join('\n');
  return (
    <Notice kind="warning" title={`At ${money(currency, pace)} per payday, ${head}`}>
      {`Raise pace to ${money(currency, needed)} to make ${risks.length === 1 ? 'it' : 'all of them'}.\n${detail}`}
    </Notice>
  );
}

/** When behind plan, a concrete way back: spread the gap over the paydays left. */
function CatchUpNote({ progress, currency }: { progress: FundProgress; currency: string }) {
  const plan = catchUp({ diff: progress.diff, paydaysLeft: progress.paydaysLeft });
  if (!plan || progress.remaining <= 0) return null;
  return (
    <Notice kind="warning" title={`Back on plan in ${plural(plan.paydays, 'payday')}`}>
      {`You are ${money(currency, plan.shortfall)} behind. Setting aside an extra ${money(currency, Math.ceil(plan.perPayday))} on each remaining payday, on top of what each item needs, closes the gap.`}
    </Notice>
  );
}

function Strip({ progress, currency, pace }: { progress: FundProgress; currency: string; pace: number | null }) {
  const funded = progress.target > 0 && progress.remaining <= 0;
  return (
    <View className="gap-5 px-1">
      <Stat label="Remaining" value={money(currency, progress.remaining)} detail={funded ? 'Target reached' : 'Still to set aside'} />
      <Stat
        label="Projected finish"
        value={progress.finish && pace ? fmtDate(progress.finish, true) : funded ? 'Done' : 'Not set'}
        detail={
          progress.finish && pace
            ? `Saving ${money(currency, pace)} each payday covers the rest.`
            : funded
              ? 'You have reached the target.'
              : 'Add what you can save per payday in Settings to see when the fund would be covered.'
        }
      />
      <Stat
        label="Latest deadline"
        value={progress.latestDeadline ? fmtDate(progress.latestDeadline, true) : 'None'}
        detail={`${plural(progress.items.length, 'item')} on the plan`}
      />
    </View>
  );
}
