import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WorkforceUsersService } from './workforce_users.service.js';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';

@Controller()
export class WorkforceUsersController {
  constructor(private readonly workforceUsersService: WorkforceUsersService) {}

  @MessagePattern('createWorkforceUser')
  create(@Payload() createWorkforceUserDto: CreateWorkforceUserDto) {
    return this.workforceUsersService.create(createWorkforceUserDto);
  }

  @MessagePattern('findAllWorkforceUsers')
  findAll() {
    return this.workforceUsersService.findAll();
  }

  @MessagePattern('findOneWorkforceUser')
  findOne(@Payload() id: number) {
    return this.workforceUsersService.findOne(id);
  }

  @MessagePattern('updateWorkforceUser')
  update(@Payload() updateWorkforceUserDto: UpdateWorkforceUserDto) {
    return this.workforceUsersService.update(updateWorkforceUserDto.id, updateWorkforceUserDto);
  }

  @MessagePattern('removeWorkforceUser')
  remove(@Payload() id: number) {
    return this.workforceUsersService.remove(id);
  }
}
