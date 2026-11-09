import { Logger } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type { Request, Response, NextFunction } from 'express';
import { defer, firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestContext } from '../logging/request-context.js';
import { HttpLoggingInterceptor } from './http-logging.interceptor.js';

function fixture(id?: string) {
  const request = {
    method: 'POST',
    headers: id ? { 'x-correlation-id': id } : {},
    route: { path: '/api/teams/:id' },
    originalUrl: '/api/teams/1?phone=5321234567&token=secret-token',
    body: {
      password: 'secret-password',
      phone: '5321234567',
      hash: 'secret-hash',
    },
    user: { id: 7 },
  } as unknown as Request;
  const response = Object.assign(new EventEmitter(), {
    statusCode: 201,
    setHeader: vi.fn(),
  });
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { request, response, context };
}

afterEach(() => vi.restoreAllMocks());
describe('HttpLoggingInterceptor', () => {
  it('gelen kimliği döndürür, işlem kapsamında tutar ve tamamlanınca tek güvenli satır loglar', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { context, response } = fixture('task23-demo');
    const interceptor = new HttpLoggingInterceptor();
    await firstValueFrom(
      interceptor.intercept(context, {
        handle: () =>
          defer(() => {
            expect(requestContext.getStore()?.correlationId).toBe(
              'task23-demo',
            );
            return of('ok');
          }),
      }),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Correlation-Id',
      'task23-demo',
    );
    expect(log).not.toHaveBeenCalled();
    response.emit('finish');
    expect(log).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(log.mock.calls[0][0] as string);
    expect(entry).toMatchObject({
      correlationId: 'task23-demo',
      method: 'POST',
      address: '/api/teams/:id',
      statusCode: 201,
      userId: 7,
    });
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(log.mock.calls[0][0]).not.toMatch(
      /5321234567|secret-token|secret-password|secret-hash/,
    );
  });

  it('başlık yoksa UUID üretir', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { context, response } = fixture();
    await firstValueFrom(
      new HttpLoggingInterceptor().intercept(context, {
        handle: () => of('ok'),
      }),
    );
    expect(response.setHeader.mock.calls[0][1]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it.each([400, 404, 409, 500, 503])(
    'hatalı istekte filter sonrası gerçek %s kodunu loglar',
    async (statusCode) => {
      const log = vi
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);
      const { context, response } = fixture('error-request');
      await expect(
        firstValueFrom(
          new HttpLoggingInterceptor().intercept(context, {
            handle: () => throwError(() => new Error('secret-password')),
          }),
        ),
      ).rejects.toThrow('secret-password');
      expect(log).not.toHaveBeenCalled();
      response.statusCode = statusCode;
      response.emit('finish');
      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.parse(log.mock.calls[0][0] as string).statusCode).toBe(
        statusCode,
      );
    },
  );

  it('middleware ve interceptor birlikteyken aynı isteği iki kez loglamaz', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { request, response, context } = fixture('once');
    const interceptor = new HttpLoggingInterceptor();
    interceptor.middleware()(
      request,
      response as unknown as Response,
      (() => undefined) as NextFunction,
    );
    await firstValueFrom(
      interceptor.intercept(context, { handle: () => of('ok') }),
    );
    response.emit('finish');
    expect(response.setHeader).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('interceptor çalışmayan route için de kimlik ve tamamlanma logu üretir', () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { request, response } = fixture('not-found');
    response.statusCode = 404;
    new HttpLoggingInterceptor().middleware()(
      request,
      response as unknown as Response,
      (() => undefined) as NextFunction,
    );
    response.emit('finish');
    expect(JSON.parse(log.mock.calls[0][0] as string).statusCode).toBe(404);
  });

  it('eşzamanlı isteklerin kimlikleri birbirine karışmaz', async () => {
    const interceptor = new HttpLoggingInterceptor();
    const requests = ['first', 'second'].map((id) => ({ id, ...fixture(id) }));
    await Promise.all(
      requests.map(({ id, context }) =>
        firstValueFrom(
          interceptor.intercept(context, {
            handle: () =>
              defer(async () => {
                await new Promise((resolve) =>
                  setTimeout(resolve, id === 'first' ? 10 : 1),
                );
                expect(requestContext.getStore()?.correlationId).toBe(id);
                return id;
              }),
          }),
        ),
      ),
    );
    expect(requestContext.getStore()).toBeUndefined();
  });
});