import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ShiftPlanningService } from './shift-planning.service.js';
@Controller()
export class ShiftPlanningController {
  constructor(private readonly planning: ShiftPlanningService) {}
  @MessagePattern('findWorkforceUserTimesheet') timesheet(
    @Payload() dto: { id: number; month: string },
  ) {
    return this.planning.timesheet(dto.id, dto.month);
  }
}