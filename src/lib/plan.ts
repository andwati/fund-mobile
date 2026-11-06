// Copied verbatim from the web app (~/dev/fund/src/plan/index.ts); the Go backend is tested against this exact code.
// Do not edit here without changing the web app and regenerating the backend's parity vectors.
export type ItemInput = {
  id: string;
  name: string;
  price: number;
  deadline: string;
  planStart: string;
};

export type AllocationInput = {
  itemId: string;
  amount: number;
};

export type ContributionKind = "deposit" | "withdrawal";

export type ContributionInput = {
  id: string;
  date: string;
  note: string;
  /**
   * Allocation amounts are always positive; a withdrawal subtracts them.
   * Absent means a deposit, so fixtures and queued deposits can omit it.
   */
  kind?: ContributionKind;
  allocations: AllocationInput[];
};

/**
 * When a fund gets paid: days of the month (31 means the last day, clamped in
 * short months) and individual occurrences (YYYY-MM-DD) that are skipped.
 */
export type PaydaySchedule = {
  days: number[];
  skipped: ReadonlySet<string>;
  /**
   * Expected saving for individual paydays (YYYY-MM-DD to whole currency
   * units). Such a payday weighs `amount / reference` in the plan split
   * instead of 1. Absent means no adjustments.
   */
  amounts?: ReadonlyMap<string, number>;
};

export type PaydayAdjustment = { date: string; amount: number };

export type FundInput = {
  schedule: PaydaySchedule;
  pace: number | null;
  timezone: string;
  items: ItemInput[];
  contributions: ContributionInput[];
  today?: string;
  now?: Date;
};

export type ItemProgress = {
  id: string;
  name: string;
  price: number;
  deadline: string;
  planStart: string;
  contributed: number;
  remaining: number;
  percent: number;
  needed: number;
  paydaysLeft: number;
  planned: number;
  diff: number;
  paydays: string[];
};

export type ScheduleRow = {
  date: string;
  planTotal: number;
  saved: number | null;
  status: "on-plan" | "short" | "next" | "upcoming";
  gap: number;
  /** A skipped payday: no installment falls on it. */
  skipped: boolean;
  /** The adjusted amount the fund expects to save that day, if any. */
  adjusted: number | null;
};

export type ChartPoint = {
  date: string;
  amount: number;
};

export type ItemDeadlineRisk = {
  id: string;
  name: string;
  deadline: string;
  finish: string;
  monthsLate: number;
  daysLate: number;
  requiredPace: number;
};

export type FundProgress = {
  today: string;
  saved: number;
  target: number;
  remaining: number;
  percent: number;
  needed: number;
  /** The usual amount for a payday that is not adjusted. */
  usual: number;
  paydaysLeft: number;
  nextPayday: string | null;
  planned: number;
  diff: number;
  finish: string | null;
  latestDeadline: string | null;
  earliestStart: string | null;
  items: ItemProgress[];
  schedule: ScheduleRow[];
  planLine: ChartPoint[];
  actualLine: ChartPoint[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function todayIn(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day && validDate(`${year}-${month}-${day}`)) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall through to UTC when the timezone is not recognized.
  }
  return now.toISOString().slice(0, 10);
}

/** Milliseconds until the calendar day advances in `timeZone`. */
export function msUntilMidnightIn(timeZone: string, now = new Date()): number {
  const start = now.getTime();
  const today = todayIn(timeZone, now);
  let lo = start;
  let hi = start + 86_400_000 + 3_600_000;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (todayIn(timeZone, new Date(mid)) === today) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.max(0, hi - start);
}

/** Fund-local clock hour, 0–23. Falls back to UTC when the zone is unknown. */
export function hourIn(timeZone: string, now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hour = parts.find((part) => part.type === "hour")?.value;
    if (hour !== undefined) {
      const value = Number(hour);
      if (Number.isFinite(value)) return value % 24;
    }
  } catch {
    // Fall through to UTC when the timezone is not recognized.
  }
  return now.getUTCHours();
}

export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Most paydays `paydaysBetween` returns (4 a month for 10 years). */
const MAX_PAYDAYS = 480;

/**
 * The fund's paydays (1 to 4 days of the month) with the skipped dates and the
 * adjusted amounts. A skipped date never carries an adjustment.
 */
export function scheduleOf(
  fund: { paydays: readonly number[] },
  skips: Iterable<string> = [],
  adjustments: Iterable<PaydayAdjustment> = [],
): PaydaySchedule {
  const days = [...new Set(fund.paydays)].sort((a, b) => a - b);
  const skipped = new Set(skips);
  const amounts = new Map<string, number>();
  for (const { date, amount } of adjustments) {
    if (!skipped.has(date)) amounts.set(date, amount);
  }
  return { days, skipped, amounts };
}

