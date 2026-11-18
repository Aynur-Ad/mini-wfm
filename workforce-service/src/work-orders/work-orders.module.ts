import { OverdueWorkOrdersService } from './overdue-work-orders.service.js';
import { TeamSuggestionsController } from './team-suggestions.controller.js';
import { TeamSuggestionsService } from './team-suggestions.service.js';
import { WorkOrderStatusHistory } from './entities/work-order-status-history.entity.js';
import { Module } from '@nestjs/common';
import { WorkOrderEventsPublisher } from './events/work-order-events.publisher.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from './entities/work-order.entity.js';
import { WorkOrdersController } from './work-orders.controller.js';
import { WorkOrdersService } from './work-orders.service.js';
@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, WorkOrderStatusHistory])],
  controllers: [WorkOrdersController, TeamSuggestionsController],
  providers: [
    OverdueWorkOrdersService,
    WorkOrdersService,
    TeamSuggestionsService,
    WorkOrderEventsPublisher,
  ],
})
export class WorkOrdersModule {}
