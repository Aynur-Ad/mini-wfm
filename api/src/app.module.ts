import { Module } from '@nestjs/common'; // typescript/javascript sınıflarına modül davranışı ve metaverisi kazadnrımak için kullanılan module'ü içe aktarır.
import { AppController } from './app.controller.js'; // modülün kullanacağı istek karşılayıcıyı projeye dahil eder.
import { AppService } from './app.service.js'; // modülün kullanacağı iş mantığını barındıran servisi projeye dahil eder.


@Module({ 
  imports: [], // 
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
