export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;
export const dateKey = (instant: number, offset: number) =>
  new Date(instant + offset * MINUTE).toISOString().slice(0, 10);
export function localMidnight(date: string, offset: number): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new RangeError('Geçersiz yerel tarih');
  const value = Date.parse(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(value) ||
    new Date(value).toISOString().slice(0, 10) !== date
  )
    throw new RangeError('Geçersiz yerel tarih');
  return value - offset * MINUTE;
}
export function weekStart(instant: number, offset: number): number {
  const wall = instant + offset * MINUTE;
  return (
    (Math.floor(wall / DAY) - ((new Date(wall).getUTCDay() + 6) % 7)) * DAY -
    offset * MINUTE
  );
}