import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { QueryWorkforceUsersDto } from './dto/query-workforce_users.dto.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';
import {
  WorkforceUserResponseDto,
  WorkforceUsersPageDto,
} from './dto/workforce_user-response.dto.js';

@Injectable()
export class WorkforceUsersService {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly workforceClient: ClientProxy,
  ) {}

  create(dto: CreateWorkforceUserDto): Observable<WorkforceUserResponseDto> {
    return this.workforceClient.send('createWorkforceUser', dto);
  }

  findAll(query: QueryWorkforceUsersDto): Observable<WorkforceUsersPageDto> {
    return this.workforceClient.send('findAllWorkforceUsers', query);
  }

  findOne(id: number): Observable<WorkforceUserResponseDto> {
    return this.workforceClient.send('findOneWorkforceUser', id);
  }

  update(
    id: number,
    dto: UpdateWorkforceUserDto,
  ): Observable<WorkforceUserResponseDto> {
    // Adresteki kimlik esastır; yalnızca izinli profil alanları taşınır.
    return this.workforceClient.send('updateWorkforceUser', {
      firstName: dto.firstName,
      lastName: dto.lastName,
      registrationNumber: dto.registrationNumber,
      phone: dto.phone,
      isActive: dto.isActive,
      id,
    });
  }

  remove(id: number): Observable<unknown> {
    return this.workforceClient.send('removeWorkforceUser', id);
  }
}