/** How much a payday counts in the plan split: 1, or `amount / reference`. */
function weightOf(
  schedule: PaydaySchedule,
  reference: number,
  date: string,
): number {
  const amount = schedule.amounts?.get(date);
  if (amount === undefined || reference <= 0) return 1;
  return amount / reference;
}

/** Earliest non-skipped payday after (or, if inclusive, at) `from`. */
export function nextPayday(
  from: string,
  inclusive: boolean,
  schedule: PaydaySchedule,
): string | null {
  if (schedule.days.length === 0) return null;
  let year = Number(from.slice(0, 4));
  let monthIndex = Number(from.slice(5, 7)) - 1;
  for (let i = 0; i < 2000; i += 1) {
    const length = daysInMonth(year, monthIndex);
    const dates = schedule.days
      .map((day) => ymd(year, monthIndex + 1, Math.min(day, length)))
      .sort();
    for (const date of dates) {
      if (schedule.skipped.has(date)) continue;
      if (inclusive ? date >= from : date > from) return date;
    }
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
  }
  return null;
}

export function paydaysBetween(
  start: string,
  deadline: string,
  schedule: PaydaySchedule,
): string[] {
  const dates: string[] = [];
  let cursor = start;
  let date = nextPayday(cursor, false, schedule);
  while (date && date <= deadline && dates.length < MAX_PAYDAYS) {
    dates.push(date);
    cursor = date;
    date = nextPayday(cursor, false, schedule);
  }
  return dates;
}

function sign(contribution: Pick<ContributionInput, "kind">): 1 | -1 {
  return contribution.kind === "withdrawal" ? -1 : 1;
}

/** Deposits minus withdrawals: what the contribution adds to the fund. */
function contributionTotal(contribution: ContributionInput): number {
  return (
    sign(contribution) *
    contribution.allocations.reduce(
      (sum, allocation) => sum + allocation.amount,
      0,
    )
  );
}

function allocated(
  itemId: string,
  contributions: ContributionInput[],
  upTo?: string,
): number {
  const net = contributions.reduce((sum, contribution) => {
    if (upTo && contribution.date > upTo) return sum;
    return (
      sum +
      sign(contribution) *
        contribution.allocations.reduce((inner, allocation) => {
          return allocation.itemId === itemId
            ? inner + allocation.amount
            : inner;
        }, 0)
    );
  }, 0);
  // The server keeps ledgers non-negative; never display below zero anyway.
  return Math.max(0, net);
}

/** Net saved per item (deposits minus withdrawals), never below zero. */
export function savedByItem(
  contributions: ReadonlyArray<Pick<ContributionInput, "kind" | "allocations">>,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const contribution of contributions) {
    for (const line of contribution.allocations) {
      totals.set(
        line.itemId,
        (totals.get(line.itemId) ?? 0) + sign(contribution) * line.amount,
      );
    }
  }
  for (const [id, total] of totals) totals.set(id, Math.max(0, total));
  return totals;
}

function plannedOn(
  dates: string[],
  price: number,
  on: string,
  weight: (date: string) => number,
): number {
  if (!dates.length) return 0;
  let total = 0;
  let elapsed = 0;
  for (const date of dates) {
    const w = weight(date);
    total += w;
    if (date <= on) elapsed += w;
  }
  if (total <= 0) return 0;
  return Math.min(price, (price * elapsed) / total);
}

function itemRemaining(
  item: ItemInput,
  contributions: ContributionInput[],
): number {
  return Math.max(0, item.price - allocated(item.id, contributions));
}

function calendarMonthsLate(deadline: string, finish: string): number {
  const dy = Number(deadline.slice(0, 4));
  const dm = Number(deadline.slice(5, 7));
  const fy = Number(finish.slice(0, 4));
  const fm = Number(finish.slice(5, 7));
  return fy * 12 + fm - (dy * 12 + dm);
}

function simulateFinishes(
  today: string,
  schedule: PaydaySchedule,
  pace: number,
  items: Array<{ id: string; remaining: number }>,
): Map<string, string> {
  const left = new Map(items.map((item) => [item.id, item.remaining]));
  const done = new Map<string, string>();
  let date = nextPayday(today, true, schedule);
  for (let step = 0; date && step < 600; step += 1) {
    let pool = schedule.amounts?.get(date) ?? pace;
    for (const item of items) {
      const need = left.get(item.id) ?? 0;
      if (need <= 0) continue;
      const pay = Math.min(pool, need);
      const after = need - pay;
      left.set(item.id, after);
      pool -= pay;
      if (after <= 0 && !done.has(item.id)) done.set(item.id, date);
    }
    if ([...left.values()].every((amount) => amount <= 0)) break;
    date = nextPayday(date, false, schedule);
  }
  return done;
}

