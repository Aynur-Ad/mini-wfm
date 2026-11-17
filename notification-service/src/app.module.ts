import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseOptions } from './config/database.config.js';
import { validateEnvironment } from './config/environment.js';
import { NotificationsModule } from './notifications/notifications.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnvironment, skipProcessEnv: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: createDatabaseOptions }),
    NotificationsModule,
  ],
})
export class AppModule {}
