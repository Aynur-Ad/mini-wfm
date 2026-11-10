export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Array.from(value).length >= 8 &&
    Buffer.byteLength(value, 'utf8') <= 72
  );
}

export function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}