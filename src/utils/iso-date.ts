const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function diffIsoDays(from: string, to: string): number {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);

  return Math.round((toDate.getTime() - fromDate.getTime()) / MILLISECONDS_IN_DAY);
}

export function addIsoDays(date: string, days: number): string {
  const baseDate = parseIsoDate(date);
  baseDate.setUTCDate(baseDate.getUTCDate() + days);

  return formatIsoDate(baseDate);
}

export function getIsoDateDaysAgoInclusive(today: string, days: number): string {
  return addIsoDays(today, -(days - 1));
}
