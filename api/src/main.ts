import { NestFactory } from '@nestjs/core'; // nestjs çekirdek kütüphanesinden nestfactory sınıfını içe aktarır. Bu sınıf yeni bir nestjs uygulama instance oluşturmak için kullanılan bir fabrika sınıfı(factory pattern).
import { AppModule } from './app.module.js'; // projenin ana modülünü içe aktarır.

async function bootstrap() { // uygulamanın başlatma mantığını barındıran asenkron bir fonksiyon tanımlar.
  const app = await NestFactory.create(AppModule); // ana modülü fonksiyona parametre vererek uygulamayı bellekte hazırlar.
  await app.listen(process.env.PORT ?? 3000); // uygulamadan gelen ağ isteklerini hangi port üzerinden dinleyeceğini belirler ve dinlemeyi başlatır.
}
await bootstrap(); // bootstrap fonksiyonunu çağırarak tüm bu süreci fiilen başlatır.