function finishesByPace(input: FundInput, pace: number): Map<string, string> {
  const today = input.today ?? todayIn(input.timezone, input.now ?? new Date());
  const items = input.items.map((item) => ({
    id: item.id,
    remaining: itemRemaining(item, input.contributions),
  }));
  return simulateFinishes(today, input.schedule, pace, items);
}

function itemMeetsDeadline(
  input: FundInput,
  pace: number,
  itemId: string,
): boolean {
  const item = input.items.find((entry) => entry.id === itemId);
  if (!item) return true;
  const finish = finishesByPace(input, pace).get(itemId);
  return finish !== undefined && finish <= item.deadline;
}

function minPaceForItem(input: FundInput, itemId: string): number {
  const remaining = input.items.reduce(
    (sum, item) => sum + itemRemaining(item, input.contributions),
    0,
  );
  let lo = 1;
  let hi = Math.max(remaining, input.pace ?? 1);
  while (!itemMeetsDeadline(input, hi, itemId)) {
    hi *= 2;
    if (hi > 1_000_000_000) return hi;
  }
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (itemMeetsDeadline(input, mid, itemId)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function deadlineRisks(input: FundInput): ItemDeadlineRisk[] {
  if (!input.pace || input.pace <= 0) return [];
  const today = input.today ?? todayIn(input.timezone, input.now ?? new Date());
  const items = input.items.map((item) => ({
    id: item.id,
    name: item.name,
    deadline: item.deadline,
    remaining: itemRemaining(item, input.contributions),
  }));
  const finishes = simulateFinishes(
    today,
    input.schedule,
    input.pace,
    items.map(({ id, remaining }) => ({ id, remaining })),
  );
  const risks: ItemDeadlineRisk[] = [];
  for (const item of items) {
    if (item.remaining <= 0) continue;
    const finish = finishes.get(item.id);
    if (!finish || finish <= item.deadline) continue;
    risks.push({
      id: item.id,
      name: item.name,
      deadline: item.deadline,
      finish,
      monthsLate: calendarMonthsLate(item.deadline, finish),
      daysLate: daysBetween(item.deadline, finish),
      requiredPace: minPaceForItem(input, item.id),
    });
  }
  return risks;
}

export function compute(input: FundInput): FundProgress {
  const today = input.today ?? todayIn(input.timezone, input.now ?? new Date());
  const bases = input.items.map((item) => {
    const paydays = paydaysBetween(
      item.planStart,
      item.deadline,
      input.schedule,
    );
    const contributed = allocated(item.id, input.contributions);
    const remaining = Math.max(0, item.price - contributed);
    const future = paydays.filter((date) => date >= today);
    return { item, paydays, contributed, remaining, future };
  });
  // What an unadjusted payday asks for today.
  const usual = bases.reduce((sum, base) => {
    if (base.remaining <= 0) return sum;
    return (
      sum +
      (base.future.length > 0
        ? base.remaining / base.future.length
        : base.remaining)
    );
  }, 0);
  // Without a pace the reference is the full plan's installment, which does not
  // move as money comes in, so a past adjustment keeps its weight.
  const planInstallment = bases.reduce(
    (sum, base) =>
      base.paydays.length > 0
        ? sum + base.item.price / base.paydays.length
        : sum,
    0,
  );
  const reference = input.pace && input.pace > 0 ? input.pace : planInstallment;
  const weight = (date: string) => weightOf(input.schedule, reference, date);
  const items = bases.map(
    ({ item, paydays, contributed, remaining, future }) => {
      const paydaysLeft = future.length;
      const futureWeight = future.reduce((sum, date) => sum + weight(date), 0);
      const first = future[0];
      const needed =
        remaining <= 0
          ? 0
          : first !== undefined && futureWeight > 0
            ? (remaining * weight(first)) / futureWeight
            : remaining;
      const planned = plannedOn(paydays, item.price, today, weight);
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        deadline: item.deadline,
        planStart: item.planStart,
        contributed,
        remaining,
        percent: item.price > 0 ? (contributed / item.price) * 100 : 0,
        needed,
        paydaysLeft,
        planned,
        diff: contributed - planned,
        paydays,
      };
    },
  );

  const saved = Math.max(
    0,
    input.contributions.reduce(
      (sum, contribution) => sum + contributionTotal(contribution),
      0,
    ),
  );
  const target = items.reduce((sum, item) => sum + item.price, 0);
  const remaining = Math.max(0, target - saved);
  const futurePaydays = new Set<string>();
  for (const item of items) {
    if (item.remaining <= 0) continue;
    for (const date of item.paydays) {
      if (date >= today) futurePaydays.add(date);
    }
  }
  const paydaysLeft = futurePaydays.size;
  const needed = items.reduce((sum, item) => sum + item.needed, 0);
  const planned = items.reduce((sum, item) => sum + item.planned, 0);
  const scheduleDates = [
    ...new Set(items.flatMap((item) => item.paydays)),
  ].sort();
  const nextPaydayDate = scheduleDates.find((date) => date >= today) ?? null;
  // Skipped occurrences stay in the schedule rows (struck through) but carry
  // no installment: they are not in any item's `paydays`.
  const unskipped: PaydaySchedule = { ...input.schedule, skipped: new Set() };
  const skippedDates = new Set(
    input.items
      .flatMap((item) =>
        paydaysBetween(item.planStart, item.deadline, unskipped),
      )
      .filter((date) => input.schedule.skipped.has(date)),
  );
  const rowDates = [...new Set([...scheduleDates, ...skippedDates])].sort();
  const latestDeadline = items.reduce<string | null>((latest, item) => {
    if (!latest || item.deadline > latest) return item.deadline;
    return latest;
  }, null);
  const earliestStart = items.reduce<string | null>((earliest, item) => {
    if (!earliest || item.planStart < earliest) return item.planStart;
    return earliest;
  }, null);

  let finish: string | null = null;
  if (input.pace && input.pace > 0 && remaining > 0) {
    let left = remaining;
    let date = nextPayday(today, true, input.schedule);
    for (let count = 0; date && count < 600; count += 1) {
      left -= input.schedule.amounts?.get(date) ?? input.pace;
      if (left <= 0) {
        finish = date;
        break;
      }
      date = nextPayday(date, false, input.schedule);
    }
  }

  const schedule: ScheduleRow[] = rowDates.map((date) => {
    const planTotal = items.reduce(
      (sum, item) => sum + plannedOn(item.paydays, item.price, date, weight),
      0,
    );
    if (skippedDates.has(date)) {
      return {
        date,
        planTotal,
        saved: null,
        status: "upcoming",
        gap: 0,
        skipped: true,
        adjusted: null,
      };
    }
    const past = date <= today;
    const savedBy = past
      ? Math.max(
          0,
          input.contributions.reduce((sum, contribution) => {
            return contribution.date <= date
              ? sum + contributionTotal(contribution)
              : sum;
          }, 0),
        )
      : null;
    let status: ScheduleRow["status"] = "upcoming";
    let gap = 0;
    if (past && savedBy !== null) {
      gap = planTotal - savedBy;
      status = gap <= 0.5 ? "on-plan" : "short";
    } else if (date === nextPaydayDate) {
      status = "next";
    }
    return {
      date,
      planTotal,
      saved: savedBy,
      status,
      gap,
      skipped: false,
      adjusted: input.schedule.amounts?.get(date) ?? null,
    };
  });

  const planLine: ChartPoint[] = [];
  const actualLine: ChartPoint[] = [];
  if (earliestStart) {
    planLine.push({ date: earliestStart, amount: 0 });
    for (const date of scheduleDates) {
      planLine.push({
        date,
        amount: items.reduce(
          (sum, item) =>
            sum + plannedOn(item.paydays, item.price, date, weight),
          0,
        ),
      });
    }
    if (latestDeadline && (planLine.at(-1)?.date ?? "") < latestDeadline) {
      planLine.push({
        date: latestDeadline,
        amount: items.reduce(
          (sum, item) =>
            sum + plannedOn(item.paydays, item.price, latestDeadline, weight),
          0,
        ),
      });
    }

    let running = input.contributions
      .filter((contribution) => contribution.date < earliestStart)
      .reduce((sum, contribution) => sum + contributionTotal(contribution), 0);
    actualLine.push({ date: earliestStart, amount: Math.max(0, running) });
    // Same-day deposits come before withdrawals, as in the server's ledger rule.
    const ordered = input.contributions
      .filter((contribution) => contribution.date >= earliestStart)
      .slice()
      .sort((a, b) =>
        a.date === b.date ? sign(b) - sign(a) : a.date < b.date ? -1 : 1,
      );
    for (const contribution of ordered) {
      running += contributionTotal(contribution);
      actualLine.push({
        date: contribution.date,
        amount: Math.max(0, running),
      });
    }
  }

  return {
    today,
    saved,
    target,
    remaining,
    percent: target > 0 ? (saved / target) * 100 : 0,
    needed,
    usual,
    paydaysLeft,
    nextPayday: nextPaydayDate,
    planned,
    diff: saved - planned,
    finish,
    latestDeadline,
    earliestStart,
    items,
    schedule,
    planLine,
    actualLine,
  };
}
