import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TeamsService } from './teams.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';

@Controller()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @MessagePattern('createTeam')
  create(@Payload() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @MessagePattern('findAllTeams')
  findAll() {
    return this.teamsService.findAll();
  }

  @MessagePattern('findOneTeam')
  findOne(@Payload() id: number) {
    return this.teamsService.findOne(id);
  }

  @MessagePattern('updateTeam')
  update(@Payload() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(updateTeamDto.id, updateTeamDto);
  }

  @MessagePattern('removeTeam')
  remove(@Payload() id: number) {
    return this.teamsService.remove(id);
  }
}
