import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { CorrelationLogger } from './common/logging/correlation-logger.js';
import { AppModule } from './app.module.js';
import type { Environment } from './config/environment.js';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CorrelationLogger(),
  });
  app.enableShutdownHooks();
  const config = app.get(ConfigService<Environment, true>);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.get('RABBITMQ_URL', { infer: true })],
      queue: config.getOrThrow('RABBITMQ_QUEUE', { infer: true }),
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 10,
    },
  });
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: config.get('NOTIFICATION_HOST', { infer: true }),
      port: config.get('NOTIFICATION_PORT', { infer: true }),
    },
  });
  // HTTP portu açılmaz; yalnız RabbitMQ tüketicisi ve API için TCP bulunur.
  await app.startAllMicroservices();
  new Logger('Bootstrap').log(
    `Bildirim servisi RMQ dinliyor, TCP:${config.get('NOTIFICATION_PORT', { infer: true })}`,
  );
}
void bootstrap();
