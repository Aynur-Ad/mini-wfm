import { CorrelationLogger } from './common/logging/correlation-logger.js';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor.js';
import { ConfigService } from '@nestjs/config';
import type { Environment } from './config/environment.js';
import { NestFactory } from '@nestjs/core'; // nestjs çekirdek kütüphanesinden nestfactory sınıfını içe aktarır. Bu sınıf yeni bir nestjs uygulama instance oluşturmak için kullanılan bir fabrika sınıfı(factory pattern).
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { AppModule } from './app.module.js'; // projenin ana modülünü içe aktarır.

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // uygulamanın başlatma mantığını barındıran asenkron bir fonksiyon tanımlar.
  const app = await NestFactory.create(AppModule, {
    logger: new CorrelationLogger(),
  }); // ana modülü fonksiyona parametre vererek uygulamayı bellekte hazırlar.

  const requestLogging = new HttpLoggingInterceptor();
  app.use(requestLogging.middleware());
  app.useGlobalInterceptors(requestLogging);

  // Tüm endpointler /api önekiyle başlasın
  app.setGlobalPrefix('api');

  // Global doğrulama: whitelist(tanımsız alanları at) ve DTO(data transfer object)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger konfigürasyonu (/docs adresinde)
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('Mini WFM API Documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Global Exception Filter kaydı
  app.useGlobalFilters(new GlobalExceptionFilter());

  // uygulamadan gelen ağ isteklerini hangi port üzerinden dinleyeceğini belirler ve dinlemeyi başlatır.
  const settings = app.get(ConfigService<Environment, true>);
  const port = settings.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

void bootstrap(); // bootstrap fonksiyonunu çağırarak tüm bu süreci fiilen başlatır.