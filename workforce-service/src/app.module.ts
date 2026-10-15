import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from './data-source.js';
import { AppController } from './app.controller.js';
import { TeamsModule } from './teams/teams.module.js';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dbConfig),
    TeamsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
