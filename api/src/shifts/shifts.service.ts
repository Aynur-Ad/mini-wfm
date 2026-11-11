import type { QueryShiftsDto } from './dto/query-shifts.dto.js';
import type { ShiftListItemDto } from './dto/shift-list-item.dto.js';
import { Inject, Injectable } from '@nestjs/common';
import { WorkforceClient } from '../common/clients/workforce-client.js';
import type { CreateShiftDto } from './dto/create-shift.dto.js';
import type { UpdateShiftDto } from './dto/update-shift.dto.js';
import type { ShiftResponseDto } from './dto/shift-response.dto.js';

@Injectable()
export class ShiftsService {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly client: WorkforceClient,
  ) {}
  create(dto: CreateShiftDto) {
    return this.client.send<ShiftResponseDto>('createShift', dto);
  }
  findAll(query: QueryShiftsDto) {
    return this.client.send<ShiftListItemDto[]>('findAllShifts', query);
  }
  findOne(id: number) {
    return this.client.send<ShiftResponseDto>('findOneShift', id);
  }
  update(id: number, dto: UpdateShiftDto) {
    return this.client.send<ShiftResponseDto>(
      'updateShift',
      Object.assign({}, dto, { id }),
    );
  }
  remove(id: number) {
    return this.client.send<unknown>('removeShift', id);
  }
}