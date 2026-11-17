export interface Environment {
  RABBITMQ_URL: string;
  RABBITMQ_QUEUE: string;
  NOTIFICATION_HOST: string;
  NOTIFICATION_PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}
export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const defaults: Partial<Environment> = {
    RABBITMQ_QUEUE: 'work_order_events',
    NOTIFICATION_HOST: '127.0.0.1',
    NOTIFICATION_PORT: 4002,
    DB_PORT: 5433,
  };
  const result: Record<string, string | number> = {};
  const errors: string[] = [];
  for (const key of [
    'RABBITMQ_URL',
    'RABBITMQ_QUEUE',
    'NOTIFICATION_HOST',
    'NOTIFICATION_PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ] as const) {
    const value = input[key] ?? defaults[key];
    if (
      (typeof value !== 'string' && typeof value !== 'number') ||
      !String(value).trim()
    ) {
      errors.push(`${key}: zorunlu ve boş olmayan bir değer olmalı`);
      continue;
    }
    if (key === 'DB_PORT' || key === 'NOTIFICATION_PORT') {
      const number = Number(value);
      if (
        !/^\d+$/.test(String(value)) ||
        !Number.isInteger(number) ||
        number < 1 ||
        number > 65535
      )
        errors.push(`${key}: geçerli port (1-65535) olmalı`);
      else result[key] = number;
    } else result[key] = String(value);
  }
  if (typeof result.RABBITMQ_URL === 'string') {
    try {
      const url = new URL(result.RABBITMQ_URL);
      if (!['amqp:', 'amqps:'].includes(url.protocol) || !url.hostname)
        throw new Error();
    } catch {
      errors.push('RABBITMQ_URL: geçerli amqp/amqps adresi olmalı');
    }
  }
  if (
    typeof result.RABBITMQ_QUEUE === 'string' &&
    !/^[A-Za-z0-9._-]{1,100}$/.test(result.RABBITMQ_QUEUE)
  )
    errors.push('RABBITMQ_QUEUE: geçersiz kuyruk adı');
  if (errors.length)
    throw new Error(`Ortam ayarları geçersiz:\n${errors.join('\n')}`);
  return result as unknown as Environment;
}
