import { ConfigService } from '@nestjs/config';
import {
  WORK_RULE_OPTIONS,
  workRulesOptions,
} from '../config/work-rules.config.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity.js';
import { ShiftsController } from './shifts.controller.js';
import { ShiftsService } from './shifts.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Shift])],
  controllers: [ShiftsController],
  providers: [
    ShiftsService,
    {
      provide: WORK_RULE_OPTIONS,
      useFactory: workRulesOptions,
      inject: [ConfigService],
    },
  ],
})
export class ShiftsModule {}