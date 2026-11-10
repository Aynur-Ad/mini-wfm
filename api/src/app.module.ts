import { AccountsController } from './accounts/accounts.controller.js';
import { AccountsService } from './accounts/accounts.service.js';
import { WorkforceClient } from './common/clients/workforce-client.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import type { Environment } from './config/environment.js';
import { Module } from '@nestjs/common'; // typescript/javascript sınıflarına modül davranışı ve metaverisi kazandırmak için kullanılan module'ü içe aktarır.
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TeamsService } from './teams/teams.service.js';
import { WorkforceUsersService } from './workforce_users/workforce_users.service.js';
import { AppController } from './app.controller.js'; // modülün kullanacağı istek karşılayıcıyı projeye dahil eder.
import { AppService } from './app.service.js'; // modülün kullanacağı iş mantığını barındıran servisi projeye dahil eder.
import { TeamsController } from './teams/teams.controller.js'; // modülün kullanacağı istek karşılayıcıyı projeye dahil eder.
import { WorkforceUsersController } from './workforce_users/workforce_users.controller.js'; // modülün kullanacağı istek karşılayıcıyı projeye dahil eder.

// sınıfın üzerine gelerek nestjse bu sınıfın hangi parçalardan oluştuğunu tarif eder.
@Module({
  // bu modülün ihtiyaç duyduğu diğer alt modülleri ekleyen dizi.
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
      skipProcessEnv: true,
    }),
    ClientsModule.registerAsync([
      {
        name: 'WORKFORCE_TCP',
        inject: [ConfigService],
        useFactory: (config: ConfigService<Environment, true>) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('WORKFORCE_HOST', { infer: true }),
            port: config.get('WORKFORCE_PORT', { infer: true }),
          },
        }),
      },
    ]),
  ],
  controllers: [
    AppController,
    TeamsController,
    WorkforceUsersController,
    AccountsController,
  ], // gelen http isteklerini karşılayıp yanıt dönecek denetleyicileri kaydeder.
  providers: [
    AccountsService,
    AppService,
    TeamsService,
    WorkforceUsersService,
    { provide: 'WORKFORCE_SERVICE', useClass: WorkforceClient },
  ], // nestjsin bağımlılık enjeksiyonu mekanizmasına kaydedilecek sağlayıcıları tanımlar. Mesela burada appservice kaydedildiği için, appcontroller sınıfı constructer üzerinden appservice'i doğrudan talep edip kullanabilir.
})
export class AppModule {} // modülün dışa aktarılmasını sağlar.