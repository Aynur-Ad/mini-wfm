import { Module } from '@nestjs/common'; // typescript/javascript sınıflarına modül davranışı ve metaverisi kazandırmak için kullanılan module'ü içe aktarır.
import { AppController } from './app.controller.js'; // modülün kullanacağı istek karşılayıcıyı projeye dahil eder.
import { AppService } from './app.service.js'; // modülün kullanacağı iş mantığını barındıran servisi projeye dahil eder.

@Module({
  // sınıfın üzerine gelerek nestjse bu sınıfın hangi parçalardan oluştuğunu tarif eder.
  imports: [], // bu modülün ihtiyaç duyduğu diğer alt modülleri ekleyen dizi.
  controllers: [AppController], // gelen http isteklerini karşılayıp yanıt dönecek denetleyicileri kaydeder.
  providers: [AppService], // nestjsin bağımlılık enjeksiyonu mekanizmasına kaydedilecek sağlayıcıları tanımlar. Mesela burada appservice kaydedildiği için, appcontroller sınıfı constructer üzerinden appservice'i doğrudan talep edip kullanabilir.
})
export class AppModule {} // modülün dışa aktarılmasını sağlar.
