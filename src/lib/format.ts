const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parse(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12));
}

const formatters = new Map<string, Intl.NumberFormat | null>();

/** An Intl formatter when the label is a real ISO 4217 code, otherwise null (not every JS engine knows every code). */
function currencyFormatter(label: string): Intl.NumberFormat | null {
  const code = label.trim().toUpperCase();
  const cached = formatters.get(code);
  if (cached !== undefined) return cached;
  let formatter: Intl.NumberFormat | null = null;
  if (/^[A-Z]{3}$/.test(code)) {
    try {
      formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
      });
    } catch {
      formatter = null;
    }
  }
  formatters.set(code, formatter);
  return formatter;
}

/** Real codes (KES, USD) format with Intl; any other label is shown as typed. */
export function money(currency: string, amount: number): string {
  const rounded = Math.round(amount);
  const formatter = currencyFormatter(currency);
  if (formatter) return formatter.format(rounded);
  return `${currency} ${rounded.toLocaleString('en-US')}`;
}

export function fmtDate(value: string, withYear = false): string {
  const date = parse(value);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${withYear ? ` ${date.getUTCFullYear()}` : ''}`;
}

export function fmtLong(value: string, withYear = false): string {
  const date = parse(value);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${withYear ? ` ${date.getUTCFullYear()}` : ''}`;
}

/** "October 2026" for an ISO date. */
export function fmtMonth(value: string): string {
  const date = parse(value);
  return `${LONG_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** "12 days" up to six weeks, then whole months, so "0 months" never shows. */
export function lateBy(days: number): string {
  if (days <= 45) return plural(Math.max(1, days), 'day');
  return plural(Math.round(days / 30), 'month');
}

/** Local calendar date of a JS Date as YYYY-MM-DD (what a date picker returns). */
export function isoFromDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A local Date for a YYYY-MM-DD string (noon, so DST never shifts the day). */
export function dateFromIso(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

/** Strip everything but digits (amount fields). */
export function digitsOnly(text: string): string {
  return text.replace(/[^0-9]/g, '');
}
