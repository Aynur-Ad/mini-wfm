import type { ConfigService } from '@nestjs/config';
import type { Environment } from './environment.js';
import type { WorkRulesOptions } from '../shifts/calc/work-rules.js';
export const WORK_RULE_OPTIONS = 'WORK_RULE_OPTIONS';
export const DEFAULT_WORK_RULE_OPTIONS: Readonly<WorkRulesOptions> =
  Object.freeze({
    timezoneOffsetMinutes: 180,
    minRestHours: 11,
    maxWeeklyHours: 60,
    maxConsecutiveDays: 6,
  });
export function workRulesOptions(
  config: ConfigService<Environment, true>,
): WorkRulesOptions {
  return {
    timezoneOffsetMinutes: config.getOrThrow('TIMEZONE_OFFSET_MINUTES', {
      infer: true,
    }),
    minRestHours: config.getOrThrow('MIN_REST_HOURS', { infer: true }),
    maxWeeklyHours: config.getOrThrow('MAX_WEEKLY_HOURS', { infer: true }),
    maxConsecutiveDays: config.getOrThrow('MAX_CONSECUTIVE_DAYS', {
      infer: true,
    }),
  };
}