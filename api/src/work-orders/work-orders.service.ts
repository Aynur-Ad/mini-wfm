import { Inject, Injectable } from '@nestjs/common';
import { WorkforceClient } from '../common/clients/workforce-client.js';
import type { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import type { UpdateWorkOrderDto } from './dto/update-work-order.dto.js';
import type { WorkOrderResponseDto } from './dto/work-order-response.dto.js';
@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly client: WorkforceClient,
  ) {}
  create(dto: CreateWorkOrderDto) {
    return this.client.send<WorkOrderResponseDto>('createWorkOrder', dto);
  }
  findOne(id: number) {
    return this.client.send<WorkOrderResponseDto>('findOneWorkOrder', id);
  }
  update(id: number, dto: UpdateWorkOrderDto) {
    return this.client.send<WorkOrderResponseDto>(
      'updateWorkOrder',
      Object.assign({}, dto, { id }),
    );
  }
}