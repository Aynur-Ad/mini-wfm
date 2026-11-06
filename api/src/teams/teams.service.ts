import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { QueryTeamsDto } from './dto/query-teams.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { WorkforceUserResponseDto } from '../workforce_users/dto/workforce_user-response.dto.js';

@Injectable()
export class TeamsService {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly workforceClient: ClientProxy,
  ) {}

  create(dto: CreateTeamDto): Observable<unknown> {
    return this.workforceClient.send('createTeam', dto);
  }

  findAll(query: QueryTeamsDto): Observable<unknown> {
    return this.workforceClient.send('findAllTeams', query);
  }

  findOne(id: number): Observable<unknown> {
    return this.workforceClient.send('findOneTeam', id);
  }

  update(id: number, dto: UpdateTeamDto): Observable<unknown> {
    return this.workforceClient.send(
      'updateTeam',
      Object.assign({}, dto, { id }),
    );
  }

  remove(id: number): Observable<unknown> {
    return this.workforceClient.send('removeTeam', id);
  }

  addMember(
    teamId: number,
    workforceUserId: number,
  ): Observable<WorkforceUserResponseDto> {
    return this.workforceClient.send('addTeamMember', {
      teamId,
      workforceUserId,
    });
  }

  removeMember(teamId: number, workforceUserId: number): Observable<unknown> {
    return this.workforceClient.send('removeTeamMember', {
      teamId,
      workforceUserId,
    });
  }
}