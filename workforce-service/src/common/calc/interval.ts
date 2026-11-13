export interface Interval {
  startAt: Date;
  endAt: Date;
}

export function intersectionMinutes(a: Interval, b: Interval): number {
  const values = [
    a.startAt.getTime(),
    a.endAt.getTime(),
    b.startAt.getTime(),
    b.endAt.getTime(),
  ];
  if (
    !values.every(Number.isFinite) ||
    values[1] < values[0] ||
    values[3] < values[2]
  )
    throw new RangeError('Geçersiz zaman aralığı');
  // [start, end): yalnız sınırda dokunan aralıkların kesişimi sıfırdır.
  return (
    Math.max(
      0,
      Math.min(values[1], values[3]) - Math.max(values[0], values[2]),
    ) / 60_000
  );
}