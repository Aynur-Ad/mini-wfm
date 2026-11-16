import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
export class QueryTimesheetDto {
  @ApiProperty({ example: '2026-11', description: '2026 veya 2027, YYYY-MM' })
  @Matches(/^202[67]-(0[1-9]|1[0-2])$/)
  month: string;
}