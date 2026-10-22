import { Injectable } from '@nestjs/common';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { QueryWorkforceUsersDto } from './dto/query-workforce_users.dto.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';

@Injectable()
export class WorkforceUsersService {
  create(createWorkforceUserDto: CreateWorkforceUserDto) {
    return 'This action adds a new workforceUser';
  }

  findAll(queryWorkforceUsersDto: QueryWorkforceUsersDto) {
    return `This action returns all workforceUsers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} workforceUser`;
  }

  update(id: number, updateWorkforceUserDto: UpdateWorkforceUserDto) {
    return `This action updates a #${id} workforceUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} workforceUser`;
  }
}
