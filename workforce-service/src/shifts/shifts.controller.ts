import { CreateTeamShiftsDto } from './dto/create-team-shifts.dto.js';
import { QueryShiftsDto } from './dto/query-shifts.dto.js';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ShiftsService } from './shifts.service.js';
import { CreateShiftDto } from './dto/create-shift.dto.js';
import { UpdateShiftDto } from './dto/update-shift.dto.js';

@Controller()
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @MessagePattern('createShift')
  create(@Payload() dto: CreateShiftDto) {
    return this.shifts.create(dto);
  }

  @MessagePattern('createTeamShifts')
  createForTeam(@Payload() dto: CreateTeamShiftsDto) {
    return this.shifts.createForTeam(dto.teamId, dto);
  }

  @MessagePattern('findAllShifts')
  findAll(@Payload() query: QueryShiftsDto) {
    return this.shifts.findAll(query);
  }

  @MessagePattern('findOneShift')
  findOne(@Payload() id: number) {
    return this.shifts.findOne(id);
  }

  @MessagePattern('updateShift')
  update(@Payload() dto: UpdateShiftDto) {
    return this.shifts.update(dto.id, dto);
  }

  @MessagePattern('removeShift')
  remove(@Payload() id: number) {
    return this.shifts.remove(id);
  }
}