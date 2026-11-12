import { WorkOrdersController } from './work-orders/work-orders.controller.js';
import { WorkOrdersService } from './work-orders/work-orders.service.js';
import { ShiftsController } from './shifts/shifts.controller.js';
import { ShiftsService } from './shifts/shifts.service.js';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { JwtGuard } from './common/guards/jwt.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_ALGORITHM,
} from './auth/auth.constants.js';
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
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
          algorithm: JWT_ALGORITHM,
        },
        verifyOptions: { algorithms: [JWT_ALGORITHM] },
      }),
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
    WorkOrdersController,
    ShiftsController,
    AuthController,
    AppController,
    TeamsController,
    WorkforceUsersController,
    AccountsController,
  ], // gelen http isteklerini karşılayıp yanıt dönecek denetleyicileri kaydeder.
  providers: [
    WorkOrdersService,
    ShiftsService,
    AuthService,
    { provide: APP_GUARD, useClass: JwtGuard },
    // Kimlik doğrulanmadan rol kontrolü yapılmamalıdır; kayıt sırası önemlidir.
    { provide: APP_GUARD, useClass: RolesGuard },
    AccountsService,
    AppService,
    TeamsService,
    WorkforceUsersService,
    { provide: 'WORKFORCE_SERVICE', useClass: WorkforceClient },
  ], // nestjsin bağımlılık enjeksiyonu mekanizmasına kaydedilecek sağlayıcıları tanımlar. Mesela burada appservice kaydedildiği için, appcontroller sınıfı constructer üzerinden appservice'i doğrudan talep edip kullanabilir.
})
export class AppModule {} // modülün dışa aktarılmasını sağlar.