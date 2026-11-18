import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReportsService } from './reports.service.js';

@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @MessagePattern('findTeamSummary')
  teamSummary(@Payload() range: { from: string; to: string }) {
    return this.reports.teamSummary(range);
  }
}
