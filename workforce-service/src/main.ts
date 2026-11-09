import { CorrelationLogger } from './common/logging/correlation-logger.js';
import { RpcLoggingInterceptor } from './common/interceptors/rpc-logging.interceptor.js';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module.js';
import type { Environment } from './config/environment.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // Önce Nest uygulaması hazırlanır; ConfigModule ayarları yükler ve doğrular.
  const app = await NestFactory.create(AppModule, {
    logger: new CorrelationLogger(),
  });
  const config = app.get(ConfigService<Environment, true>);
  const host = config.get('WORKFORCE_HOST', { infer: true });
  const port = config.get('WORKFORCE_PORT', { infer: true });

  // app.listen çağrılmaz: dışarıya yalnızca TCP portu açılır.
  app.useGlobalInterceptors(new RpcLoggingInterceptor());

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: { host, port },
    },
    { inheritAppConfig: true },
  );
  await app.startAllMicroservices();
  logger.log(`Workforce microservice is listening on TCP ${host}:${port}`);
}

void bootstrap();
