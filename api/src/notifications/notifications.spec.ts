import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { firstValueFrom, NEVER, of, TimeoutError } from 'rxjs';
import type { ClientProxy } from '@nestjs/microservices';
import type { ArgumentsHost } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { QueryNotificationsDto } from './query-notifications.dto.js';
import { requestContext } from '../common/logging/request-context.js';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import { AccountRole } from '../accounts/account-role.js';
afterEach(() => vi.useRealTimers());
describe('Bildirim API doğrulama ve TCP', () => {
  it.each([
    {},
    { workforceUserId: 0 },
    { workforceUserId: 'bad' },
    { workforceUserId: 1, page: 0 },
    { workforceUserId: 1, limit: 101 },
  ])('hatalı query: %o', (data) => {
    expect(
      validateSync(plainToInstance(QueryNotificationsDto, data)).length,
    ).toBeGreaterThan(0);
  });
  it('sayısal query metnini dönüştürür', () => {
    expect(
      validateSync(
        plainToInstance(QueryNotificationsDto, {
          workforceUserId: '3',
          limit: '10',
        }),
      ),
    ).toHaveLength(0);
  });
  it('ADMIN, PLANNER, VIEWER rollerine açıktır', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        Object.getOwnPropertyDescriptor(
          NotificationsController.prototype,
          'findAll',
        )!.value,
      ),
    ).toEqual([AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER]);
  });
  it('notification TCP istemcisine correlation id ve actor zarfı yollar', async () => {
    const send = vi
      .fn()
      .mockReturnValue(of({ data: [], total: 0, page: 1, limit: 10 }));
    const service = new NotificationsService({
      send,
    } as unknown as ClientProxy);
    await requestContext.run({ correlationId: 'api-test', actor: null }, () =>
      firstValueFrom(service.findAll({ workforceUserId: 3 })),
    );
    expect(send).toHaveBeenCalledWith('findNotifications', {
      correlationId: 'api-test',
      actor: null,
      data: { workforceUserId: 3 },
    });
  });
  it('cevap vermeyen serviste zaman aşımına düşer', async () => {
    vi.useFakeTimers();
    const service = new NotificationsService({
      send: () => NEVER,
    } as unknown as ClientProxy);
    const pending = expect(
      firstValueFrom(service.findAll({ workforceUserId: 3 })),
    ).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(3001);
    await pending;
  });
  it('zaman aşımını 503 ile döndürür', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    new GlobalExceptionFilter().catch(new TimeoutError(), {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost);
    expect(response.status).toHaveBeenCalledWith(503);
  });
});
