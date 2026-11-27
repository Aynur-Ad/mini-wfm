export interface MailSettings {
  host: string;
  port: number;
  from: string;
  tlsMode: 'starttls' | 'tls' | 'plain';
  auth?: { user: string; pass: string };
}

export function isMailAddress(address: string): boolean {
  return /^[^\s@<>,;:"()\\]+@[^\s@<>,;:"()\\]+\.[^\s@<>,;:"()\\]+$/.test(
    address,
  );
}

function optionalText(value: unknown, key: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  throw new Error(`Geçersiz e-posta ayarları: ${key}`);
}

export function readMailSettings(
  env: Record<string, unknown>,
): MailSettings | null {
  const host = optionalText(env.SMTP_HOST, 'SMTP_HOST').trim();
  if (!host) return null;

  const from = optionalText(env.SMTP_FROM, 'SMTP_FROM').trim();
  const tlsMode = env.SMTP_TLS_MODE ?? 'starttls';
  const rawPort = env.SMTP_PORT ?? (tlsMode === 'tls' ? 465 : 587);
  const portValue =
    typeof rawPort === 'number'
      ? String(rawPort)
      : optionalText(rawPort, 'SMTP_PORT');
  const port = Number(portValue);
  const user = optionalText(env.SMTP_USER, 'SMTP_USER');
  const pass = optionalText(env.SMTP_PASSWORD, 'SMTP_PASSWORD');

  const errors = [];
  if (!isMailAddress(from)) errors.push('SMTP_FROM');
  if (
    !/^\d+$/.test(portValue) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    errors.push('SMTP_PORT');
  if (Boolean(user.trim()) !== Boolean(pass) || (user && !user.trim()))
    errors.push('SMTP_USER / SMTP_PASSWORD');
  if (tlsMode !== 'starttls' && tlsMode !== 'tls' && tlsMode !== 'plain') {
    errors.push('SMTP_TLS_MODE');
  } else {
    if (
      tlsMode === 'plain' &&
      (!['127.0.0.1', 'localhost', '::1'].includes(host) || user || pass)
    )
      errors.push(
        'SMTP_TLS_MODE: plain yalnızca kimlik doğrulamasız yerel test içindir',
      );
    if (errors.length === 0)
      return {
        host,
        port,
        from,
        tlsMode,
        ...(user && pass ? { auth: { user, pass } } : {}),
      };
  }

  throw new Error(`Geçersiz e-posta ayarları: ${errors.join(', ')}`);
}
