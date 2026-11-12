import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WorkOrdersService } from './work-orders.service.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto.js';
@Controller()
export class WorkOrdersController {
  constructor(private readonly orders: WorkOrdersService) {}
  @MessagePattern('createWorkOrder') create(
    @Payload() dto: CreateWorkOrderDto,
  ) {
    return this.orders.create(dto);
  }
  @MessagePattern('findOneWorkOrder') findOne(@Payload() id: number) {
    return this.orders.findOne(id);
  }
  @MessagePattern('updateWorkOrder') update(
    @Payload() dto: UpdateWorkOrderDto,
  ) {
    return this.orders.update(dto.id, dto);
  }
}