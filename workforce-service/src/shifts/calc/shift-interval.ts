const HOUR = 60 * 60 * 1000;

export function validShiftDuration(start: Date, end: Date): boolean {
  const duration = end.getTime() - start.getTime();
  return Number.isFinite(duration) && duration >= HOUR && duration <= 12 * HOUR;
}