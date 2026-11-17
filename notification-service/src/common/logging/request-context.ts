import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
export const requestContext = new AsyncLocalStorage<{
  correlationId: string;
}>();
export function resolveCorrelationId(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : randomUUID();
}
