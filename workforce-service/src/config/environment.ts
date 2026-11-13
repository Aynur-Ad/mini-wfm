import { DEFAULT_WORK_RULE_OPTIONS } from './work-rules.config.js';
import {
  isValidPassword,
  normalizeUsername,
} from '../accounts/password-policy.js';
export interface Environment {
  TIMEZONE_OFFSET_MINUTES: number;
  MIN_REST_HOURS: number;
  MAX_WEEKLY_HOURS: number;
  MAX_CONSECUTIVE_DAYS: number;
  INITIAL_ADMIN_USERNAME: string;
  INITIAL_ADMIN_PASSWORD: string;
  WORKFORCE_HOST: string;
  WORKFORCE_PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}

type Setting = {
  type: 'string' | 'port' | 'integer';
  default?: string | number;
  min?: number;
  max?: number;
};

// Her uygulama yalnızca kendi ihtiyaç duyduğu ayarları tanımlar.
const schema: Record<keyof Environment, Setting> = {
  TIMEZONE_OFFSET_MINUTES: {
    type: 'integer',
    default: DEFAULT_WORK_RULE_OPTIONS.timezoneOffsetMinutes,
    min: -840,
    max: 840,
  },
  MIN_REST_HOURS: {
    type: 'integer',
    default: DEFAULT_WORK_RULE_OPTIONS.minRestHours,
    min: 1,
    max: 24,
  },
  MAX_WEEKLY_HOURS: {
    type: 'integer',
    default: DEFAULT_WORK_RULE_OPTIONS.maxWeeklyHours,
    min: 1,
    max: 168,
  },
  MAX_CONSECUTIVE_DAYS: {
    type: 'integer',
    default: DEFAULT_WORK_RULE_OPTIONS.maxConsecutiveDays,
    min: 1,
    max: 6,
  },
  INITIAL_ADMIN_USERNAME: { type: 'string', default: 'admin' },
  INITIAL_ADMIN_PASSWORD: { type: 'string' },
  WORKFORCE_HOST: { type: 'string', default: '127.0.0.1' },
  WORKFORCE_PORT: { type: 'port', default: 4001 },
  DB_HOST: { type: 'string' },
  DB_PORT: { type: 'port', default: 5433 },
  DB_USER: { type: 'string' },
  DB_PASSWORD: { type: 'string' },
  DB_NAME: { type: 'string' },
};

// NestJS bu fonksiyonu .env ve ortam değerlerini birleştirdikten sonra çağırır.
export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const result: Record<string, string | number> = {};
  const errors: string[] = [];

  for (const key of Object.keys(schema) as (keyof Environment)[]) {
    const rule = schema[key];
    const value = input[key] ?? rule.default;

    if (typeof value !== 'string' && typeof value !== 'number') {
      errors.push(`${key}: zorunlu bir ayardır.`);
      continue;
    }
    if (String(value).trim() === '') {
      errors.push(`${key}: boş bırakılamaz.`);
      continue;
    }

    if (rule.type === 'integer') {
      const number = Number(value);
      if (
        !/^-?\d+$/.test(String(value)) ||
        !Number.isInteger(number) ||
        number < rule.min! ||
        number > rule.max!
      )
        errors.push(
          `${key}: ${rule.min} ile ${rule.max} arasında tam sayı olmalıdır.`,
        );
      else result[key] = number;
    } else if (rule.type === 'port') {
      const port = Number(value);
      if (
        !/^\d+$/.test(String(value)) ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535
      ) {
        errors.push(`${key}: 1 ile 65535 arasında tam sayı olmalıdır.`);
      } else {
        result[key] = port;
      }
    } else {
      // Şifre gibi metinlerin içeriğini değiştirmeden sakla.
      result[key] = String(value);
    }
  }

  if (typeof result.INITIAL_ADMIN_USERNAME === 'string') {
    result.INITIAL_ADMIN_USERNAME = normalizeUsername(
      result.INITIAL_ADMIN_USERNAME,
    );
    if (
      !result.INITIAL_ADMIN_USERNAME ||
      result.INITIAL_ADMIN_USERNAME.length > 50
    )
      errors.push(
        'INITIAL_ADMIN_USERNAME: 1 ile 50 karakter arasında olmalıdır.',
      );
  }
  if (
    result.INITIAL_ADMIN_PASSWORD !== undefined &&
    !isValidPassword(result.INITIAL_ADMIN_PASSWORD)
  ) {
    errors.push(
      'INITIAL_ADMIN_PASSWORD: en az 8 karakter ve en fazla 72 UTF-8 byte olmalıdır.',
    );
  }

  if (errors.length > 0) {
    // Değerleri yazdırma: hata mesajında şifreler görünmemeli.
    throw new Error(`Ortam ayarları geçersiz:\n${errors.join('\n')}`);
  }

  return result as unknown as Environment;
}