import { Module } from '@nestjs/common';
import { TypeOrmModule} from '@nestjs/typeorm';
import { TeamsService } from './teams.service.js';
import { TeamsController } from './teams.controller.js';
import { Team } from './entities/team.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([Team])],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
