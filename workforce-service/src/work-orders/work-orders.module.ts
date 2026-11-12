import { WorkOrderStatusHistory } from './entities/work-order-status-history.entity.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from './entities/work-order.entity.js';
import { WorkOrdersController } from './work-orders.controller.js';
import { WorkOrdersService } from './work-orders.service.js';
@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, WorkOrderStatusHistory])],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}