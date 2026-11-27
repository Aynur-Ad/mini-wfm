import { config } from 'dotenv';
import { readMailSettings } from './mail-settings.js';
import { MailService } from './mail.service.js';

async function main() {
  const [recipient] = process.argv.slice(2);
  if (!recipient)
    throw new Error('Kullanım: pnpm mail:smoke alici@example.test');
  config({ quiet: true });
  await new MailService(readMailSettings(process.env)).send({
    to: recipient,
    subject: 'Mini WFM e-posta testi',
    text: 'Bu ileti Mini WFM SMTP gönderim kontrolü için oluşturuldu.',
  });
  process.stdout.write('SMTP sunucusu test e-postasını kabul etti.\n');
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'E-posta testi başarısız.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
