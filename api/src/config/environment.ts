export interface Environment {
  JWT_SECRET: string;
  PORT: number;
  WORKFORCE_HOST: string;
  WORKFORCE_PORT: number;
}

type Setting = { type: 'string' | 'port'; default?: string | number };

// Her uygulama yalnızca kendi ihtiyaç duyduğu ayarları tanımlar.
const schema: Record<keyof Environment, Setting> = {
  JWT_SECRET: { type: 'string' },
  PORT: { type: 'port', default: 3000 },
  WORKFORCE_HOST: { type: 'string', default: '127.0.0.1' },
  WORKFORCE_PORT: { type: 'port', default: 4001 },
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

    if (rule.type === 'port') {
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

  if (
    typeof result.JWT_SECRET === 'string' &&
    Array.from(result.JWT_SECRET).length < 32
  ) {
    errors.push('JWT_SECRET: en az 32 karakter olmalıdır.');
  }

  if (errors.length > 0) {
    // Değerleri yazdırma: hata mesajında şifreler görünmemeli.
    throw new Error(`Ortam ayarları geçersiz:\n${errors.join('\n')}`);
  }

  return result as unknown as Environment;
}