import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface RequestContext {
  correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function resolveCorrelationId(value: unknown): string {
  // Başlığın log satırını bozmasını ve sınırsız büyümesini engeller.
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : randomUUID();
}