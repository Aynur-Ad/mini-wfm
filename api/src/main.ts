import { NestFactory } from '@nestjs/core'; // nestjs çekirdek kütüphanesinden nestfactory sınıfını içe aktarır. Bu sınıf yeni bir nestjs uygulama instance oluşturmak için kullanılan bir fabrika sınıfı(factory pattern).
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { AppModule } from './app.module.js'; // projenin ana modülünü içe aktarır.

async function bootstrap() {
  // uygulamanın başlatma mantığını barındıran asenkron bir fonksiyon tanımlar.
  const app = await NestFactory.create(AppModule); // ana modülü fonksiyona parametre vererek uygulamayı bellekte hazırlar.

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
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap(); // bootstrap fonksiyonunu çağırarak tüm bu süreci fiilen başlatır.
