import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from './data-source.js';
import { AppController } from './app.controller.js';
import { TeamsModule } from './teams/teams.module.js';
import { WorkforceUsersModule } from './workforce_users/workforce_users.module.js';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dbConfig),
    TeamsModule,
    WorkforceUsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
