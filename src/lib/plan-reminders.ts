// From the web app (~/dev/fund/src/plan/reminders.ts).
import { daysBetween, type FundProgress, hourIn, todayIn } from "./plan";

/** Once per fund-local day, not before 8:00 local (hourly cron may catch up later). */
export function reminderSendAllowed(
  timezone: string,
  lastReminderOn: string | null,
  now = new Date(),
): boolean {
  const today = todayIn(timezone, now);
  if (lastReminderOn === today) return false;
  return hourIn(timezone, now) >= 8;
}

/**
 * Paydays from today on, soonest first, without skipped ones. Reminders and the
 * calendar export both read this, so they cannot disagree.
 */
export function upcomingPaydays(progress: FundProgress): string[] {
  return progress.schedule
    .filter((row) => !row.skipped && row.date >= progress.today)
    .map((row) => row.date);
}

/**
 * What the fund is asked to set aside on `date`: the adjusted amount when the
 * payday has one, else this payday's share of the plan (the usual amount for
 * a payday further out).
 */
export function expectedOn(progress: FundProgress, date: string): number {
  const row = progress.schedule.find((entry) => entry.date === date);
  if (row?.adjusted != null) return row.adjusted;
  return date === progress.nextPayday ? progress.needed : progress.usual;
}

/** The payday to remind about: the next one, when it is tomorrow and money is needed. */
export function reminderPayday(progress: FundProgress): string | null {
  const next = upcomingPaydays(progress)[0];
  if (!next || progress.needed <= 0) return null;
  return daysBetween(progress.today, next) === 1 ? next : null;
}
