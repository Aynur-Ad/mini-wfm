import type { RotationRequest } from './calc/rotation.js';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ShiftPlanningService } from './shift-planning.service.js';
@Controller()
export class ShiftPlanningController {
  constructor(private readonly planning: ShiftPlanningService) {}
  @MessagePattern('createTeamRotationPlan') rotation(
    @Payload() dto: RotationRequest & { teamId: number },
  ) {
    return this.planning.rotation(dto.teamId, dto);
  }
  @MessagePattern('findWorkforceUserTimesheet') timesheet(
    @Payload() dto: { id: number; month: string },
  ) {
    return this.planning.timesheet(dto.id, dto.month);
  }
}