import { PickType } from '@nestjs/swagger';
import { QueryShiftsDto } from '../shifts/dto/query-shifts.dto.js';

export class QueryTeamSummaryDto extends PickType(QueryShiftsDto, [
  'from',
  'to',
] as const) {}
