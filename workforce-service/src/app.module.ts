import { ShiftsModule } from './shifts/shifts.module.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnvironment } from './config/environment.js';
import { createDatabaseOptions } from './config/database.config.js';
import { AppController } from './app.controller.js';
import { TeamsModule } from './teams/teams.module.js';
import { WorkforceUsersModule } from './workforce_users/workforce_users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
      skipProcessEnv: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createDatabaseOptions,
    }),
    ShiftsModule,
    AccountsModule,
    TeamsModule,
    WorkforceUsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}