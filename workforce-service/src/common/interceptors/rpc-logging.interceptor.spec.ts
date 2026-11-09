import { Logger } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { defer, firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestContext } from '../logging/request-context.js';
import { RpcLoggingInterceptor } from './rpc-logging.interceptor.js';

function fixture(payload: unknown) {
  const args = [payload];
  const context = {
    switchToRpc: () => ({ getData: () => args[0] }),
    getArgs: () => args,
    getHandler: () => function createTeam() {},
  } as unknown as ExecutionContext;
  return { args, context };
}

afterEach(() => vi.restoreAllMocks());
describe('RpcLoggingInterceptor', () => {
  it.each([1, { name: 'Ekip' }, {}])(
    'zarfı açar ve orijinal veriyi controller için korur: %j',
    async (data) => {
      const log = vi
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);
      const { args, context } = fixture({ correlationId: 'trace-23', data });
      await firstValueFrom(
        new RpcLoggingInterceptor().intercept(context, {
          handle: () =>
            defer(() => {
              expect(args[0]).toBe(data);
              expect(requestContext.getStore()?.correlationId).toBe('trace-23');
              return of('ok');
            }),
        }),
      );
      expect(JSON.parse(log.mock.calls[0][0] as string).correlationId).toBe(
        'trace-23',
      );
      expect(requestContext.getStore()).toBeUndefined();
    },
  );
  it('409 hatasını aynı kimlikle loglar ve değiştirmeden iletir', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { context } = fixture({
      correlationId: 'conflict-23',
      data: { phone: '5321234567' },
    });
    const error = new RpcException({
      statusCode: 409,
      message: 'secret-password',
    });
    await expect(
      firstValueFrom(
        new RpcLoggingInterceptor().intercept(context, {
          handle: () => throwError(() => error),
        }),
      ),
    ).rejects.toBe(error);
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toMatchObject({
      correlationId: 'conflict-23',
      statusCode: 409,
    });
    expect(warn.mock.calls[0][0]).not.toMatch(/5321234567|secret-password/);
  });
  it('eski zarfsız mesajın verisini korur', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { context, args } = fixture(5);
    await firstValueFrom(
      new RpcLoggingInterceptor().intercept(context, {
        handle: () => of('ok'),
      }),
    );
    expect(args[0]).toBe(5);
  });
});