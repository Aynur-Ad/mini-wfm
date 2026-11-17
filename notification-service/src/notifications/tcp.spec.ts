import 'reflect-metadata';
import type { Server, AddressInfo } from 'node:net';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { requestContext } from '../common/logging/request-context.js';
@Module({
  controllers: [NotificationsController],
  providers: [
    {
      provide: NotificationsService,
      useValue: {
        findAll: (query: unknown) => ({
          query,
          correlationId: requestContext.getStore()?.correlationId,
        }),
      },
    },
  ],
})
class TestModule {}
describe('Gerçek TCP okuması', () => {
  it('HTTP açmadan TCP üzerinden sorgu ve correlation id taşır', async () => {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      TestModule,
      {
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 0 },
        logger: false,
      },
    );
    let client: ReturnType<typeof ClientProxyFactory.create> | undefined;
    try {
      await app.listen();
      const address = (app.unwrap() as Server).address() as AddressInfo;
      client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: address.port },
      });
      expect(
        await firstValueFrom(
          client
            .send('findNotifications', {
              correlationId: 'tcp-smoke',
              data: { workforceUserId: 3 },
            })
            .pipe(timeout(3000)),
        ),
      ).toEqual({ query: { workforceUserId: 3 }, correlationId: 'tcp-smoke' });
    } finally {
      await client?.close();
      await app.close();
    }
  });
});
