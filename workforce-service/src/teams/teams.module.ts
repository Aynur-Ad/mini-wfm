import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsService } from './teams.service.js';
import { TeamsController } from './teams.controller.js';
import { Team } from './entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Team, WorkforceUser])],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}